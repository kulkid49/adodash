import React, { useMemo, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../auth/AuthProvider";
import { createApiClient } from "../lib/api";
import { LoginScreen } from "./LoginScreen";
import { Shell } from "./Shell";

export type NavKey = "dashboard" | "employees" | "projects" | "settings";

export function App() {
  const auth = useAuth();
  const [nav, setNav] = useState<NavKey>("dashboard");

  const api = useMemo(() => createApiClient(() => auth.idToken), [auth.idToken]);

  if (!auth.account) {
    return <LoginScreen onLogin={auth.login} />;
  }

  if (!auth.idToken) {
    return (
      <Box className="h-full w-full flex items-center justify-center">
        <CircularProgress />
      </Box>
    );
  }

  return <Shell api={api} nav={nav} setNav={setNav} onLogout={auth.logout} />;
}

