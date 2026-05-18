import React, { useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import {
  AppBar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { io, type Socket } from "socket.io-client";
import { env } from "../lib/env";
import type { DashboardSummary } from "../lib/types";
import { useAppTheme } from "../theme/AppThemeProvider";
import type { NavKey } from "./App";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SettingsPage } from "./pages/SettingsPage";

const drawerWidth = 260;

export function Shell({
  api,
  nav,
  setNav,
  onLogout,
}: {
  api: AxiosInstance;
  nav: NavKey;
  setNav: (k: NavKey) => void;
  onLogout: () => Promise<void>;
}) {
  const theme = useAppTheme();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [syncStatus, setSyncStatus] = useState<"IDLE" | "RUNNING" | "SUCCESS" | "FAILED">("IDLE");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const socket = useMemo<Socket>(() => io(env.VITE_API_URL, { transports: ["websocket"] }), []);

  async function refresh() {
    setSyncStatus("RUNNING");
    const res = await api.get<{ summary: DashboardSummary }>("/dashboard/summary");
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
      if (payload?.status === "RUNNING") setSyncStatus("RUNNING");
    });
    socket.on("sync:completed", (payload) => {
      if (payload?.status === "SUCCESS") setSyncStatus("SUCCESS");
      if (payload?.status === "FAILED") setSyncStatus("FAILED");
      void refresh();
    });
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const title =
    nav === "dashboard"
      ? "Dashboard"
      : nav === "employees"
        ? "Employees"
        : nav === "projects"
          ? "Projects"
          : "Settings";

  return (
    <Box className="h-full w-full">
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>
            {summary?.organizationName ?? "Azure DevOps"} · {title}
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
            Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "—"}
          </Typography>
          <IconButton color="inherit" onClick={theme.toggleMode} sx={{ mr: 1 }}>
            {theme.mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <IconButton color="inherit" onClick={() => void refresh()} sx={{ mr: 1 }}>
            <Badge color={syncStatus === "RUNNING" ? "warning" : "default"} variant="dot">
              <RefreshIcon />
            </Badge>
          </IconButton>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={() => void onLogout()}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            <ListItemButton selected={nav === "dashboard"} onClick={() => setNav("dashboard")}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
            <ListItemButton selected={nav === "employees"} onClick={() => setNav("employees")}>
              <ListItemIcon>
                <PeopleIcon />
              </ListItemIcon>
              <ListItemText primary="Employees" />
            </ListItemButton>
            <ListItemButton selected={nav === "projects"} onClick={() => setNav("projects")}>
              <ListItemIcon>
                <FolderIcon />
              </ListItemIcon>
              <ListItemText primary="Projects" />
            </ListItemButton>
          </List>
          <Divider />
          <List>
            <ListItemButton selected={nav === "settings"} onClick={() => setNav("settings")}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ ml: `${drawerWidth}px`, p: 3 }}>
        <Toolbar />
        {nav === "dashboard" && <DashboardPage api={api} />}
        {nav === "employees" && <EmployeesPage api={api} />}
        {nav === "projects" && <ProjectsPage api={api} />}
        {nav === "settings" && <SettingsPage api={api} onSynced={refresh} />}
      </Box>
    </Box>
  );
}
