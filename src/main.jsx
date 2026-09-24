import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { ProvidersProvider } from "./Context/providersContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <ProvidersProvider>
        <App />
      </ProvidersProvider>
    </HashRouter>
  </React.StrictMode>,
);
