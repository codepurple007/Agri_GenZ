import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Same proxy for `vite` and `vite preview` — preview does not inherit `server.proxy`. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget =
    env.API_PROXY_TARGET || env.VITE_PROXY_TARGET || "http://127.0.0.1:3001";

  const apiProxy = {
    "/api": {
      target: proxyTarget,
      changeOrigin: true,
    },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    server: {
      port: 5173,
      proxy: apiProxy,
    },
    preview: {
      port: 4173,
      proxy: apiProxy,
    },
  };
});
