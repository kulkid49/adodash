import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Button, Paper, Typography } from "@mui/material";
export function LoginScreen({ onLogin }) {
    return (_jsx(Box, { className: "h-full w-full flex items-center justify-center p-6", children: _jsxs(Paper, { elevation: 3, className: "w-full max-w-md p-8", children: [_jsx(Typography, { variant: "h5", fontWeight: 700, gutterBottom: true, children: "Azure DevOps Productivity Dashboard" }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Sign in with Microsoft to view organization-wide productivity metrics." }), _jsx(Box, { className: "mt-6 flex justify-end", children: _jsx(Button, { variant: "contained", onClick: onLogin, children: "Sign in with Microsoft" }) })] }) }));
}
