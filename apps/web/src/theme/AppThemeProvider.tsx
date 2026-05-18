import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

type Mode = "light" | "dark";

type ThemeState = {
  mode: Mode;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem("adodash:theme");
    return saved === "dark" ? "dark" : "light";
  });

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next = m === "light" ? "dark" : "light";
      localStorage.setItem("adodash:theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: "#2563eb" },
          secondary: { main: "#7c3aed" },
        },
        shape: { borderRadius: 12 },
      }),
    [mode],
  );

  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("AppThemeProvider missing");
  return ctx;
}

