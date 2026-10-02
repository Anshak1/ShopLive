import type { Request, Response } from "express";

import { verifyWebhook } from "@clerk/backend/webhooks";
import { parseRole } from "../lib/roles";
import { getEnv } from "../lib/env";
import { prisma } from "../lib/prisma";

export async function clerkWebhookHandler(req: Request, res: Response) {
  const env = getEnv();

  try {
    if (!env.CLERK_WEBHOOK_SECRET) {
      res.status(503).send("Webhooks secret is not provided");
      return;
    }

    const payload =
      req.body instanceof Buffer
        ? req.body.toString("utf8")
        : String(req.body);

    const request = new Request("http://internal/webhooks/clerk", {
      method: "POST",
      headers: new Headers(req.headers as HeadersInit),
      body: payload,
    });

    const evt = await verifyWebhook(request, {
      signingSecret: env.CLERK_WEBHOOK_SECRET,
    });

    if (evt.type === "user.created" || evt.type === "user.updated") {
      const u = evt.data;

      const email =
        u.email_addresses?.find(
          (e) => e.id === u.primary_email_address_id
        )?.email_address ??
        u.email_addresses?.[0]?.email_address;

      const displayName =
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        u.username ||
        null;

      const role = parseRole(u.public_metadata?.role);

      if (!email) {
        res.status(400).json({
          error: "User has no email",
        });
        return;
      }

      const userE = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!userE) {
        await prisma.user.create({
          data: {
            email,
            role,
            displayName,
            clerkUserId: u.id,
          },
        });
      } else {
        await prisma.user.update({
          where: {
            id: userE.id,
          },
          data: {
            email,
            displayName,
            role,
            clerkUserId: u.id,
          },
        });
      }
    }

    if (evt.type === "user.deleted") {
      const id = evt.data.id;

      if (id) {
        await prisma.user.delete({
          where: {
            clerkUserId: id,
          },
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Clerk webhook error", err);
    res.status(400).json({ error: "Invalid webhook" });
  }
}