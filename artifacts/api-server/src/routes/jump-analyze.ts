import { Router } from "express";
import type { Request, Response } from "express";
import http from "http";

const router = Router();

function proxyToAnalyzer(req: Request, res: Response) {
  const options: http.RequestOptions = {
    hostname: "localhost",
    port: 5000,
    path: "/analyze",
    method: "POST",
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode ?? 502);

    const contentType = proxyRes.headers["content-type"];
    if (contentType) res.setHeader("Content-Type", contentType);

    let body = "";
    proxyRes.setEncoding("utf8");
    proxyRes.on("data", (chunk: string) => { body += chunk; });
    proxyRes.on("end", () => {
      try {
        res.json(JSON.parse(body));
      } catch {
        res.status(502).json({ error: "Invalid response from analyzer" });
      }
    });
  });

  proxyReq.on("error", (err: Error) => {
    req.log.error({ err }, "jump-analyze proxy error");
    if (!res.headersSent) {
      res.status(502).json({ error: "Analyzer service unavailable. Lütfen tekrar deneyin." });
    }
  });

  req.pipe(proxyReq);
}

router.post("/jump-analyze", proxyToAnalyzer);
router.post("/analyze", proxyToAnalyzer);

export default router;
