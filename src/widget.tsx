import React from "react";
import ReactDOM from "react-dom/client";
import { ChatWidget } from "./components/ChatWidget.tsx";

declare global {
  interface Window {
    XatwootWidget?: {
      init: (config: { inboxId: number; apiHost?: string; wsUrl?: string }) => void;
    };
  }
}

function initWidget(config: { inboxId: number; apiHost?: string; wsUrl?: string }) {
  let container = document.getElementById("xatwoot-widget-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "xatwoot-widget-container";
    document.body.appendChild(container);
  }

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <ChatWidget
        token=""
        contactId={0}
        inboxId={config.inboxId}
        apiHost={config.apiHost ?? window.location.origin}
      />
    </React.StrictMode>
  );
}

// Auto-initialize if data attributes are present on script tag
if (typeof window !== "undefined") {
  window.XatwootWidget = {
    init: initWidget,
  };

  const scriptTag = document.currentScript as HTMLScriptElement | null;
  if (scriptTag) {
    const inboxIdAttr = scriptTag.getAttribute("data-inbox-id");
    const apiHostAttr = scriptTag.getAttribute("data-api-host");
    const wsUrlAttr = scriptTag.getAttribute("data-ws-url");

    if (inboxIdAttr) {
      initWidget({
        inboxId: Number(inboxIdAttr),
        apiHost: apiHostAttr ?? undefined,
        wsUrl: wsUrlAttr ?? undefined,
      });
    }
  }
}

export { initWidget };
