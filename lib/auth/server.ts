import "server-only";

import { headers } from "next/headers";
import type { Session, User } from "@/lib/auth/config";
import { auth } from "@/lib/auth/config";

/**
 * Get the current session from the request.
 * Returns null if no valid session exists.
 */
export async function getSession(): Promise<{
  session: Session;
  user: User;
} | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  return {
    session: session.session,
    user: session.user,
  };
}

/**
 * Require authentication. Throws an error if no valid session exists.
 * Use this in server components/actions that require authentication.
 */
export async function requireAuth(): Promise<{
  session: Session;
  user: User;
}> {
  const result = await getSession();

  if (!result) {
    throw new Error("Unauthorized: No valid session");
  }

  return result;
}
