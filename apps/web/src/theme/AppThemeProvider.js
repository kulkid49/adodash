import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
const ThemeContext = createContext(null);
export function AppThemeProvider({ children }) {
    const [mode, setMode] = useState(() => {
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
    const theme = useMemo(() => createTheme({
        palette: {
            mode,
            primary: { main: "#2563eb" },
            secondary: { main: "#7c3aed" },
        },
        shape: { borderRadius: 12 },
    }), [mode]);
    const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);
    return (_jsx(ThemeContext.Provider, { value: value, children: _jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), children] }) }));
}
export function useAppTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx)
        throw new Error("AppThemeProvider missing");
    return ctx;
}
