import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { msalApp, loginRequest } from "./msal";

type AuthState = {
  account: AccountInfo | null;
  idToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountInfo | null>(() => {
    const acc = msalApp.getActiveAccount();
    return acc ?? null;
  });
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const active = msalApp.getActiveAccount();
    if (!active) return;

    msalApp
      .acquireTokenSilent({ ...loginRequest, account: active })
      .then((r) => {
        setIdToken(r.idToken ?? null);
        setAccount(r.account ?? active);
      })
      .catch(() => {
        setIdToken(null);
      });
  }, []);

  const login = useCallback(async () => {
    const result: AuthenticationResult = await msalApp.loginPopup(loginRequest);
    msalApp.setActiveAccount(result.account);
    setAccount(result.account ?? null);
    setIdToken(result.idToken ?? null);
  }, []);

  const logout = useCallback(async () => {
    const current = msalApp.getActiveAccount();
    if (current) {
      await msalApp.logoutPopup({ account: current });
    }
    setAccount(null);
    setIdToken(null);
  }, []);

  const value = useMemo<AuthState>(() => ({ account, idToken, login, logout }), [account, idToken, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("AuthProvider missing");
  }
  return ctx;
}
