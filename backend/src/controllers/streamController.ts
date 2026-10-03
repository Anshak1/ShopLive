import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { getLocalUser } from "../lib/users.js";
import { getStreamChatServer, streamChatDisplayName, streamUserId } from "../lib/stream.js"
import { getEnv } from "../lib/env.js";

const env = getEnv();

export async function createStreamToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, isAuthenticated } = getAuth(req);
    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const localUser = await getLocalUser(userId); //. return obj where clerkUserId=userId
    if (!localUser) {
      res.status(503).json({ error: "Account not synced yet" });
      return;
    }

    const server = getStreamChatServer(env);// get the instance of stream server

    const clerkUser = await clerkClient.users.getUser(userId); // entire user details from clerk

    const combined = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

    const name = streamChatDisplayName(
      localUser.role,
      localUser.displayName ?? combined ?? clerkUser.username,
      localUser.email,
    ); // takes role,displayName,email returns Admin . ansjank

    const image = clerkUser.imageUrl || undefined;
    const sid = streamUserId(userId); // create clerk_ksvlsknl

    await server.upsertUser({ id: sid, name, image }); // update or create

    const token = server.createToken(sid);

    res.json({ token, apiKey: env.STREAM_API_KEY, userId: sid, name });
  } catch (e) {
    next(e);
  }
}