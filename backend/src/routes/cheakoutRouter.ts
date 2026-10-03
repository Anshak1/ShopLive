import { Router } from "express";
import { createCheckout } from "../controllers/createCheckout";

const router = Router();

router.post("/",createCheckout);

export default router;