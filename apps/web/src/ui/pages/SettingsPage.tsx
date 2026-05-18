import React, { useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export function SettingsPage({
  api,
  onSynced,
}: {
  api: AxiosInstance;
  onSynced: () => Promise<void>;
}) {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationUrl, setOrganizationUrl] = useState("");
  const [pat, setPat] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SAVING" | "SUCCESS" | "ERROR">("IDLE");
  const [message, setMessage] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string; role: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});

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
    } catch (e) {
      setStatus("ERROR");
      setMessage(e instanceof Error ? e.message : "Failed to sync");
    }
  }

  async function loadAdmin() {
    try {
      const [u, p] = await Promise.all([api.get("/admin/users"), api.get("/projects")]);
      setUsers(u.data.users ?? []);
      setProjects((p.data.projects ?? []).map((x: any) => ({ id: x.id, name: x.name })));
      setIsAdmin(true);
    } catch {
      setIsAdmin(false);
    }
  }

  useEffect(() => {
    void loadAdmin();
  }, []);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  async function updateRole(userId: string, role: string) {
    await api.post(`/admin/users/${userId}/role`, { role });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  }

  async function saveProjects(userId: string) {
    const projectIds = assignments[userId] ?? [];
    await api.post(`/admin/users/${userId}/projects`, { projectIds });
  }

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Azure DevOps Connection
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Admins can configure an organization-wide connection using a Personal Access Token (PAT). OAuth-only mode
            can be used when backend is configured for delegated access.
          </Typography>

          <Box className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField
              label="Organization Name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="myorg"
              fullWidth
            />
            <TextField
              label="Organization URL"
              value={organizationUrl}
              onChange={(e) => setOrganizationUrl(e.target.value)}
              placeholder="https://dev.azure.com/myorg"
              fullWidth
            />
            <TextField
              label="PAT (optional)"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="Azure DevOps PAT"
              fullWidth
              type="password"
            />
          </Box>

          <Box className="mt-4 flex justify-end">
            <Button variant="contained" onClick={() => void saveAndSync()} disabled={status === "SAVING"}>
              Save & Sync Now
            </Button>
          </Box>

          {message && (
            <Box className="mt-4">
              <Alert severity={status === "ERROR" ? "error" : "success"}>{message}</Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Admin · Users & RBAC
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Assign roles and (optionally) restrict Project Manager access to specific projects.
            </Typography>

            <Stack spacing={2} sx={{ mt: 2 }}>
              {users.map((u) => (
                <Card key={u.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography fontWeight={800}>{u.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {u.email}
                        </Typography>
                      </Box>
                      <FormControl sx={{ minWidth: 220 }}>
                        <InputLabel id={`role-${u.id}`}>Role</InputLabel>
                        <Select
                          labelId={`role-${u.id}`}
                          label="Role"
                          value={u.role}
                          onChange={(e) => void updateRole(u.id, String(e.target.value))}
                        >
                          <MenuItem value="ADMIN">Admin</MenuItem>
                          <MenuItem value="PROJECT_MANAGER">Project Manager</MenuItem>
                          <MenuItem value="TEAM_LEAD">Team Lead</MenuItem>
                          <MenuItem value="EMPLOYEE">Employee</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>

                    {u.role === "PROJECT_MANAGER" && (
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <FormControl fullWidth>
                          <InputLabel id={`projects-${u.id}`}>Assigned Projects</InputLabel>
                          <Select
                            labelId={`projects-${u.id}`}
                            label="Assigned Projects"
                            multiple
                            value={assignments[u.id] ?? []}
                            onChange={(e) => {
                              const v = e.target.value as string[];
                              setAssignments((prev) => ({ ...prev, [u.id]: v }));
                            }}
                            renderValue={(selected) => (
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                {selected.map((pid) => (
                                  <Chip key={pid} size="small" label={projectNameById.get(pid) ?? pid} />
                                ))}
                              </Box>
                            )}
                          >
                            {projects.map((p) => (
                              <MenuItem key={p.id} value={p.id}>
                                {p.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Box className="flex justify-end">
                          <Button variant="outlined" onClick={() => void saveProjects(u.id)}>
                            Save Project Access
                          </Button>
                        </Box>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
