import pLimit from "p-limit";
import { prisma } from "../lib/prisma";
import { decryptString, encryptString } from "../lib/crypto";
import { AzureDevOpsClient } from "./azureDevopsClient";

const CLOSED_STATES = new Set(["Closed", "Done", "Resolved", "Completed", "Removed"]);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseAdoIdentity(
  field: unknown,
): { displayName: string; uniqueName?: string; descriptor?: string; mailAddress?: string } | null {
  if (!field || typeof field !== "object") return null;
  const anyField = field as Record<string, unknown>;
  const displayName = typeof anyField.displayName === "string" ? anyField.displayName : null;
  if (!displayName) return null;
  const uniqueName = typeof anyField.uniqueName === "string" ? anyField.uniqueName : undefined;
  const descriptor = typeof anyField.descriptor === "string" ? anyField.descriptor : undefined;
  const mailAddress = typeof anyField.mailAddress === "string" ? anyField.mailAddress : undefined;
  return { displayName, uniqueName, descriptor, mailAddress };
}

function num(field: unknown): number | null {
  if (field === null || field === undefined) return null;
  if (typeof field === "number" && Number.isFinite(field)) return field;
  return null;
}

export class ProductivityService {
  async getActiveConnection() {
    const conn = await prisma.organizationConnection.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return conn;
  }

  async upsertConnection(input: {
    organizationName: string;
    organizationUrl: string;
    pat?: string;
    createdByUserId: string;
  }) {
    const encryptedPat = input.pat ? encryptString(input.pat) : null;
    return prisma.organizationConnection.upsert({
      where: {
        organizationName_organizationUrl: {
          organizationName: input.organizationName,
          organizationUrl: input.organizationUrl,
        },
      },
      update: {
        encryptedPat: encryptedPat ?? undefined,
        authType: input.pat ? "PAT" : "DELEGATED_AAD",
        isActive: true,
      },
      create: {
        organizationName: input.organizationName,
        organizationUrl: input.organizationUrl,
        authType: input.pat ? "PAT" : "DELEGATED_AAD",
        encryptedPat: encryptedPat ?? undefined,
        createdByUserId: input.createdByUserId,
      },
    });
  }

