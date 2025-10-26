/**
 * Magic Link Authentication Example
 *
 * This component demonstrates how to implement magic link authentication
 * using Better Auth's magic link plugin.
 *
 * Usage:
 * 1. User enters their email
 * 2. Backend sends magic link email
 * 3. User clicks link in email
 * 4. User is automatically signed in and redirected
 */

"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth/client";

export function MagicLinkExample() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const result = await signIn.magicLink({
        email,
        callbackURL: "/dashboard",
        newUserCallbackURL: "/welcome",
      });

      if (result.error) {
        setError(result.error.message || "Failed to send magic link");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In with Email</CardTitle>
        <CardDescription>
          We'll send you a magic link to sign in instantly
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <Alert>
            <AlertDescription>
              ✅ Check your email! We've sent you a magic link to{" "}
              <strong>{email}</strong>. Click the link to sign in.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-muted-foreground text-sm">
          No password needed. We'll email you a secure link.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * VERIFICATION HANDLER
 *
 * When users click the magic link in their email, Better Auth automatically
 * handles verification and redirects them to the callbackURL.
 *
 * The URL format is: /api/auth/magic-link/verify?token=...
 *
 * You can also manually verify with:
 *
 * const result = await magicLink.verify({
 *   query: { token: "...", callbackURL: "/dashboard" }
 * });
 */

/**
 * API USAGE
 *
 * To send a magic link from an API route or server action:
 *
 * import { auth } from "@/lib/auth/config";
 *
 * const result = await auth.api.signInMagicLink({
 *   body: {
 *     email: "user@example.com",
 *     callbackURL: "/dashboard",
 *   },
 *   headers: await headers(),
 * });
 */
