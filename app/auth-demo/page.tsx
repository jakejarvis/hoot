"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOut, useSession } from "@/lib/auth/client";

/**
 * Demo page to test Better Auth client hooks.
 * TODO: Remove this file after verification.
 */
export default function AuthDemoPage() {
  const { data: session, isPending, error } = useSession();

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Better Auth Demo</CardTitle>
          <CardDescription>
            Test useSession() hook and live session state changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending && (
            <div className="text-center text-muted-foreground">
              Loading session...
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm">
              Error: {error.message}
            </div>
          )}

          {!isPending &&
            !error &&
            (session ? (
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/50 p-4">
                  <h3 className="mb-2 font-semibold">Session Active</h3>
                  <dl className="space-y-1 text-sm">
                    <div>
                      <dt className="inline font-medium">User ID:</dt>
                      <dd className="ml-2 inline text-muted-foreground">
                        {session.user.id}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">Email:</dt>
                      <dd className="ml-2 inline text-muted-foreground">
                        {session.user.email}
                      </dd>
                    </div>
                    {session.user.name && (
                      <div>
                        <dt className="inline font-medium">Name:</dt>
                        <dd className="ml-2 inline text-muted-foreground">
                          {session.user.name}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
                <Button
                  onClick={async () => {
                    await signOut();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground text-sm">
                  No active session
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      window.location.href = "/sign-in";
                    }}
                    className="w-full"
                  >
                    Go to Sign In
                  </Button>
                  <Button
                    onClick={() => {
                      window.location.href = "/sign-up";
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Sign Up
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
