import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/server";

export default async function DashboardPage() {
  const session = await getSession();

  // Double-check on the server side (middleware should catch this, but belt-and-suspenders)
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 font-bold text-3xl">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome back!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You are logged in as <strong>{session.user.email}</strong>
          </p>
          {session.user.name && (
            <p className="mt-2 text-muted-foreground">
              Name: <strong>{session.user.name}</strong>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
