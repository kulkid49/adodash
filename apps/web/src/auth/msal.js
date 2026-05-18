import { PublicClientApplication } from "@azure/msal-browser";
import { env } from "../lib/env";
export const msalApp = new PublicClientApplication({
    auth: {
        clientId: env.VITE_AZURE_AD_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${env.VITE_AZURE_AD_TENANT_ID}`,
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
});
export const loginRequest = {
    scopes: ["openid", "profile", "email"],
};
