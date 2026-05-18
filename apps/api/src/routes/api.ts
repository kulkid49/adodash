import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { ProductivityService } from "../services/productivityService";

const service = new ProductivityService();

function parseDateParam(value: unknown) {
  if (typeof value !== "string" || !value) return new Date();
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

apiRouter.use(authenticate);

apiRouter.get("/me", async (req, res) => {
  res.json({ user: req.user });
});

apiRouter.get("/admin/users", requireRole(["ADMIN"]), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
  });
  res.json({ users });
});

apiRouter.post("/admin/users/:id/role", requireRole(["ADMIN"]), async (req, res) => {
  const BodySchema = z.object({
    role: z.enum(["ADMIN", "PROJECT_MANAGER", "TEAM_LEAD", "EMPLOYEE"]),
  });
  const body = BodySchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: String(req.params.id) },
    data: { role: body.role },
    select: { id: true, email: true, name: true, role: true },
  });
  res.json({ user });
});

apiRouter.post("/admin/users/:id/projects", requireRole(["ADMIN"]), async (req, res) => {
  const BodySchema = z.object({
    projectIds: z.array(z.string().min(1)).default([]),
  });
  const body = BodySchema.parse(req.body);
  const userId = String(req.params.id);

  await prisma.userProjectAccess.deleteMany({ where: { userId } });
  if (body.projectIds.length > 0) {
    await prisma.userProjectAccess.createMany({
      data: body.projectIds.map((projectId) => ({ userId, projectId })),
      skipDuplicates: true,
    });
  }

  const access = await prisma.userProjectAccess.findMany({
    where: { userId },
    select: { projectId: true },
  });
  res.json({ userId, projectIds: access.map((a) => a.projectId) });
});

apiRouter.get("/projects", async (req, res) => {
  const role = req.user!.role;
  const projects =
    role === "PROJECT_MANAGER"
      ? await prisma.project.findMany({
          where: { userAccess: { some: { userId: req.user!.id } } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, state: true, visibility: true, lastSyncedAt: true },
        })
      : await prisma.project.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, state: true, visibility: true, lastSyncedAt: true },
        });

  res.json({ projects });
});

apiRouter.get("/employees", async (req, res) => {
  const role = req.user!.role;
  if (role === "EMPLOYEE") {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ mail: req.user!.email }, { uniqueName: req.user!.email }],
      },
      select: { id: true, displayName: true, uniqueName: true, mail: true },
    });
    res.json({ employees: employee ? [employee] : [] });
    return;
  }

  const employees = await prisma.employee.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true, uniqueName: true, mail: true },
  });
  res.json({ employees });
});

apiRouter.get("/productivity/daily", async (req, res) => {
  const day = parseDateParam(req.query.date);
  const role = req.user!.role;
  const projectIds =
    role === "PROJECT_MANAGER"
      ? (
          await prisma.userProjectAccess.findMany({
            where: { userId: req.user!.id },
            select: { projectId: true },
          })
        ).map((x) => x.projectId)
      : undefined;

  const rows = await service.getDailyProductivity(day, { projectIds });
  if (role === "EMPLOYEE") {
    const filtered = rows.filter((r) => (r.employeeEmail ?? "").toLowerCase() === req.user!.email.toLowerCase());
    res.json({ date: day.toISOString().slice(0, 10), rows: filtered });
    return;
  }

  res.json({ date: day.toISOString().slice(0, 10), rows });
});

apiRouter.get("/productivity/employee/:id", async (req, res) => {
  const day = parseDateParam(req.query.date);
  const employeeId = req.params.id;

  const role = req.user!.role;
  if (role === "EMPLOYEE") {
    const self = await prisma.employee.findFirst({
      where: { OR: [{ mail: req.user!.email }, { uniqueName: req.user!.email }] },
      select: { id: true },
    });
    if (!self || self.id !== employeeId) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
  }

  const snapshot = await prisma.productivitySnapshot.findUnique({
    where: { employeeId_date: { employeeId, date: new Date(`${day.toISOString().slice(0, 10)}T00:00:00`) } },
    include: { employee: true },
  });
  res.json({ date: day.toISOString().slice(0, 10), snapshot });
});

apiRouter.get("/productivity/project/:id", async (req, res) => {
  const day = parseDateParam(req.query.date);
  const start = new Date(`${day.toISOString().slice(0, 10)}T00:00:00`);
  const projectId = req.params.id;

  const role = req.user!.role;
  if (role === "PROJECT_MANAGER") {
    const allowed = await prisma.userProjectAccess.findFirst({
      where: { userId: req.user!.id, projectId },
      select: { id: true },
    });
    if (!allowed) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
  }

  const items = await prisma.workItem.findMany({
    where: {
      projectId,
      OR: [{ createdDate: { gte: start } }, { changedDate: { gte: start } }],
    },
    select: {
      adoWorkItemId: true,
      title: true,
      state: true,
      workItemType: true,
      changedDate: true,
      createdDate: true,
      originalEstimate: true,
      completedWork: true,
      remainingWork: true,
      assignedTo: { select: { id: true, displayName: true, uniqueName: true, mail: true } },
    },
    orderBy: { changedDate: "desc" },
    take: 1000,
  });

  res.json({ date: day.toISOString().slice(0, 10), items });
});

apiRouter.get("/tasks/today", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items = await prisma.workItem.findMany({
    where: {
      OR: [{ createdDate: { gte: today } }, { changedDate: { gte: today } }],
    },
    select: {
      adoWorkItemId: true,
      title: true,
      state: true,
      workItemType: true,
      project: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, displayName: true } },
      createdDate: true,
      changedDate: true,
      originalEstimate: true,
      completedWork: true,
      remainingWork: true,
    },
    orderBy: { changedDate: "desc" },
    take: 2000,
  });

  res.json({ date: today.toISOString().slice(0, 10), items });
});

apiRouter.get("/dashboard/summary", async (req, res) => {
  const day = parseDateParam(req.query.date);
  const role = req.user!.role;
  const projectIds =
    role === "PROJECT_MANAGER"
      ? (
          await prisma.userProjectAccess.findMany({
            where: { userId: req.user!.id },
            select: { projectId: true },
          })
        ).map((x) => x.projectId)
      : undefined;

  const summary = await service.getDashboardSummary(day, { projectIds });
  if (role === "EMPLOYEE") {
    summary.totalEmployeesActiveToday = 1;
  }

  res.json({ date: day.toISOString().slice(0, 10), summary });
});

apiRouter.post("/sync/azure-devops", requireRole(["ADMIN"]), async (req, res) => {
  const BodySchema = z.object({
    organizationName: z.string().min(1),
    organizationUrl: z.string().url(),
    pat: z.string().min(10).optional(),
  });

  const body = BodySchema.parse(req.body);
  await service.upsertConnection({
    organizationName: body.organizationName,
    organizationUrl: body.organizationUrl,
    pat: body.pat,
    createdByUserId: req.user!.id,
  });

  const authHeader = req.header("authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice("bearer ".length) : undefined;
  const result = await service.syncNow({ initiatedByUserId: req.user!.id, bearerToken });

  res.json({ ok: true, result });
});
