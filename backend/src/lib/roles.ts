
import { UserRole } from "../generated/prisma/enums";

const VALID = Object.values(UserRole);

export function parseRole(value: unknown): UserRole {
  if ( typeof value === "string" && 
    VALID.includes(value as UserRole)
  ) {
    return value as UserRole;
  }

  return UserRole.customer;
}

export function isAdmin(role: UserRole): boolean {
  return role === UserRole.admin;
}

export function isStaff(role: UserRole): boolean {
  return role === UserRole.support || role === UserRole.admin;
}