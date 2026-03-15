import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import { I18nProvider } from "./i18n";
import RootApp from "./root-app";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <RootApp />
    </I18nProvider>
  </React.StrictMode>
);
