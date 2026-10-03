import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const cat = typeof req.query.category === "string" ? req.query.category.trim() : "";

    const rows = await prisma.product.findMany({
        where:{
            active:true,
            ...(cat ? {category:cat} : {})
        },
        orderBy:{
            createdAt: "desc"
        },
    })

    res.json({ products: rows });
  } catch (e) {
    next(e);
  }
}

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    // select distinct category 
    // from products
    // where active = true
    const rows = await prisma.product.findMany({
        where:{
            active:true
        },
        select:{
            category:true
        },
        distinct:["category"]
    })

    const categories = rows.map((r) => r.category).sort((a, b) => a.localeCompare(b));
    // sort alphabetical order localeCompare -> -ve a before b , 0 same, +ve a after b
    res.json({ categories });
  } catch (e) {
    next(e);
  }
}

export async function getProductBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = req.params.slug;
    const row = await prisma.product.findUnique({
        where:{
            slug:slug as string,
        }
    })
    if (!row || !row.active) return res.status(404).json({ error: "Not found" });

    res.json({ product: row });
  } catch (e) {
    next(e);
  }
}