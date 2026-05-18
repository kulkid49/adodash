import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { AppThemeProvider } from "./theme/AppThemeProvider";
import { AuthProvider } from "./auth/AuthProvider";
import { App } from "./ui/App";

const saved = localStorage.getItem("adodash:theme");
document.documentElement.classList.toggle("dark", saved === "dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppThemeProvider>
  </React.StrictMode>,
);

