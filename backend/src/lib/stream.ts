import { StreamChat } from "stream-chat";
import type { Env } from "./env.js"; // type env
import { UserRole } from "../generated/prisma/enums.js";


export function streamChatDisplayName(
  role: UserRole,
  displayName: string | null,
  email: string,
): string {
  const base = displayName ?? email.split("@")[0];
  if (role === "admin") return `Admin · ${base}`;
  // Admin · John
  if (role === "support") return `Support · ${base}`;
  return base; // else customer
}

export function getStreamChatServer(env: Env) {
  return StreamChat.getInstance(env.STREAM_API_KEY, env.STREAM_API_SECRET);
}

export function streamUserId(clerkUserId: string) {
  return `clerk_${clerkUserId}`;
}