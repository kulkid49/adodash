import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../auth/AuthProvider";
import { createApiClient } from "../lib/api";
import { LoginScreen } from "./LoginScreen";
import { Shell } from "./Shell";
export function App() {
    const auth = useAuth();
    const [nav, setNav] = useState("dashboard");
    const api = useMemo(() => createApiClient(() => auth.idToken), [auth.idToken]);
    if (!auth.account) {
        return _jsx(LoginScreen, { onLogin: auth.login });
    }
    if (!auth.idToken) {
        return (_jsx(Box, { className: "h-full w-full flex items-center justify-center", children: _jsx(CircularProgress, {}) }));
    }
    return _jsx(Shell, { api: api, nav: nav, setNav: setNav, onLogout: auth.logout });
}
