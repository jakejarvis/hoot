"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "@/hooks/use-router";

/**
 * Placeholder login page.
 * TODO: Implement actual login form with Better Auth.
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirect] = useState(searchParams.get("redirect") || "/dashboard");

  useEffect(() => {
    // If user is already logged in, redirect them
    // This would be handled by checking session in a real implementation
  }, []);

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Sign in to access protected pages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Login form not yet implemented. This is a placeholder page to
              demonstrate middleware authentication.
            </AlertDescription>
          </Alert>

          {redirect !== "/dashboard" && (
            <p className="text-muted-foreground text-sm">
              You were trying to access:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">{redirect}</code>
            </p>
          )}

          <div className="space-y-2">
            <Button
              onClick={() => router.push("/auth-demo")}
              variant="outline"
              className="w-full"
            >
              Go to Auth Demo
            </Button>
            <Button onClick={() => router.push("/")} className="w-full">
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
