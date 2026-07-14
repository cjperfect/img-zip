import http from "node:http";
import https from "node:https";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** 通用的云存储代理中间件 — 解码代理 URL 并透传请求 */
function createStorageProxy(prefix) {
  return {
    name: `${prefix}-proxy`,
    configureServer(server) {
      server.middlewares.use(prefix, (req, res) => {
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
  };
}

export default defineConfig(({ mode }) => {
  return {
    base: mode === "development" ? "/" : "/img-zip/",
    build: {
      outDir: "docs",
    },
    plugins: [
      react(),
      tailwindcss(),
      // 开发环境动态代理 — 拦截 SDK 请求转发到用户配置的云存储端点，绕过浏览器跨域限制
      createStorageProxy("/api/obs-proxy/"),
      createStorageProxy("/api/oss-proxy/"),
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
