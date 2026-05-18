import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";

const jwks = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}/discovery/v2.0/keys`),
);

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "PROJECT_MANAGER" | "TEAM_LEAD" | "EMPLOYEE";
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthedUser;
    aad?: {
      oid?: string;
      upn?: string;
      name?: string;
      preferredUsername?: string;
    };
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "missing_bearer_token" });
    return;
  }

  const token = header.slice("bearer ".length);
  try {
    const verified = await jwtVerify(token, jwks, {
      issuer: `https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}/v2.0`,
      audience: env.AZURE_AD_CLIENT_ID,
    });

    const claims = verified.payload as Record<string, unknown>;
    const oid = typeof claims.oid === "string" ? claims.oid : undefined;
    const preferredUsername =
      typeof claims.preferred_username === "string" ? claims.preferred_username : undefined;
    const upn = typeof claims.upn === "string" ? claims.upn : undefined;
    const email = preferredUsername ?? upn;
    const name = typeof claims.name === "string" ? claims.name : email ?? "User";

    if (!email) {
      res.status(401).json({ error: "missing_email_claim" });
      return;
    }

    const dbUser = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        azureOid: oid ?? undefined,
      },
      create: {
        email,
        name,
        azureOid: oid ?? undefined,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const userCount = dbUser.role === "EMPLOYEE" ? await prisma.user.count() : null;
    const ensuredUser =
      userCount === 1
        ? await prisma.user.update({
            where: { id: dbUser.id },
            data: { role: "ADMIN" },
            select: { id: true, email: true, name: true, role: true },
          })
        : dbUser;

    req.user = { ...ensuredUser, role: ensuredUser.role };
    req.aad = { oid, preferredUsername, upn, name };
    next();
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
}

export function requireRole(roles: AuthedUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!roles.includes(role)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    next();
  };
}
