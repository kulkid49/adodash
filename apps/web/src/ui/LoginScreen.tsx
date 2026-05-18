import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";

export function LoginScreen({ onLogin }: { onLogin: () => Promise<void> }) {
  return (
    <Box className="h-full w-full flex items-center justify-center p-6">
      <Paper elevation={3} className="w-full max-w-md p-8">
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Azure DevOps Productivity Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Sign in with Microsoft to view organization-wide productivity metrics.
        </Typography>
        <Box className="mt-6 flex justify-end">
          <Button variant="contained" onClick={onLogin}>
            Sign in with Microsoft
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

