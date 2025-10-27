"use client";

import { Loader2, Mail } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/client";
import { GitHubIcon, GoogleIcon } from "./oauth-provider-icons";

type FormState =
  | { type: "idle" }
  | { type: "submitting-email" }
  | { type: "email-sent"; email: string }
  | { type: "submitting-oauth"; provider: "github" | "google" }
  | { type: "error"; message: string };

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({
  onSuccess,
  redirectTo = "/dashboard",
  className,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({ type: "idle" });
  const [resendCooldown, setResendCooldown] = useState(0);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Focus email input on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError("Email is required");
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) return;

    setState({ type: "submitting-email" });

    try {
      await signIn.magicLink({
        email,
        callbackURL: redirectTo,
      });

      setState({ type: "email-sent", email });
      setResendCooldown(60);
      onSuccess?.();
    } catch (error) {
      setState({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to send magic link. Please try again.",
      });
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || state.type !== "email-sent") return;

    setState({ type: "submitting-email" });

    try {
      await signIn.magicLink({
        email: state.email,
        callbackURL: redirectTo,
      });

      setState({ type: "email-sent", email: state.email });
      setResendCooldown(60);
    } catch (error) {
      setState({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to resend magic link. Please try again.",
      });
    }
  };

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setState({ type: "submitting-oauth", provider });

    try {
      await signIn.social({
        provider,
        callbackURL: redirectTo,
      });
      // OAuth will redirect, so we won't reach here normally
      onSuccess?.();
    } catch (error) {
      setState({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : `Failed to sign in with ${provider}. Please try again.`,
      });
    }
  };

  // Check if OAuth providers are available from environment
  const hasGitHub =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_GITHUB_ENABLED === "true";
  const hasGoogle =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";
  const hasOAuthProviders = hasGitHub || hasGoogle;

  const isSubmitting =
    state.type === "submitting-email" || state.type === "submitting-oauth";

  if (state.type === "email-sent") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={className}
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-success">
              <Mail className="size-6 text-success-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Check your email</h3>
              <p className="text-muted-foreground text-sm">
                We sent a magic link to
              </p>
              <p className="font-medium text-sm">{state.email}</p>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Click the link in the email to sign in. The link will expire in 5
              minutes.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            variant="outline"
            className="w-full"
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend email"}
          </Button>

          <Button
            onClick={() => setState({ type: "idle" })}
            variant="ghost"
            className="w-full"
          >
            Use a different email
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {state.type === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              ref={emailInputRef}
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              disabled={isSubmitting}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
            />
            {emailError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                id="email-error"
                className="text-destructive text-sm"
              >
                {emailError}
              </motion.p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !!emailError}
          >
            {state.type === "submitting-email" ? (
              <>
                <Loader2 className="animate-spin" />
                Sending magic link...
              </>
            ) : (
              <>
                <Mail />
                Continue with email
              </>
            )}
          </Button>
        </form>

        {hasOAuthProviders && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid gap-3">
              {hasGitHub && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn("github")}
                  disabled={isSubmitting}
                  className="w-full bg-[#24292F] text-white hover:bg-[#24292F]/90 dark:bg-[#24292F] dark:text-white dark:hover:bg-[#24292F]/80"
                >
                  {state.type === "submitting-oauth" &&
                  state.provider === "github" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <GitHubIcon className="size-4" />
                      Continue with GitHub
                    </>
                  )}
                </Button>
              )}

              {hasGoogle && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {state.type === "submitting-oauth" &&
                  state.provider === "google" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="size-5" />
                      Continue with Google
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
