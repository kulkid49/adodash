import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { AppBar, Badge, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { io } from "socket.io-client";
import { env } from "../lib/env";
import { useAppTheme } from "../theme/AppThemeProvider";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SettingsPage } from "./pages/SettingsPage";
const drawerWidth = 260;
export function Shell({ api, nav, setNav, onLogout, }) {
    const theme = useAppTheme();
    const [summary, setSummary] = useState(null);
    const [syncStatus, setSyncStatus] = useState("IDLE");
    const [lastSyncAt, setLastSyncAt] = useState(null);
    const socket = useMemo(() => io(env.VITE_API_URL, { transports: ["websocket"] }), []);
    async function refresh() {
        setSyncStatus("RUNNING");
        const res = await api.get("/dashboard/summary");
        setSummary(res.data.summary);
        setLastSyncAt(res.data.summary.lastSyncAt);
        setSyncStatus("IDLE");
    }
    useEffect(() => {
        void refresh();
    }, []);
    useEffect(() => {
        const id = window.setInterval(() => {
            void refresh();
        }, 5 * 60 * 1000);
        return () => window.clearInterval(id);
    }, []);
    useEffect(() => {
        socket.on("sync:status", (payload) => {
            if (payload?.status === "RUNNING")
                setSyncStatus("RUNNING");
        });
        socket.on("sync:completed", (payload) => {
            if (payload?.status === "SUCCESS")
                setSyncStatus("SUCCESS");
            if (payload?.status === "FAILED")
                setSyncStatus("FAILED");
            void refresh();
        });
        return () => {
            socket.disconnect();
        };
    }, [socket]);
    const title = nav === "dashboard"
        ? "Dashboard"
        : nav === "employees"
            ? "Employees"
            : nav === "projects"
                ? "Projects"
                : "Settings";
    return (_jsxs(Box, { className: "h-full w-full", children: [_jsx(AppBar, { position: "fixed", sx: { zIndex: (t) => t.zIndex.drawer + 1 }, children: _jsxs(Toolbar, { children: [_jsxs(Typography, { variant: "h6", fontWeight: 800, sx: { flexGrow: 1 }, children: [summary?.organizationName ?? "Azure DevOps", " \u00B7 ", title] }), _jsxs(Typography, { variant: "body2", sx: { mr: 2, opacity: 0.9 }, children: ["Last sync: ", lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "—"] }), _jsx(IconButton, { color: "inherit", onClick: theme.toggleMode, sx: { mr: 1 }, children: theme.mode === "dark" ? _jsx(LightModeIcon, {}) : _jsx(DarkModeIcon, {}) }), _jsx(IconButton, { color: "inherit", onClick: () => void refresh(), sx: { mr: 1 }, children: _jsx(Badge, { color: syncStatus === "RUNNING" ? "warning" : "default", variant: "dot", children: _jsx(RefreshIcon, {}) }) }), _jsx(Button, { color: "inherit", startIcon: _jsx(LogoutIcon, {}), onClick: () => void onLogout(), children: "Logout" })] }) }), _jsxs(Drawer, { variant: "permanent", sx: {
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
                }, children: [_jsx(Toolbar, {}), _jsxs(Box, { sx: { overflow: "auto" }, children: [_jsxs(List, { children: [_jsxs(ListItemButton, { selected: nav === "dashboard", onClick: () => setNav("dashboard"), children: [_jsx(ListItemIcon, { children: _jsx(DashboardIcon, {}) }), _jsx(ListItemText, { primary: "Dashboard" })] }), _jsxs(ListItemButton, { selected: nav === "employees", onClick: () => setNav("employees"), children: [_jsx(ListItemIcon, { children: _jsx(PeopleIcon, {}) }), _jsx(ListItemText, { primary: "Employees" })] }), _jsxs(ListItemButton, { selected: nav === "projects", onClick: () => setNav("projects"), children: [_jsx(ListItemIcon, { children: _jsx(FolderIcon, {}) }), _jsx(ListItemText, { primary: "Projects" })] })] }), _jsx(Divider, {}), _jsx(List, { children: _jsxs(ListItemButton, { selected: nav === "settings", onClick: () => setNav("settings"), children: [_jsx(ListItemIcon, { children: _jsx(SettingsIcon, {}) }), _jsx(ListItemText, { primary: "Settings" })] }) })] })] }), _jsxs(Box, { component: "main", sx: { ml: `${drawerWidth}px`, p: 3 }, children: [_jsx(Toolbar, {}), nav === "dashboard" && _jsx(DashboardPage, { api: api }), nav === "employees" && _jsx(EmployeesPage, { api: api }), nav === "projects" && _jsx(ProjectsPage, { api: api }), nav === "settings" && _jsx(SettingsPage, { api: api, onSynced: refresh })] })] }));
}
