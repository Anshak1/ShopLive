import { Router } from "express";
import { createStreamToken } from "../controllers/streamController";

const router = Router();

router.post("/token", createStreamToken); // localhost:3002/api/stream/token

export default router;