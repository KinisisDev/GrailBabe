import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { EventType, type AuthenticationResult } from "@azure/msal-browser";
import { msalInstance, ENTRA_API_SCOPE } from "./lib/auth/msalConfig";
import {
  setAuthTokenGetter,
  setBaseUrl,
} from "@workspace/api-client-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import App from "./App";
import "./index.css";

document.documentElement.classList.add("dark");

setBaseUrl(null);
setAuthTokenGetter(async () => {
  const account = msalInstance.getActiveAccount();
  if (!account) return null;
  try {
    const result = await msalInstance.acquireTokenSilent({
      account,
      scopes: [ENTRA_API_SCOPE],
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect({ scopes: [ENTRA_API_SCOPE] });
    }
    return null;
  }
});

await msalInstance.initialize();

const accounts = msalInstance.getAllAccounts();
if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
  msalInstance.setActiveAccount(accounts[0]);
}

msalInstance.addEventCallback((event) => {
  if (
    event.eventType === EventType.LOGIN_SUCCESS ||
    event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
  ) {
    const payload = event.payload as AuthenticationResult | null;
    if (payload?.account) {
      msalInstance.setActiveAccount(payload.account);
    }
  }
});

await msalInstance.handleRedirectPromise().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[msal] handleRedirectPromise failed", err);
});

createRoot(document.getElementById("root")!).render(
  <MsalProvider instance={msalInstance}>
    <App />
  </MsalProvider>,
);
