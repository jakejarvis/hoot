"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, FileCode, Globe, Server } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC, useTRPCClient } from "@/lib/trpc/client";

export function VerificationInstructions({
  userDomainId,
  domainName,
  verificationToken,
}: {
  userDomainId: string;
  domainName: string;
  verificationToken: string | null;
}) {
  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  const verifyMutation = useMutation({
    mutationFn: ({ method }: { method: "dns" | "meta" | "file" }) =>
      trpcClient.domains.verify.mutate({
        domainId: userDomainId,
        method,
      }),
    onSuccess: (result, variables) => {
      if (result.verified) {
        toast.success("Domain verified successfully!", {
          description: `${domainName} is now verified via ${variables.method.toUpperCase()}`,
        });

        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: trpc.domains.list.queryOptions().queryKey,
        });

        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error("Verification failed", {
          description: `Could not verify ${domainName} using ${variables.method.toUpperCase()}. Please check your configuration.`,
        });
      }
      setActiveMethod(null);
    },
    onError: (error) => {
      toast.error("Verification error", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
      setActiveMethod(null);
    },
  });

  const handleVerify = (method: "dns" | "meta" | "file") => {
    setActiveMethod(method);
    verifyMutation.mutate({ method });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (!verificationToken) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No verification token found. Please try adding the domain again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const dnsRecord = `domainstack-verify=${verificationToken}`;
  const metaTag = `<meta name="domainstack-verify" content="${verificationToken}">`;
  const filePath = `/.well-known/domainstack-verify.txt`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-3xl tracking-tight">
          Verify {domainName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose a verification method to prove you own this domain
        </p>
      </div>

      <Tabs defaultValue="dns" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dns">
            <Server className="mr-2 size-4" />
            DNS
          </TabsTrigger>
          <TabsTrigger value="meta">
            <FileCode className="mr-2 size-4" />
            Meta Tag
          </TabsTrigger>
          <TabsTrigger value="file">
            <Globe className="mr-2 size-4" />
            File
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dns" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                DNS Verification
                <Badge variant="secondary" className="text-xs">
                  Recommended
                </Badge>
              </CardTitle>
              <CardDescription>
                Add a TXT record to your domain's DNS settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 font-medium text-sm">
                  Add this TXT record to your DNS:
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-sm">
                    <div className="space-y-1">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        _domainstack
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span> TXT
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground">Value:</span>
                        <span className="flex-1 break-all">{dnsRecord}</span>
                      </div>
                    </div>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(dnsRecord)}
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <p className="text-muted-foreground text-xs">
                  <strong className="text-foreground">Note:</strong> DNS
                  propagation can take 5-30 minutes. If verification fails, wait
                  a few minutes and try again.
                </p>
              </div>

              <Button
                onClick={() => handleVerify("dns")}
                disabled={verifyMutation.isPending}
                className="w-full"
              >
                {activeMethod === "dns" && verifyMutation.isPending
                  ? "Verifying..."
                  : "Verify DNS Record"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Meta Tag Verification</CardTitle>
              <CardDescription>
                Add a meta tag to your website's homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 font-medium text-sm">
                  Add this meta tag to the {"<head>"} section of your homepage:
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-sm">
                    {metaTag}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(metaTag)}
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <p className="text-muted-foreground text-xs">
                  <strong className="text-foreground">Note:</strong> The meta
                  tag must be on your homepage at https://{domainName}
                </p>
              </div>

              <Button
                onClick={() => handleVerify("meta")}
                disabled={verifyMutation.isPending}
                className="w-full"
              >
                {activeMethod === "meta" && verifyMutation.isPending
                  ? "Verifying..."
                  : "Verify Meta Tag"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="file" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>File Verification</CardTitle>
              <CardDescription>
                Upload a verification file to your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 font-medium text-sm">
                  Create a file at this location:
                </p>
                <div className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-sm">
                  https://{domainName}
                  {filePath}
                </div>
              </div>

              <div>
                <p className="mb-2 font-medium text-sm">
                  With this exact content:
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-sm">
                    {verificationToken}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(verificationToken)}
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <p className="text-muted-foreground text-xs">
                  <strong className="text-foreground">Note:</strong> The file
                  must be publicly accessible and return the token as plain
                  text.
                </p>
              </div>

              <Button
                onClick={() => handleVerify("file")}
                disabled={verifyMutation.isPending}
                className="w-full"
              >
                {activeMethod === "file" && verifyMutation.isPending
                  ? "Verifying..."
                  : "Verify File"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
