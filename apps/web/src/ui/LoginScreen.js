import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { env, envError } from "../lib/env";
export function LoginScreen({ onLogin }) {
    const ready = Boolean(env.VITE_AZURE_AD_TENANT_ID && env.VITE_AZURE_AD_CLIENT_ID);
    return (_jsx(Box, { className: "h-full w-full flex items-center justify-center p-6", children: _jsxs(Paper, { elevation: 3, className: "w-full max-w-md p-8", children: [_jsx(Typography, { variant: "h5", fontWeight: 700, gutterBottom: true, children: "Azure DevOps Productivity Dashboard" }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Sign in with Microsoft to view organization-wide productivity metrics." }), !ready && (_jsx(Box, { className: "mt-4", children: _jsx(Alert, { severity: "error", children: "Missing Vercel environment variables: VITE_AZURE_AD_TENANT_ID and VITE_AZURE_AD_CLIENT_ID." }) })), envError && (_jsx(Box, { className: "mt-3", children: _jsx(Alert, { severity: "warning", children: "Environment validation failed. Check your Vercel Environment Variables." }) })), _jsx(Box, { className: "mt-6 flex justify-end", children: _jsx(Button, { variant: "contained", onClick: onLogin, disabled: !ready, children: "Sign in with Microsoft" }) })] }) }));
}
