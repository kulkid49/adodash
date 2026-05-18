import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography, } from "@mui/material";
export function SettingsPage({ api, onSynced, }) {
    const [organizationName, setOrganizationName] = useState("");
    const [organizationUrl, setOrganizationUrl] = useState("");
    const [pat, setPat] = useState("");
    const [status, setStatus] = useState("IDLE");
    const [message, setMessage] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [assignments, setAssignments] = useState({});
    async function saveAndSync() {
        setStatus("SAVING");
        setMessage(null);
        try {
            await api.post("/sync/azure-devops", {
                organizationName,
                organizationUrl,
                pat: pat ? pat : undefined,
            });
            setStatus("SUCCESS");
            setMessage("Connection saved and sync started.");
            await onSynced();
        }
        catch (e) {
            setStatus("ERROR");
            setMessage(e instanceof Error ? e.message : "Failed to sync");
        }
    }
    async function loadAdmin() {
        try {
            const [u, p] = await Promise.all([api.get("/admin/users"), api.get("/projects")]);
            setUsers(u.data.users ?? []);
            setProjects((p.data.projects ?? []).map((x) => ({ id: x.id, name: x.name })));
            setIsAdmin(true);
        }
        catch {
            setIsAdmin(false);
        }
    }
    useEffect(() => {
        void loadAdmin();
    }, []);
    const projectNameById = useMemo(() => {
        const map = new Map();
        for (const p of projects)
            map.set(p.id, p.name);
        return map;
    }, [projects]);
    async function updateRole(userId, role) {
        await api.post(`/admin/users/${userId}/role`, { role });
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    }
    async function saveProjects(userId) {
        const projectIds = assignments[userId] ?? [];
        await api.post(`/admin/users/${userId}/projects`, { projectIds });
    }
    return (_jsxs(Stack, { spacing: 2, children: [_jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "Azure DevOps Connection" }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Admins can configure an organization-wide connection using a Personal Access Token (PAT). OAuth-only mode can be used when backend is configured for delegated access." }), _jsxs(Box, { className: "mt-4 grid grid-cols-1 gap-4 md:grid-cols-2", children: [_jsx(TextField, { label: "Organization Name", value: organizationName, onChange: (e) => setOrganizationName(e.target.value), placeholder: "myorg", fullWidth: true }), _jsx(TextField, { label: "Organization URL", value: organizationUrl, onChange: (e) => setOrganizationUrl(e.target.value), placeholder: "https://dev.azure.com/myorg", fullWidth: true }), _jsx(TextField, { label: "PAT (optional)", value: pat, onChange: (e) => setPat(e.target.value), placeholder: "Azure DevOps PAT", fullWidth: true, type: "password" })] }), _jsx(Box, { className: "mt-4 flex justify-end", children: _jsx(Button, { variant: "contained", onClick: () => void saveAndSync(), disabled: status === "SAVING", children: "Save & Sync Now" }) }), message && (_jsx(Box, { className: "mt-4", children: _jsx(Alert, { severity: status === "ERROR" ? "error" : "success", children: message }) }))] }) }), isAdmin && (_jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "Admin \u00B7 Users & RBAC" }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Assign roles and (optionally) restrict Project Manager access to specific projects." }), _jsx(Stack, { spacing: 2, sx: { mt: 2 }, children: users.map((u) => (_jsx(Card, { variant: "outlined", children: _jsxs(CardContent, { children: [_jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", justifyContent: "space-between", children: [_jsxs(Box, { children: [_jsx(Typography, { fontWeight: 800, children: u.name }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: u.email })] }), _jsxs(FormControl, { sx: { minWidth: 220 }, children: [_jsx(InputLabel, { id: `role-${u.id}`, children: "Role" }), _jsxs(Select, { labelId: `role-${u.id}`, label: "Role", value: u.role, onChange: (e) => void updateRole(u.id, String(e.target.value)), children: [_jsx(MenuItem, { value: "ADMIN", children: "Admin" }), _jsx(MenuItem, { value: "PROJECT_MANAGER", children: "Project Manager" }), _jsx(MenuItem, { value: "TEAM_LEAD", children: "Team Lead" }), _jsx(MenuItem, { value: "EMPLOYEE", children: "Employee" })] })] })] }), u.role === "PROJECT_MANAGER" && (_jsxs(Stack, { spacing: 1, sx: { mt: 2 }, children: [_jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { id: `projects-${u.id}`, children: "Assigned Projects" }), _jsx(Select, { labelId: `projects-${u.id}`, label: "Assigned Projects", multiple: true, value: assignments[u.id] ?? [], onChange: (e) => {
                                                                const v = e.target.value;
                                                                setAssignments((prev) => ({ ...prev, [u.id]: v }));
                                                            }, renderValue: (selected) => (_jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.5 }, children: selected.map((pid) => (_jsx(Chip, { size: "small", label: projectNameById.get(pid) ?? pid }, pid))) })), children: projects.map((p) => (_jsx(MenuItem, { value: p.id, children: p.name }, p.id))) })] }), _jsx(Box, { className: "flex justify-end", children: _jsx(Button, { variant: "outlined", onClick: () => void saveProjects(u.id), children: "Save Project Access" }) })] }))] }) }, u.id))) })] }) }))] }));
}