  async syncNow(input: { initiatedByUserId: string; bearerToken?: string }) {
    const connection = await this.getActiveConnection();
    if (!connection) {
      throw new Error("no_active_connection");
    }

    const auth =
      connection.authType === "PAT"
        ? {
            type: "PAT" as const,
            pat: connection.encryptedPat ? decryptString(connection.encryptedPat) : "",
          }
        : input.bearerToken
          ? { type: "BEARER" as const, token: input.bearerToken }
          : null;

    if (!auth || (auth.type === "PAT" && !auth.pat)) {
      throw new Error("missing_auth");
    }

    const startedAt = new Date();
    const syncLog = await prisma.syncLog.create({
      data: {
        connectionId: connection.id,
        startedAt,
        status: "RUNNING",
        message: `initiatedBy=${input.initiatedByUserId}`,
      },
    });

    const today = startOfDay(new Date());
    const ado = new AzureDevOpsClient({ organizationName: connection.organizationName, auth });

    try {
      const projects = await ado.listProjects();
      await prisma.$transaction(
        projects.map((p) =>
          prisma.project.upsert({
            where: { adoProjectId: p.id },
            update: {
              name: p.name,
              state: p.state,
              visibility: p.visibility,
              connectionId: connection.id,
              lastSyncedAt: new Date(),
            },
            create: {
              adoProjectId: p.id,
              name: p.name,
              state: p.state,
              visibility: p.visibility,
              connectionId: connection.id,
              lastSyncedAt: new Date(),
            },
          }),
        ),
      );

      const dbProjects = await prisma.project.findMany({ where: { connectionId: connection.id } });
      const limit = pLimit(4);

      let workItemsSynced = 0;
      let employeesSynced = 0;

      await Promise.all(
        dbProjects.map((project) =>
          limit(async () => {
            const teams = await ado.listTeams(project.name);
            for (const team of teams) {
              const members = await ado.listTeamMembers(project.adoProjectId, team.id);
              for (const m of members) {
                const uniqueName = m.uniqueName ?? m.mailAddress ?? null;
                const mail = m.mailAddress ?? (m.uniqueName?.includes("@") ? m.uniqueName : null);
                if (uniqueName) {
                  await prisma.employee.upsert({
                    where: { uniqueName },
                    update: {
                      displayName: m.displayName,
                      mail: mail ?? undefined,
                      adoDescriptor: m.descriptor ?? undefined,
                    },
                    create: {
                      displayName: m.displayName,
                      uniqueName,
                      mail: mail ?? undefined,
                      adoDescriptor: m.descriptor ?? undefined,
                    },
                  });
                } else if (mail) {
                  await prisma.employee.upsert({
                    where: { mail },
                    update: {
                      displayName: m.displayName,
                      adoDescriptor: m.descriptor ?? undefined,
                    },
                    create: {
                      displayName: m.displayName,
                      mail,
                      adoDescriptor: m.descriptor ?? undefined,
                    },
                  });
                } else if (m.descriptor) {
                  await prisma.employee.upsert({
                    where: { adoDescriptor: m.descriptor },
                    update: { displayName: m.displayName },
                    create: { displayName: m.displayName, adoDescriptor: m.descriptor },
                  });
                } else {
                  await prisma.employee.create({
                    data: { displayName: m.displayName },
                  });
                }
                employeesSynced += 1;
              }
            }

            const wiqlCreated = `Select [System.Id] From WorkItems Where [System.TeamProject] = @project And [System.WorkItemType] = 'Task' And [System.CreatedDate] >= @Today`;
            const wiqlChanged = `Select [System.Id] From WorkItems Where [System.TeamProject] = @project And [System.WorkItemType] = 'Task' And [System.ChangedDate] >= @Today`;

            const createdRefs = await ado.wiqlQuery(project.name, wiqlCreated);
            const changedRefs = await ado.wiqlQuery(project.name, wiqlChanged);
            const ids = Array.from(
              new Set<number>([...createdRefs.map((r) => r.id), ...changedRefs.map((r) => r.id)]),
            );

            const fields = [
              "System.Id",
              "System.Title",
              "System.AssignedTo",
              "System.State",
              "System.CreatedDate",
              "System.ChangedDate",
              "System.IterationPath",
              "System.AreaPath",
              "System.WorkItemType",
              "Microsoft.VSTS.Scheduling.OriginalEstimate",
              "Microsoft.VSTS.Scheduling.CompletedWork",
              "Microsoft.VSTS.Scheduling.RemainingWork",
            ];

            const batches: number[][] = [];
            for (let i = 0; i < ids.length; i += 200) batches.push(ids.slice(i, i + 200));

            for (const batch of batches) {
              const items = await ado.getWorkItemsBatch(project.name, batch, fields);
              for (const item of items) {
                const f = item.fields ?? {};
                const assigned = parseAdoIdentity(f["System.AssignedTo"]);
                const state = typeof f["System.State"] === "string" ? f["System.State"] : "Unknown";
                const title = typeof f["System.Title"] === "string" ? f["System.Title"] : `#${item.id}`;
                const workItemType =
                  typeof f["System.WorkItemType"] === "string" ? f["System.WorkItemType"] : "Task";
                const createdDate = new Date(String(f["System.CreatedDate"]));
                const changedDate = new Date(String(f["System.ChangedDate"]));
                const originalEstimate = num(f["Microsoft.VSTS.Scheduling.OriginalEstimate"]);
                const completedWork = num(f["Microsoft.VSTS.Scheduling.CompletedWork"]);
                const remainingWork = num(f["Microsoft.VSTS.Scheduling.RemainingWork"]);
                const areaPath = typeof f["System.AreaPath"] === "string" ? f["System.AreaPath"] : null;
                const iterationPath =
                  typeof f["System.IterationPath"] === "string" ? f["System.IterationPath"] : null;

                const assignedToId = assigned
                  ? (
                      await (async () => {
                        const existingEmployee = assigned.uniqueName
                          ? await prisma.employee.findUnique({
                              where: { uniqueName: assigned.uniqueName },
                              select: { id: true },
                            })
                          : assigned.mailAddress
                            ? await prisma.employee.findUnique({
                                where: { mail: assigned.mailAddress },
                                select: { id: true },
                              })
                            : assigned.descriptor
                              ? await prisma.employee.findUnique({
                                  where: { adoDescriptor: assigned.descriptor },
                                  select: { id: true },
                                })
                              : null;

                        if (existingEmployee) {
                          return prisma.employee.update({
                            where: { id: existingEmployee.id },
                            data: {
                              displayName: assigned.displayName,
                              uniqueName: assigned.uniqueName ?? undefined,
                              adoDescriptor: assigned.descriptor ?? undefined,
                              mail: assigned.mailAddress ?? undefined,
                            },
                            select: { id: true },
                          });
                        }

                        return prisma.employee.create({
                          data: {
                            displayName: assigned.displayName,
                            uniqueName: assigned.uniqueName ?? undefined,
                            adoDescriptor: assigned.descriptor ?? undefined,
                            mail: assigned.mailAddress ?? undefined,
                          },
                          select: { id: true },
                        });
                      })()
                    ).id
                  : null;

                if (assignedToId) employeesSynced += 1;

                const existing = await prisma.workItem.findUnique({
                  where: { adoWorkItemId_projectId: { adoWorkItemId: item.id, projectId: project.id } },
                  select: { id: true, state: true, baselineDate: true, baselineCompletedWork: true },
                });

                const shouldResetBaseline = !existing?.baselineDate || existing.baselineDate < today;
                const baselineCompletedWork = shouldResetBaseline ? (completedWork ?? 0) : existing.baselineCompletedWork;
                const baselineDate = shouldResetBaseline ? today : existing.baselineDate;

                await prisma.workItem.upsert({
                  where: { adoWorkItemId_projectId: { adoWorkItemId: item.id, projectId: project.id } },
                  update: {
                    title,
                    state,
                    workItemType,
                    areaPath: areaPath ?? undefined,
                    iterationPath: iterationPath ?? undefined,
                    createdDate,
                    changedDate,
                    originalEstimate: originalEstimate ?? undefined,
                    completedWork: completedWork ?? undefined,
                    remainingWork: remainingWork ?? undefined,
                    assignedToId: assignedToId ?? undefined,
                    lastSeenAt: new Date(),
                    baselineDate: baselineDate ?? undefined,
                    baselineCompletedWork: baselineCompletedWork ?? undefined,
                  },
                  create: {
                    adoWorkItemId: item.id,
                    title,
                    state,
                    workItemType,
                    areaPath: areaPath ?? undefined,
                    iterationPath: iterationPath ?? undefined,
                    createdDate,
                    changedDate,
                    originalEstimate: originalEstimate ?? undefined,
                    completedWork: completedWork ?? undefined,
                    remainingWork: remainingWork ?? undefined,
                    assignedToId: assignedToId ?? undefined,
                    projectId: project.id,
                    baselineDate: baselineDate ?? undefined,
                    baselineCompletedWork: baselineCompletedWork ?? undefined,
                  },
                });

                workItemsSynced += 1;
              }
            }
          }),
        ),
      );

      await this.recomputeSnapshots(today);

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          finishedAt: new Date(),
          status: "SUCCESS",
          projectsSynced: dbProjects.length,
          employeesSynced,
          workItemsSynced,
        },
      });

      return { syncLogId: syncLog.id, startedAt, finishedAt: new Date() };
    } catch (e) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          finishedAt: new Date(),
          status: "FAILED",
          message: e instanceof Error ? e.message : "unknown_error",
        },
      });
      throw e;
    }
  }

  async recomputeSnapshots(day: Date) {
    const today = startOfDay(day);
    const workItems = await prisma.workItem.findMany({
      where: {
        assignedToId: { not: null },
        OR: [{ createdDate: { gte: today } }, { changedDate: { gte: today } }],
      },
      select: {
        id: true,
        assignedToId: true,
        projectId: true,
        state: true,
        createdDate: true,
        changedDate: true,
        originalEstimate: true,
        completedWork: true,
        remainingWork: true,
        baselineCompletedWork: true,
      },
    });

    const byEmployee = new Map<
      string,
      {
        projectIds: Set<string>;
        created: number;
        updated: number;
        closed: number;
        estimated: number;
        actual: number;
        remaining: number;
      }
    >();

    for (const wi of workItems) {
      const employeeId = wi.assignedToId!;
      const agg =
        byEmployee.get(employeeId) ??
        {
          projectIds: new Set<string>(),
          created: 0,
          updated: 0,
          closed: 0,
          estimated: 0,
          actual: 0,
          remaining: 0,
        };

      agg.projectIds.add(wi.projectId);

      if (wi.createdDate >= today) agg.created += 1;
      if (wi.changedDate >= today) agg.updated += 1;

      if (wi.changedDate >= today && CLOSED_STATES.has(wi.state)) {
        agg.closed += 1;
      }

      agg.estimated += wi.originalEstimate ?? 0;
      agg.remaining += wi.remainingWork ?? 0;

      const baseline = wi.baselineCompletedWork ?? 0;
      const current = wi.completedWork ?? 0;
      agg.actual += Math.max(0, current - baseline);

      byEmployee.set(employeeId, agg);
    }

    const snapshots = await Promise.all(
      Array.from(byEmployee.entries()).map(async ([employeeId, agg]) => {
        const actual = agg.actual;
        const estimated = agg.estimated;
        const efficiencyPercent = actual > 0 ? (estimated / actual) * 100 : null;
        const varianceHours = actual - estimated;

        return prisma.productivitySnapshot.upsert({
          where: { employeeId_date: { employeeId, date: today } },
          update: {
            tasksCreatedToday: agg.created,
            tasksUpdatedToday: agg.updated,
            tasksClosedToday: agg.closed,
            estimatedHours: estimated,
            actualHoursLogged: actual,
            remainingHours: agg.remaining,
            efficiencyPercent: efficiencyPercent ?? undefined,
            varianceHours,
            projectCount: agg.projectIds.size,
          },
          create: {
            employeeId,
            date: today,
            tasksCreatedToday: agg.created,
            tasksUpdatedToday: agg.updated,
            tasksClosedToday: agg.closed,
            estimatedHours: estimated,
            actualHoursLogged: actual,
            remainingHours: agg.remaining,
            efficiencyPercent: efficiencyPercent ?? undefined,
            varianceHours,
            projectCount: agg.projectIds.size,
          },
        });
      }),
    );

    return snapshots;
  }

  private async computeDailyFromWorkItems(day: Date, projectIds?: string[]) {
    const today = startOfDay(day);
    const workItems = await prisma.workItem.findMany({
      where: {
        assignedToId: { not: null },
        OR: [{ createdDate: { gte: today } }, { changedDate: { gte: today } }],
        ...(projectIds && projectIds.length > 0 ? { projectId: { in: projectIds } } : {}),
      },
      include: { assignedTo: true },
    });

    const byEmployee = new Map<
      string,
      {
        employeeName: string;
        employeeEmail: string | null;
        projectIds: Set<string>;
        created: number;
        updated: number;
        closed: number;
        estimated: number;
        actual: number;
        remaining: number;
      }
    >();

    for (const wi of workItems) {
      if (!wi.assignedTo) continue;
      const employeeId = wi.assignedToId!;
      const agg =
        byEmployee.get(employeeId) ??
        {
          employeeName: wi.assignedTo.displayName,
          employeeEmail: wi.assignedTo.mail ?? wi.assignedTo.uniqueName ?? null,
          projectIds: new Set<string>(),
          created: 0,
          updated: 0,
          closed: 0,
          estimated: 0,
          actual: 0,
          remaining: 0,
        };

      agg.projectIds.add(wi.projectId);
      if (wi.createdDate >= today) agg.created += 1;
      if (wi.changedDate >= today) agg.updated += 1;
      if (wi.changedDate >= today && CLOSED_STATES.has(wi.state)) agg.closed += 1;

      agg.estimated += wi.originalEstimate ?? 0;
      agg.remaining += wi.remainingWork ?? 0;
      const baseline = wi.baselineCompletedWork ?? 0;
      const current = wi.completedWork ?? 0;
      agg.actual += Math.max(0, current - baseline);

      byEmployee.set(employeeId, agg);
    }

    const rows = Array.from(byEmployee.entries()).map(([employeeId, agg]) => {
      const actual = agg.actual;
      const estimated = agg.estimated;
      const efficiencyPercent = actual > 0 ? (estimated / actual) * 100 : null;
      const varianceHours = actual - estimated;
      const utilizationStatus =
        actual < 8 ? "UNDERUTILIZED" : actual === 8 ? "OPTIMAL" : "OVERUTILIZED";
      const indicator = actual < 8 ? "RED" : actual === 8 ? "GREEN" : "ORANGE";

      return {
        employeeId,
        employeeName: agg.employeeName,
        employeeEmail: agg.employeeEmail,
        projectCount: agg.projectIds.size,
        tasksCreatedToday: agg.created,
        tasksUpdatedToday: agg.updated,
        tasksClosedToday: agg.closed,
        estimatedHours: estimated,
        actualHoursLogged: actual,
        remainingHours: agg.remaining,
        efficiencyPercent,
        varianceHours,
        utilizationStatus,
        indicator,
      };
    });

    rows.sort((a, b) => a.actualHoursLogged - b.actualHoursLogged || a.employeeName.localeCompare(b.employeeName));
    return rows;
  }

  async getDailyProductivity(day: Date, opts?: { projectIds?: string[] }) {
    const today = startOfDay(day);
    if (opts?.projectIds && opts.projectIds.length > 0) {
      return this.computeDailyFromWorkItems(today, opts.projectIds);
    }

    const snapshots = await prisma.productivitySnapshot.findMany({
      where: { date: today },
      include: { employee: true },
      orderBy: [{ actualHoursLogged: "asc" }, { employee: { displayName: "asc" } }],
    });

    return snapshots.map((s) => {
      const actual = s.actualHoursLogged;
      const utilizationStatus =
        actual < 8 ? "UNDERUTILIZED" : actual === 8 ? "OPTIMAL" : "OVERUTILIZED";
      const indicator = actual < 8 ? "RED" : actual === 8 ? "GREEN" : "ORANGE";
      const efficiencyPercent = s.efficiencyPercent ?? null;

      return {
        employeeId: s.employeeId,
        employeeName: s.employee.displayName,
        employeeEmail: s.employee.mail ?? s.employee.uniqueName ?? null,
        projectCount: s.projectCount,
        tasksCreatedToday: s.tasksCreatedToday,
        tasksUpdatedToday: s.tasksUpdatedToday,
        tasksClosedToday: s.tasksClosedToday,
        estimatedHours: s.estimatedHours,
        actualHoursLogged: s.actualHoursLogged,
        remainingHours: s.remainingHours,
        efficiencyPercent,
        varianceHours: s.varianceHours,
        utilizationStatus,
        indicator,
      };
    });
  }

  async getDashboardSummary(day: Date, opts?: { projectIds?: string[] }) {
    const today = startOfDay(day);
    const connection = await this.getActiveConnection();
    const lastSync = connection
      ? await prisma.syncLog.findFirst({
          where: { connectionId: connection.id, status: "SUCCESS" },
          orderBy: { finishedAt: "desc" },
        })
      : null;

    const rows = opts?.projectIds && opts.projectIds.length > 0
      ? await this.computeDailyFromWorkItems(today, opts.projectIds)
      : await prisma.productivitySnapshot.findMany({
          where: { date: today },
          select: {
            actualHoursLogged: true,
            estimatedHours: true,
            efficiencyPercent: true,
            tasksClosedToday: true,
          },
        });

    const totalEmployeesActiveToday = rows.length;
    const totalTasksClosedToday = rows.reduce((a, r) => a + r.tasksClosedToday, 0);
    const totalEstimatedHours = rows.reduce((a, r) => a + r.estimatedHours, 0);
    const totalActualHoursLogged = rows.reduce((a, r) => a + r.actualHoursLogged, 0);
    const productivityPercent =
      totalActualHoursLogged > 0 ? (totalEstimatedHours / totalActualHoursLogged) * 100 : null;

    const below = rows.filter((r) => r.actualHoursLogged < 8).length;
    const at = rows.filter((r) => r.actualHoursLogged === 8).length;
    const above = rows.filter((r) => r.actualHoursLogged > 8).length;

    const efficiencyVals = rows.map((r) => r.efficiencyPercent).filter((v): v is number => v != null);
    const averageEfficiencyPercent =
      efficiencyVals.length > 0 ? efficiencyVals.reduce((a, v) => a + v, 0) / efficiencyVals.length : null;

    return {
      organizationName: connection?.organizationName ?? "Azure DevOps",
      lastSyncAt: lastSync?.finishedAt?.toISOString() ?? null,
      totalEmployeesActiveToday,
      totalTasksClosedToday,
      totalEstimatedHours,
      totalActualHoursLogged,
      productivityPercent,
      employeesBelow8Hours: below,
      employeesAt8Hours: at,
      employeesAbove8Hours: above,
      averageEfficiencyPercent,
    };
  }
}
