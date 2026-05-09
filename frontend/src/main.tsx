import { ChakraProvider } from "@chakra-ui/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import "./i18n/i18n";
import App from "./App";
import "./index.css";
import { agriserviceTheme } from "./theme/agriservice-theme";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider theme={agriserviceTheme}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
);
