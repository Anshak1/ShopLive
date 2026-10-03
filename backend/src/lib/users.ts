import { prisma } from "./prisma";

export async function getLocalUser(clerkUserId: string) {
  const userE = await prisma.user.findFirst({
    where:{
        clerkUserId
    }
  })

  return userE;
}