import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Box, Button, Card, CardContent, Stack, Typography, } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
function formatNumber(n, digits = 1) {
    if (n == null)
        return "—";
    return n.toFixed(digits);
}
export function DashboardPage({ api }) {
    const [summary, setSummary] = useState(null);
    const [rows, setRows] = useState([]);
    async function load() {
        const [s, p] = await Promise.all([
            api.get("/dashboard/summary"),
            api.get("/productivity/daily"),
        ]);
        setSummary(s.data.summary);
        setRows(p.data.rows);
    }
    useEffect(() => {
        void load();
    }, []);
    const columns = useMemo(() => [
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
    ], []);
    const chartData = useMemo(() => rows
        .slice()
        .sort((a, b) => b.actualHoursLogged - a.actualHoursLogged)
        .slice(0, 12)
        .map((r) => ({ name: r.employeeName, actual: r.actualHoursLogged })), [rows]);
    function exportExcel() {
        const sheet = XLSX.utils.json_to_sheet(rows.map((r) => ({
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
        })));
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
    return (_jsxs(Stack, { spacing: 2, children: [_jsxs("div", { className: "grid grid-cols-12 gap-4", children: [_jsx("div", { className: "col-span-12 md:col-span-3", children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "overline", children: "Employees Active Today" }), _jsx(Typography, { variant: "h5", fontWeight: 800, children: summary?.totalEmployeesActiveToday ?? "—" })] }) }) }), _jsx("div", { className: "col-span-12 md:col-span-3", children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "overline", children: "Tasks Closed Today" }), _jsx(Typography, { variant: "h5", fontWeight: 800, children: summary?.totalTasksClosedToday ?? "—" })] }) }) }), _jsx("div", { className: "col-span-12 md:col-span-3", children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "overline", children: "Total Estimated Hours" }), _jsx(Typography, { variant: "h5", fontWeight: 800, children: formatNumber(summary?.totalEstimatedHours) })] }) }) }), _jsx("div", { className: "col-span-12 md:col-span-3", children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "overline", children: "Total Actual Hours Logged" }), _jsx(Typography, { variant: "h5", fontWeight: 800, children: formatNumber(summary?.totalActualHoursLogged) })] }) }) }), _jsx("div", { className: "col-span-12 md:col-span-3", children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "overline", children: "Productivity %" }), _jsx(Typography, { variant: "h5", fontWeight: 800, children: summary?.productivityPercent == null ? "—" : `${formatNumber(summary.productivityPercent, 0)}%` })] }) }) }), _jsx("div", { className: "col-span-12 md:col-span-3", children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "overline", children: "Employees Below 8 Hours" }), _jsx(Typography, { variant: "h5", fontWeight: 800, color: "error", children: summary?.employeesBelow8Hours ?? "—" })] }) }) }), _jsx("div", { className: "col-span-12 md:col-span-3", children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "overline", children: "Employees Above 8 Hours" }), _jsx(Typography, { variant: "h5", fontWeight: 800, color: "warning.main", children: summary?.employeesAbove8Hours ?? "—" })] }) }) }), _jsx("div", { className: "col-span-12 md:col-span-3", children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "overline", children: "Average Efficiency" }), _jsx(Typography, { variant: "h5", fontWeight: 800, children: summary?.averageEfficiencyPercent == null
                                            ? "—"
                                            : `${formatNumber(summary.averageEfficiencyPercent, 0)}%` })] }) }) })] }), _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "Top Daily Actual Hours" }), _jsx(Box, { sx: { height: 280 }, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: chartData, children: [_jsx(XAxis, { dataKey: "name", hide: true }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "actual", fill: "#2563eb", radius: [6, 6, 0, 0] })] }) }) })] }) }), _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Stack, { direction: "row", alignItems: "center", justifyContent: "space-between", children: [_jsx(Typography, { variant: "h6", fontWeight: 800, children: "Employee Productivity" }), _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(DownloadIcon, {}), onClick: exportExcel, children: "Export Excel" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(PictureAsPdfIcon, {}), onClick: exportPdf, children: "Export PDF" })] })] }), _jsx(Box, { sx: { height: 560, mt: 2 }, children: _jsx(DataGrid, { rows: rows, getRowId: (r) => r.employeeId, columns: columns, disableRowSelectionOnClick: true, slots: { toolbar: GridToolbar }, slotProps: { toolbar: { showQuickFilter: true } }, initialState: {
                                    pagination: { paginationModel: { pageSize: 25, page: 0 } },
                                }, pageSizeOptions: [25, 50, 100], getRowClassName: (params) => {
                                    const actual = params.row.actualHoursLogged;
                                    if (actual < 8)
                                        return "bg-red-50 dark:bg-red-950";
                                    if (actual === 8)
                                        return "bg-green-50 dark:bg-green-950";
                                    return "bg-orange-50 dark:bg-orange-950";
                                }, sx: {
                                    "& .MuiDataGrid-row:hover": { cursor: "pointer" },
                                } }) })] }) })] }));
}
