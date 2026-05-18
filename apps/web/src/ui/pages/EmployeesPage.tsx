import React, { useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import {
  Box,
  Card,
  CardContent,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";
import type { EmployeeDailyProductivity } from "../../lib/types";
import { DataGrid, GridToolbar, type GridColDef } from "@mui/x-data-grid";

export function EmployeesPage({ api }: { api: AxiosInstance }) {
  const [rows, setRows] = useState<EmployeeDailyProductivity[]>([]);
  const [selected, setSelected] = useState<EmployeeDailyProductivity | null>(null);

  async function load() {
    const res = await api.get<{ rows: EmployeeDailyProductivity[] }>("/productivity/daily");
    setRows(res.data.rows);
  }

  useEffect(() => {
    void load();
  }, []);

  const columns = useMemo<GridColDef<EmployeeDailyProductivity>[]>(
    () => [
      { field: "employeeName", headerName: "Employee Name", flex: 1, minWidth: 200 },
      { field: "employeeEmail", headerName: "Email", flex: 1, minWidth: 220 },
      { field: "actualHoursLogged", headerName: "Actual Hours", width: 140, type: "number" },
      { field: "estimatedHours", headerName: "Estimated Hours", width: 160, type: "number" },
      { field: "efficiencyPercent", headerName: "Efficiency %", width: 140, type: "number" },
      { field: "utilizationStatus", headerName: "Status", width: 160 },
    ],
    [],
  );

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Employees
          </Typography>
          <Box sx={{ height: 640 }}>
            <DataGrid
              rows={rows}
              getRowId={(r) => r.employeeId}
              columns={columns}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true } }}
              onRowClick={(params) => setSelected(params.row)}
              disableRowSelectionOnClick
            />
          </Box>
        </CardContent>
      </Card>

      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)}>
        <Box sx={{ width: 420, p: 3 }}>
          <Typography variant="h6" fontWeight={800}>
            {selected?.employeeName ?? "Employee"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selected?.employeeEmail ?? "—"}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Today
            </Typography>
            <Typography variant="body2">Tasks created: {selected?.tasksCreatedToday ?? 0}</Typography>
            <Typography variant="body2">Tasks updated: {selected?.tasksUpdatedToday ?? 0}</Typography>
            <Typography variant="body2">Tasks closed: {selected?.tasksClosedToday ?? 0}</Typography>
            <Typography variant="body2">Estimated hours: {selected?.estimatedHours.toFixed(1) ?? "0.0"}</Typography>
            <Typography variant="body2">Actual hours logged: {selected?.actualHoursLogged.toFixed(1) ?? "0.0"}</Typography>
            <Typography variant="body2">Remaining work: {selected?.remainingHours.toFixed(1) ?? "0.0"}</Typography>
          </Box>
        </Box>
      </Drawer>
    </Stack>
  );
}
