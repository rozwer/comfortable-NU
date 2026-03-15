import { loadHostName } from "./features/storage";
import { createRoot } from "react-dom/client";
import React from "react";
import { MiniSakaiRoot } from "./components/main";

/**
 * Initialize subSakai
 */
async function initSubSakai() {
    const hostname = await loadHostName();
    const domRoot = document.querySelector("#subSakai");
    if (domRoot === null) {
        console.warn("could not find #subSakai");
        return;
    }

    if (hostname === undefined) {
        const msg = document.createElement('p');
        msg.style.padding = '16px';
        msg.style.color = '#666';
        msg.textContent = 'TACTページを一度開いてください。';
        domRoot.appendChild(msg);
        return;
    }

    const root = createRoot(domRoot);
    root.render(<MiniSakaiRoot subset={true} hostname={hostname} />);
}

initSubSakai();
