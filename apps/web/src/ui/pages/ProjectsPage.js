import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Drawer, Stack, Typography } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
export function ProjectsPage({ api }) {
    const [projects, setProjects] = useState([]);
    const [selected, setSelected] = useState(null);
    const [items, setItems] = useState([]);
    async function load() {
        const res = await api.get("/projects");
        setProjects(res.data.projects);
    }
    async function loadProject(projectId) {
        const res = await api.get(`/productivity/project/${projectId}`);
        setItems(res.data.items);
    }
    useEffect(() => {
        void load();
    }, []);
    useEffect(() => {
        if (selected)
            void loadProject(selected.id);
    }, [selected?.id]);
    const columns = useMemo(() => [
        { field: "name", headerName: "Project", flex: 1, minWidth: 220 },
        { field: "state", headerName: "State", width: 120 },
        { field: "visibility", headerName: "Visibility", width: 140 },
        {
            field: "lastSyncedAt",
            headerName: "Last Synced",
            width: 200,
            valueFormatter: (v) => (v ? new Date(String(v)).toLocaleString() : "—"),
        },
    ], []);
    const itemColumns = useMemo(() => [
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
    ], []);
    return (_jsxs(Stack, { spacing: 2, children: [_jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "Projects" }), _jsx(Box, { sx: { height: 640 }, children: _jsx(DataGrid, { rows: projects, getRowId: (r) => r.id, columns: columns, slots: { toolbar: GridToolbar }, slotProps: { toolbar: { showQuickFilter: true } }, onRowClick: (p) => setSelected(p.row), disableRowSelectionOnClick: true }) })] }) }), _jsx(Drawer, { anchor: "right", open: !!selected, onClose: () => setSelected(null), children: _jsxs(Box, { sx: { width: 860, p: 3 }, children: [_jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: selected?.name ?? "Project" }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Work items touched today" }), _jsx(Box, { sx: { height: 640, mt: 2 }, children: _jsx(DataGrid, { rows: items, getRowId: (r) => `${r.adoWorkItemId}`, columns: itemColumns, slots: { toolbar: GridToolbar }, slotProps: { toolbar: { showQuickFilter: true } }, disableRowSelectionOnClick: true }) })] }) })] }));
}
