"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/auth/client";
import { useTRPC } from "@/lib/trpc/client";

/**
 * Test page to demonstrate tRPC public and protected procedures.
 * TODO: Remove this file after testing.
 */
export default function TrpcTestPage() {
  const trpc = useTRPC();
  const { data: session } = useSession();

  const publicQuery = useQuery(
    trpc.test.public.queryOptions(undefined, {
      enabled: false,
    }),
  );

  const protectedQuery = useQuery(
    trpc.test.protected.queryOptions(undefined, {
      enabled: false,
    }),
  );

  const testPublic = async () => {
    await publicQuery.refetch();
  };

  const testProtected = async () => {
    await protectedQuery.refetch();
  };

  return (
    <div className="container mx-auto min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="mb-2 font-bold text-3xl">tRPC Auth Test</h1>
          <p className="text-muted-foreground">
            Test public and protected tRPC procedures with Better Auth
          </p>
        </div>

        <Alert>
          <AlertDescription>
            {session ? (
              <>
                ✅ Logged in as <strong>{session.user.email}</strong>
              </>
            ) : (
              <>❌ Not logged in</>
            )}
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Public Procedure Test */}
          <Card>
            <CardHeader>
              <CardTitle>Public Procedure</CardTitle>
              <CardDescription>
                Should work regardless of authentication status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={testPublic}
                className="w-full"
                disabled={publicQuery.isFetching}
              >
                {publicQuery.isFetching ? "Loading..." : "Call test.public"}
              </Button>

              {publicQuery.isSuccess && publicQuery.data && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <pre className="overflow-x-auto text-xs">
                    {JSON.stringify(publicQuery.data, null, 2)}
                  </pre>
                </div>
              )}

              {publicQuery.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {publicQuery.error instanceof Error
                      ? publicQuery.error.message
                      : String(publicQuery.error)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Protected Procedure Test */}
          <Card>
            <CardHeader>
              <CardTitle>Protected Procedure</CardTitle>
              <CardDescription>
                Returns 200 when logged in, 401 (UNAUTHORIZED) when logged out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={testProtected}
                className="w-full"
                disabled={protectedQuery.isFetching}
              >
                {protectedQuery.isFetching
                  ? "Loading..."
                  : "Call test.protected"}
              </Button>

              {protectedQuery.isSuccess && protectedQuery.data && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <pre className="overflow-x-auto text-xs">
                    {JSON.stringify(protectedQuery.data, null, 2)}
                  </pre>
                </div>
              )}

              {protectedQuery.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {protectedQuery.error instanceof Error &&
                    protectedQuery.error.message.includes("UNAUTHORIZED") ? (
                      <>
                        ✅ <strong>Expected:</strong> UNAUTHORIZED error
                        received
                      </>
                    ) : protectedQuery.error instanceof Error ? (
                      protectedQuery.error.message
                    ) : (
                      String(protectedQuery.error)
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              window.location.href = "/auth-demo";
            }}
          >
            Go to Auth Demo
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
