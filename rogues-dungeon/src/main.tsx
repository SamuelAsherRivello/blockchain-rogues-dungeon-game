import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Content } from "./content/Content.tsx";
import { App } from "./ui/app.tsx";
import { useMobileBrowser } from "./ui/use-mobile-browser.ts";
import "./ui/style.css";

function BrowserApp() {
  const mobile = useMobileBrowser();
  return <App content={mobile
    ? <main className="mobile-notice"><p>Mobile browser version is WIP. Play on laptop browser instead.</p></main>
    : <Content />} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserApp />
  </StrictMode>,
);
