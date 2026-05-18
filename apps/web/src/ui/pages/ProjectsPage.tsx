import React, { useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import { Box, Card, CardContent, Drawer, Stack, Typography } from "@mui/material";
import { DataGrid, GridToolbar, type GridColDef } from "@mui/x-data-grid";

type ProjectRow = {
  id: string;
  name: string;
  state: string | null;
  visibility: string | null;
  lastSyncedAt: string | null;
};

type ProjectWorkItem = {
  adoWorkItemId: number;
  title: string;
  state: string;
  workItemType: string;
  createdDate: string;
  changedDate: string;
  originalEstimate: number | null;
  completedWork: number | null;
  remainingWork: number | null;
  assignedTo: { id: string; displayName: string; uniqueName: string | null; mail: string | null } | null;
};

export function ProjectsPage({ api }: { api: AxiosInstance }) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selected, setSelected] = useState<ProjectRow | null>(null);
  const [items, setItems] = useState<ProjectWorkItem[]>([]);

  async function load() {
    const res = await api.get<{ projects: ProjectRow[] }>("/projects");
    setProjects(res.data.projects);
  }

  async function loadProject(projectId: string) {
    const res = await api.get<{ items: ProjectWorkItem[] }>(`/productivity/project/${projectId}`);
    setItems(res.data.items);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selected) void loadProject(selected.id);
  }, [selected?.id]);

  const columns = useMemo<GridColDef<ProjectRow>[]>(
    () => [
      { field: "name", headerName: "Project", flex: 1, minWidth: 220 },
      { field: "state", headerName: "State", width: 120 },
      { field: "visibility", headerName: "Visibility", width: 140 },
      {
        field: "lastSyncedAt",
        headerName: "Last Synced",
        width: 200,
        valueFormatter: (v) => (v ? new Date(String(v)).toLocaleString() : "—"),
      },
    ],
    [],
  );

  const itemColumns = useMemo<GridColDef<ProjectWorkItem>[]>(
    () => [
      { field: "adoWorkItemId", headerName: "ID", width: 90, type: "number" },
      { field: "title", headerName: "Title", flex: 1, minWidth: 260 },
      { field: "state", headerName: "State", width: 120 },
      { field: "workItemType", headerName: "Type", width: 120 },
      {
        field: "assignedTo",
        headerName: "Assigned To",
        width: 200,
        valueGetter: (_v, r) => r.assignedTo?.displayName ?? "—",
      },
      {
        field: "changedDate",
        headerName: "Changed",
        width: 200,
        valueFormatter: (v) => new Date(String(v)).toLocaleString(),
      },
    ],
    [],
  );

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Projects
          </Typography>
          <Box sx={{ height: 640 }}>
            <DataGrid
              rows={projects}
              getRowId={(r) => r.id}
              columns={columns}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true } }}
              onRowClick={(p) => setSelected(p.row)}
              disableRowSelectionOnClick
            />
          </Box>
        </CardContent>
      </Card>

      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)}>
        <Box sx={{ width: 860, p: 3 }}>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            {selected?.name ?? "Project"}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Work items touched today
          </Typography>
          <Box sx={{ height: 640, mt: 2 }}>
            <DataGrid
              rows={items}
              getRowId={(r) => `${r.adoWorkItemId}`}
              columns={itemColumns}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true } }}
              disableRowSelectionOnClick
            />
          </Box>
        </Box>
      </Drawer>
    </Stack>
  );
}

