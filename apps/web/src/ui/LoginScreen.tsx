import React from "react";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { env, envError } from "../lib/env";

export function LoginScreen({ onLogin }: { onLogin: () => Promise<void> }) {
  const ready = Boolean(env.VITE_AZURE_AD_TENANT_ID && env.VITE_AZURE_AD_CLIENT_ID);

  return (
    <Box className="h-full w-full flex items-center justify-center p-6">
      <Paper elevation={3} className="w-full max-w-md p-8">
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Azure DevOps Productivity Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Sign in with Microsoft to view organization-wide productivity metrics.
        </Typography>
        {!ready && (
          <Box className="mt-4">
            <Alert severity="error">
              Missing Vercel environment variables: VITE_AZURE_AD_TENANT_ID and VITE_AZURE_AD_CLIENT_ID.
            </Alert>
          </Box>
        )}
        {envError && (
          <Box className="mt-3">
            <Alert severity="warning">Environment validation failed. Check your Vercel Environment Variables.</Alert>
          </Box>
        )}
        <Box className="mt-6 flex justify-end">
          <Button variant="contained" onClick={onLogin} disabled={!ready}>
            Sign in with Microsoft
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
