import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Drawer, Stack, Typography, } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
export function EmployeesPage({ api }) {
    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState(null);
    async function load() {
        const res = await api.get("/productivity/daily");
        setRows(res.data.rows);
    }
    useEffect(() => {
        void load();
    }, []);
    const columns = useMemo(() => [
        { field: "employeeName", headerName: "Employee Name", flex: 1, minWidth: 200 },
        { field: "employeeEmail", headerName: "Email", flex: 1, minWidth: 220 },
        { field: "actualHoursLogged", headerName: "Actual Hours", width: 140, type: "number" },
        { field: "estimatedHours", headerName: "Estimated Hours", width: 160, type: "number" },
        { field: "efficiencyPercent", headerName: "Efficiency %", width: 140, type: "number" },
        { field: "utilizationStatus", headerName: "Status", width: 160 },
    ], []);
    return (_jsxs(Stack, { spacing: 2, children: [_jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "Employees" }), _jsx(Box, { sx: { height: 640 }, children: _jsx(DataGrid, { rows: rows, getRowId: (r) => r.employeeId, columns: columns, slots: { toolbar: GridToolbar }, slotProps: { toolbar: { showQuickFilter: true } }, onRowClick: (params) => setSelected(params.row), disableRowSelectionOnClick: true }) })] }) }), _jsx(Drawer, { anchor: "right", open: !!selected, onClose: () => setSelected(null), children: _jsxs(Box, { sx: { width: 420, p: 3 }, children: [_jsx(Typography, { variant: "h6", fontWeight: 800, children: selected?.employeeName ?? "Employee" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: selected?.employeeEmail ?? "—" }), _jsxs(Box, { sx: { mt: 3 }, children: [_jsx(Typography, { variant: "subtitle2", fontWeight: 700, gutterBottom: true, children: "Today" }), _jsxs(Typography, { variant: "body2", children: ["Tasks created: ", selected?.tasksCreatedToday ?? 0] }), _jsxs(Typography, { variant: "body2", children: ["Tasks updated: ", selected?.tasksUpdatedToday ?? 0] }), _jsxs(Typography, { variant: "body2", children: ["Tasks closed: ", selected?.tasksClosedToday ?? 0] }), _jsxs(Typography, { variant: "body2", children: ["Estimated hours: ", selected?.estimatedHours.toFixed(1) ?? "0.0"] }), _jsxs(Typography, { variant: "body2", children: ["Actual hours logged: ", selected?.actualHoursLogged.toFixed(1) ?? "0.0"] }), _jsxs(Typography, { variant: "body2", children: ["Remaining work: ", selected?.remainingHours.toFixed(1) ?? "0.0"] })] })] }) })] }));
}
