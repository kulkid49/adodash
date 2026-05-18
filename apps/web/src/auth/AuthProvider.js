import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { msalApp, loginRequest } from "./msal";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [account, setAccount] = useState(() => {
        const acc = msalApp.getActiveAccount();
        return acc ?? null;
    });
    const [idToken, setIdToken] = useState(null);
    useEffect(() => {
        const active = msalApp.getActiveAccount();
        if (!active)
            return;
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
        const result = await msalApp.loginPopup(loginRequest);
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
    const value = useMemo(() => ({ account, idToken, login, logout }), [account, idToken, login, logout]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("AuthProvider missing");
    }
    return ctx;
}
