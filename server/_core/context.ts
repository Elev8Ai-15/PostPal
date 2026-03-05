import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    // Log the failure so it's distinguishable from "no auth provided"
    const authHeader = opts.req.headers.authorization || opts.req.headers["authorization"];
    if (authHeader) {
      console.warn("[Auth] Authentication failed for request with auth header:", error instanceof Error ? error.message : error);
    }
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
