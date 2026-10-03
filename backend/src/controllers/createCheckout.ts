import type { Request, Response, NextFunction } from "express";
import { getEnv } from "../lib/env";
import z from "zod";
import { getAuth } from "@clerk/express";
import { getLocalUser } from "../lib/users";


import { prisma } from "../lib/prisma";
import { polarCreateCheckout } from "../lib/polar";

const env = getEnv(); // env validator
//cart schema 
// {
//     items:[{pdtId:"dcada", qty:8}]
// }
const cartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

type CheckoutSessionLine = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
};

export async function createCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    // only signed-in users can start checkout
    const { userId, isAuthenticated } = getAuth(req); // signed in user can checkout from clerk
    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = cartSchema.safeParse(req.body); // safeParse the data from body {item:[{pdtId:"adadad",qty:6}]}
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid cart", details: parsed.error.flatten() });
      return;
    }

    // polar access token is required
    if (!env.POLAR_ACCESS_TOKEN) {
        // server side error
      res.status(503).json({ error: "Payments are not configured" });
      return;
    }

    const localUser = await getLocalUser(userId); // from db
    if (!localUser) {
      res.status(503).json({ error: "Account not synced yet" });
      return;
    }

    const ids = parsed.data.items.map((i) => i.productId); //["a131312","12e12"]

    // load every cart product that exists, is active, and matches the IDs we asked for.
    // let prodRows = [];
    // for(let i of ids){
        const prodRows = await prisma.product.findMany({
        where:{
           id: {
            in: ids
           },
           active:true
        }
        })
    //}

    if (prodRows.length !== ids.length) {
      res.status(400).json({ error: "One or more products are invalid/not active" });
      return;
    }

    const byId = new Map(prodRows.map((p) => [p.id, p])); // map to pdtid->p from db
    let totalCents = 0;
    const lines: CheckoutSessionLine[] = [];

    for (const line of parsed.data.items) {
      const p = byId.get(line.productId)!; // line comes from parsed.data.items cart item 
      // from pdt id get the pdt from dp
      totalCents += p.priceCents * line.quantity;
      lines.push({
        productId: p.id,
        quantity: line.quantity,
        unitPriceCents: p.priceCents,
      });
    }

    const session = await prisma.checkoutSession.create({
        data:{
            userId:localUser.id,
            lines,
            totalCents,
            currency:"usd",
            polarCheckoutId:env.POLAR_CHECKOUT_PRODUCT_ID
        }
    })

    const successUrl = `${env.FRONTEND_URL}/checkout/return?checkout_id={CHECKOUT_ID}`;
    const returnUrl = `${env.FRONTEND_URL}/cart`;

    const checkout = await polarCreateCheckout(env, {
      products: [env.POLAR_CHECKOUT_PRODUCT_ID],
      prices: {
        [env.POLAR_CHECKOUT_PRODUCT_ID]: [
          {
            amount_type: "fixed",
            price_currency: "usd",
            price_amount: totalCents,
          },
        ],
      },

      success_url: successUrl,
      return_url: returnUrl,
      external_customer_id: userId,
      metadata: { checkout_session_id: session.id },
    });

    await prisma.checkoutSession.update({
      where:{
        id:session.id
      },
      data:{
        polarCheckoutId:checkout.id
      }
    })

    res.json({ checkoutUrl: checkout.url });
  } catch (e) {
    next(e);
  }
}