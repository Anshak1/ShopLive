import express from "express";
import cors from "cors"
import "dotenv/config";



import fs from "node:fs";
import path from "node:path";
// import { clerkWebhookHandler } from "./clerk";
import { getEnv } from "./lib/env";
import { clerkWebhookHandler } from "./webhooks/clerk";
import job from "./lib/cron";

import meRouter from "./routes/meRouter";
import pdtRouter from "./routes/pdtRouter";
import streamRouter from "./routes/streamRouter"

const env = getEnv();
const app = express();
const rawJson = express.raw({ type: "application/json", limit: "1mb" });
// it's important that you don't parse the webhook event data, it should be in the raw format
app.post("/webhooks/clerk", rawJson, (req, res) => {
  void clerkWebhookHandler(req, res);
});
app.use(express.json());
app.use(cors());

app.get('/health',(_req,res)=>{
    res.json({ok:true})
})

app.use('/api/me',meRouter);
app.use('/api/pdt',pdtRouter);
app.use("/api/stream", streamRouter);

const publicDir = path.join(process.cwd(), "public"); // find /shoplive/public
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get("/{*any}", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (req.path.startsWith("/api") || req.path.startsWith("/webhooks")) {
      next();
      return;
    }

    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
}

app.listen(env.PORT,()=>{
    console.log("server is running on port:",env.PORT);
    if(env.NODE_ENV==="production"){
        job.start();
    }
})