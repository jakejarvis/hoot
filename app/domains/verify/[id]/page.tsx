"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound, redirect, useParams } from "next/navigation";
import { VerificationInstructions } from "@/components/dashboard/verification-instructions";
import { VerificationInstructionsSkeleton } from "@/components/dashboard/verification-instructions-skeleton";
import { useSession } from "@/lib/auth/client";
import { useTRPC } from "@/lib/trpc/client";

export default function VerifyDomainPage() {
  const params = useParams<{ id: string }>();
  const { data: session, isPending: sessionPending } = useSession();
  const trpc = useTRPC();

  // Fetch user domain details (call hooks before any conditional returns)
  const {
    data: userDomain,
    isPending: domainPending,
    isError,
  } = useQuery(trpc.domains.getForVerification.queryOptions({ id: params.id }));

  // Wait for session
  if (sessionPending) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <VerificationInstructionsSkeleton />
      </div>
    );
  }

  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  if (domainPending) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <VerificationInstructionsSkeleton />
      </div>
    );
  }

  if (isError || !userDomain) {
    notFound();
  }

  // If already verified, redirect to dashboard
  if (userDomain.verified) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <VerificationInstructions
        userDomainId={userDomain.id}
        domainName={userDomain.domain}
        verificationToken={userDomain.verificationToken}
      />
    </div>
  );
}
