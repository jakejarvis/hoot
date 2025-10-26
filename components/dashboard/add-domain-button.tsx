"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC, useTRPCClient } from "@/lib/trpc/client";

export function AddDomainButton() {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const trpcClient = useTRPCClient();

  const addDomainMutation = useMutation({
    mutationFn: (input: { domain: string }) =>
      trpcClient.domains.add.mutate(input),
    onSuccess: (result) => {
      toast.success("Domain added successfully!", {
        description: `You can now verify ownership of ${result.domain}`,
      });

      // Invalidate the domains list to refetch
      queryClient.invalidateQueries({
        queryKey: trpc.domains.list.queryOptions().queryKey,
      });

      setOpen(false);
      setDomain("");

      // Navigate to verification page
      router.push(`/domains/verify/${result.domainId}`);
    },
    onError: (error) => {
      toast.error("Failed to add domain", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addDomainMutation.mutate({ domain });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add Domain
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
            <DialogDescription>
              Enter the domain you want to monitor. You'll need to verify
              ownership before receiving notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
                autoFocus
                disabled={addDomainMutation.isPending}
              />
              <p className="text-muted-foreground text-xs">
                Enter without http:// or https://
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={addDomainMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addDomainMutation.isPending || !domain}
            >
              {addDomainMutation.isPending ? "Adding..." : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
