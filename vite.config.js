import http from "node:http";
import https from "node:https";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  return {
    base: mode === "development" ? "/" : "/mga/image-flow/",
    build: {
      outDir: "image-flow",
    },
    plugins: [
      react(),
      tailwindcss(),
      // 开发环境 OBS 动态代理 — 拦截 SDK 请求转发到用户配置的 OBS 端点，绕过浏览器跨域限制
      {
        name: "obs-proxy",
        configureServer(server) {
          server.middlewares.use("/api/obs-proxy/", (req, res) => {
            // Connect 已自动去除 /api/obs-proxy/ 前缀，req.url 以 / 开头
            const path = req.url.slice(1);
            const firstSlash = path.indexOf("/");
            if (firstSlash === -1) {
              res.statusCode = 400;
              res.end("Invalid proxy URL: " + path);
              return;
            }

            const raw = path.slice(0, firstSlash);
            const targetPath = path.slice(firstSlash);
            const target = new URL(decodeURIComponent(raw));
            const httpModule = target.protocol === "https:" ? https : http;

            const options = {
              hostname: target.hostname,
              port: target.port || (target.protocol === "https:" ? 443 : 80),
              path: targetPath,
              method: req.method,
              headers: { ...req.headers, host: target.hostname },
            };
            delete options.headers["x-obs-target"];

            const proxyReq = httpModule.request(options, (proxyRes) => {
              res.writeHead(proxyRes.statusCode, proxyRes.headers);
              proxyRes.pipe(res);
            });
            proxyReq.on("error", () => {
              res.statusCode = 502;
              res.end();
            });
            req.pipe(proxyReq);
          });
        },
      },
    ],
    server: {
      proxy: {
        "/api/tinypng": {
          target: "https://tinypng.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tinypng/, ""),
        },
      },
    },
  };
});
