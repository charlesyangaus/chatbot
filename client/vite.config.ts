import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.CLIENT_PORT) || 5173;
  const apiProxyTarget = env.API_PROXY_TARGET || "http://localhost:3001";

  return {
    plugins: [react()],
    server: {
      port,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
