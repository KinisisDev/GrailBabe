import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { dark } from "@clerk/themes";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

if (!PUBLISHABLE_KEY) {
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY environment variable. Set it in Replit Secrets.",
  );
}

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={PUBLISHABLE_KEY}
    appearance={{
      baseTheme: dark,
      variables: {
        colorPrimary: "hsl(322, 88%, 62%)",
        colorBackground: "hsl(240, 10%, 5%)",
        colorText: "hsl(36, 30%, 94%)",
        colorInputBackground: "hsl(240, 6%, 11%)",
        colorInputText: "hsl(36, 30%, 94%)",
        borderRadius: "0.75rem",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      },
    }}
  >
    <App />
  </ClerkProvider>,
);
