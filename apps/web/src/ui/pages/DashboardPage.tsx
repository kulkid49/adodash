import React, { useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import type { DashboardSummary, EmployeeDailyProductivity } from "../../lib/types";
import { DataGrid, GridToolbar, type GridColDef } from "@mui/x-data-grid";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

function formatNumber(n: number | null | undefined, digits = 1) {
  if (n == null) return "—";
  return n.toFixed(digits);
}

export function DashboardPage({ api }: { api: AxiosInstance }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [rows, setRows] = useState<EmployeeDailyProductivity[]>([]);

  async function load() {
    const [s, p] = await Promise.all([
      api.get<{ summary: DashboardSummary }>("/dashboard/summary"),
      api.get<{ rows: EmployeeDailyProductivity[] }>("/productivity/daily"),
    ]);
    setSummary(s.data.summary);
    setRows(p.data.rows);
  }

  useEffect(() => {
    void load();
  }, []);

  const columns = useMemo<GridColDef<EmployeeDailyProductivity>[]>(
    () => [
      { field: "employeeName", headerName: "Employee Name", flex: 1, minWidth: 180 },
      { field: "projectCount", headerName: "Project Count", width: 130, type: "number" },
      { field: "tasksCreatedToday", headerName: "Created", width: 110, type: "number" },
      { field: "tasksUpdatedToday", headerName: "Updated", width: 110, type: "number" },
      { field: "tasksClosedToday", headerName: "Closed", width: 110, type: "number" },
      {
        field: "estimatedHours",
        headerName: "Estimated Hours",
        width: 150,
        type: "number",
        valueFormatter: (v) => formatNumber(Number(v)),
      },
      {
        field: "actualHoursLogged",
        headerName: "Actual Hours Logged",
        width: 170,
        type: "number",
        valueFormatter: (v) => formatNumber(Number(v)),
      },
      {
        field: "remainingHours",
        headerName: "Remaining Hours",
        width: 160,
        type: "number",
        valueFormatter: (v) => formatNumber(Number(v)),
      },
      {
        field: "efficiencyPercent",
        headerName: "Efficiency %",
        width: 130,
        type: "number",
        valueGetter: (_v, r) => r.efficiencyPercent ?? null,
        valueFormatter: (v) => (v == null ? "—" : `${formatNumber(Number(v), 0)}%`),
      },
      {
        field: "utilizationStatus",
        headerName: "Utilization Status",
        width: 160,
      },
    ],
    [],
  );

  const chartData = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => b.actualHoursLogged - a.actualHoursLogged)
        .slice(0, 12)
        .map((r) => ({ name: r.employeeName, actual: r.actualHoursLogged })),
    [rows],
  );

  function exportExcel() {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        "Employee Name": r.employeeName,
        "Project Count": r.projectCount,
        "Tasks Created Today": r.tasksCreatedToday,
        "Tasks Updated Today": r.tasksUpdatedToday,
        "Tasks Closed Today": r.tasksClosedToday,
        "Estimated Hours": r.estimatedHours,
        "Actual Hours Logged": r.actualHoursLogged,
        "Remaining Hours": r.remainingHours,
        "Efficiency %": r.efficiencyPercent ?? "",
        "Utilization Status": r.utilizationStatus,
      })),
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Daily Productivity");
    XLSX.writeFile(wb, `adodash-daily-productivity.xlsx`);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Azure DevOps Productivity Dashboard", 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [
        [
          "Employee",
          "Projects",
          "Created",
          "Updated",
          "Closed",
          "Estimated",
          "Actual",
          "Remaining",
          "Efficiency %",
          "Status",
        ],
      ],
      body: rows.map((r) => [
        r.employeeName,
        r.projectCount,
        r.tasksCreatedToday,
        r.tasksUpdatedToday,
        r.tasksClosedToday,
        r.estimatedHours.toFixed(1),
        r.actualHoursLogged.toFixed(1),
        r.remainingHours.toFixed(1),
        r.efficiencyPercent == null ? "—" : `${Math.round(r.efficiencyPercent)}%`,
        r.utilizationStatus,
      ]),
    });
    doc.save("adodash-daily-productivity.pdf");
  }

  return (
    <Stack spacing={2}>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardContent>
              <Typography variant="overline">Employees Active Today</Typography>
              <Typography variant="h5" fontWeight={800}>
                {summary?.totalEmployeesActiveToday ?? "—"}
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardContent>
              <Typography variant="overline">Tasks Closed Today</Typography>
              <Typography variant="h5" fontWeight={800}>
                {summary?.totalTasksClosedToday ?? "—"}
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardContent>
              <Typography variant="overline">Total Estimated Hours</Typography>
              <Typography variant="h5" fontWeight={800}>
                {formatNumber(summary?.totalEstimatedHours)}
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardContent>
              <Typography variant="overline">Total Actual Hours Logged</Typography>
              <Typography variant="h5" fontWeight={800}>
                {formatNumber(summary?.totalActualHoursLogged)}
              </Typography>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardContent>
              <Typography variant="overline">Productivity %</Typography>
              <Typography variant="h5" fontWeight={800}>
                {summary?.productivityPercent == null ? "—" : `${formatNumber(summary.productivityPercent, 0)}%`}
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardContent>
              <Typography variant="overline">Employees Below 8 Hours</Typography>
              <Typography variant="h5" fontWeight={800} color="error">
                {summary?.employeesBelow8Hours ?? "—"}
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardContent>
              <Typography variant="overline">Employees Above 8 Hours</Typography>
              <Typography variant="h5" fontWeight={800} color="warning.main">
                {summary?.employeesAbove8Hours ?? "—"}
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardContent>
              <Typography variant="overline">Average Efficiency</Typography>
              <Typography variant="h5" fontWeight={800}>
                {summary?.averageEfficiencyPercent == null
                  ? "—"
                  : `${formatNumber(summary.averageEfficiencyPercent, 0)}%`}
              </Typography>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Top Daily Actual Hours
          </Typography>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="actual" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={800}>
              Employee Productivity
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportExcel}>
                Export Excel
              </Button>
              <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={exportPdf}>
                Export PDF
              </Button>
            </Stack>
          </Stack>
          <Box sx={{ height: 560, mt: 2 }}>
            <DataGrid
              rows={rows}
              getRowId={(r) => r.employeeId}
              columns={columns}
              disableRowSelectionOnClick
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true } }}
              initialState={{
                pagination: { paginationModel: { pageSize: 25, page: 0 } },
              }}
              pageSizeOptions={[25, 50, 100]}
              getRowClassName={(params) => {
                const actual = params.row.actualHoursLogged;
                if (actual < 8) return "bg-red-50 dark:bg-red-950";
                if (actual === 8) return "bg-green-50 dark:bg-green-950";
                return "bg-orange-50 dark:bg-orange-950";
              }}
              sx={{
                "& .MuiDataGrid-row:hover": { cursor: "pointer" },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
