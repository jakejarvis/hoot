# User Accounts Implementation Plan for Domainstack

## Executive Summary

This plan outlines the implementation of user accounts in Domainstack to enable:
- Domain ownership verification
- Expiration notifications (registry, certificates)
- Change notifications (nameservers, resolution, certificates)
- User-specific monitoring dashboards

**Recommended Auth Provider:** Better Auth
**Email Provider:** Resend (already specified)
**Estimated Timeline:** 3-4 weeks for MVP

---

## 1. Authentication Provider Analysis

### Clerk vs Better Auth Comparison

#### Clerk
**Pros:**
- Drop-in components with excellent UX
- Managed infrastructure (no backend code needed)
- Built-in user management dashboard
- SOC 2 compliant
- Webhooks for user events
- Multi-factor auth out of the box

**Cons:**
- **Cost:** Free tier: 10,000 MAUs, then $25/mo + $0.02/MAU (could add up quickly for a public tool)
- **Vendor lock-in:** Difficult to migrate away later
- **Less control:** Customization requires their SDK patterns
- **External dependency:** Service downtime affects your auth
- **Data residency:** User data stored externally
- **Not self-hostable**

#### Better Auth (Recommended) ✅
**Pros:**
- **Cost:** Free, open source (just infrastructure costs)
- **Full control:** Own your user data in your Postgres DB
- **Already in stack:** Uses Drizzle ORM (already using)
- **Type-safe:** Full TypeScript support with Zod schemas
- **Flexible:** Easy to customize flows and add fields
- **Modern:** Built for Next.js App Router with React Server Components
- **Privacy:** All data stays in your infrastructure
- **Active development:** Growing community, good documentation
- **Email/password + OAuth:** Supports both flows
- **Session management:** Built-in with PostgreSQL

**Cons:**
- More initial setup required (but better long-term)
- You manage security updates (but you control the timeline)
- Need to implement UI components (but you already have shadcn/radix)

### Recommendation: Better Auth

**Rationale:**
1. **Cost-effective:** No per-user pricing as you scale
2. **Data sovereignty:** Critical for a security/privacy-focused tool
3. **Stack alignment:** Already using Postgres + Drizzle + Next.js
4. **Flexibility:** Easy to add custom fields for domain verification
5. **Long-term viability:** No vendor lock-in, full control

---

## 2. Database Schema Design

### New Tables Required

```sql
-- Users table (managed by Better Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Sessions table (managed by Better Auth)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Accounts table (for OAuth providers, managed by Better Auth)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(provider, provider_account_id)
);

-- Email verification tokens
CREATE TABLE verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User-owned domains (domain monitoring)
CREATE TABLE user_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  is_verified BOOLEAN DEFAULT FALSE NOT NULL,
  verification_method TEXT, -- 'dns', 'meta-tag', 'file'
  verification_token TEXT UNIQUE,
  verification_record TEXT, -- The expected TXT record or file content
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, domain_id)
);

CREATE INDEX idx_user_domains_user_id ON user_domains(user_id);
CREATE INDEX idx_user_domains_domain_id ON user_domains(domain_id);
CREATE INDEX idx_user_domains_verified ON user_domains(is_verified);

-- User notification preferences
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Expiration notifications
  notify_registration_expiring BOOLEAN DEFAULT TRUE NOT NULL,
  notify_certificate_expiring BOOLEAN DEFAULT TRUE NOT NULL,
  registration_expiry_days INTEGER[] DEFAULT ARRAY[30, 14, 7, 1] NOT NULL, -- Days before expiration
  certificate_expiry_days INTEGER[] DEFAULT ARRAY[30, 14, 7, 1] NOT NULL,
  
  -- Change notifications
  notify_nameserver_change BOOLEAN DEFAULT TRUE NOT NULL,
  notify_certificate_change BOOLEAN DEFAULT TRUE NOT NULL,
  notify_dns_change BOOLEAN DEFAULT FALSE NOT NULL, -- Opt-in (can be noisy)
  notify_hosting_change BOOLEAN DEFAULT TRUE NOT NULL,
  notify_resolution_failure BOOLEAN DEFAULT TRUE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Notification log (for rate limiting and history)
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'registration_expiring', 'cert_expiring', 'nameserver_changed', etc.
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  email_id TEXT, -- Resend email ID for tracking
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX idx_notification_log_domain_id ON notification_log(domain_id);
CREATE INDEX idx_notification_log_sent_at ON notification_log(sent_at);
CREATE INDEX idx_notification_log_type ON notification_log(notification_type);

-- Domain snapshots for change detection
CREATE TABLE domain_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL, -- 'registration', 'certificate', 'dns', 'hosting'
  snapshot_data JSONB NOT NULL, -- The actual snapshot data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_domain_snapshots_domain_id ON domain_snapshots(domain_id);
CREATE INDEX idx_domain_snapshots_type ON domain_snapshots(snapshot_type);
CREATE INDEX idx_domain_snapshots_created_at ON domain_snapshots(created_at);
```

---

## 3. Authentication Implementation

### 3.1 Better Auth Setup

**Installation:**
```bash
pnpm add better-auth
pnpm add -D @better-auth/cli
```

**Configuration file:** `lib/auth/config.ts`
```typescript
import { betterAuth } from "better-auth";
import { db } from "@/lib/db/client";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // Use Resend to send email
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        template: "email-verification",
        data: { verificationUrl: url },
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
});
```

### 3.2 API Routes

**File:** `app/api/auth/[...all]/route.ts`
```typescript
import { auth } from "@/lib/auth/config";

export const { GET, POST } = auth.handler;
```

### 3.3 Client Setup

**File:** `lib/auth/client.ts`
```typescript
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

### 3.4 Server-Side Auth Helpers

**File:** `lib/auth/server.ts`
```typescript
import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth/config";
import type { Session, User } from "better-auth/types";

export async function getSession(): Promise<{
  session: Session | null;
  user: User | null;
}> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("better-auth.session_token")?.value;

  if (!sessionToken) {
    return { session: null, user: null };
  }

  return auth.api.getSession({ token: sessionToken });
}

export async function requireAuth() {
  const { user } = await getSession();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
```

### 3.5 Middleware Protection

**Update:** `middleware.ts`
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/settings", "/domains/verify"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = protectedPaths.some((prefix) => path.startsWith(prefix));

  if (isProtected) {
    const sessionToken = request.cookies.get("better-auth.session_token")?.value;
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## 4. UI Components

### 4.1 Auth Forms (using existing shadcn components)

**Files to create:**
- `components/auth/login-form.tsx`
- `components/auth/register-form.tsx`
- `components/auth/forgot-password-form.tsx`
- `components/auth/reset-password-form.tsx`
- `components/auth/social-login-buttons.tsx`

**Example:** `components/auth/login-form.tsx`
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await authClient.signIn.email({ email, password });
      toast.success("Signed in successfully!");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
```

### 4.2 User Menu Component

**File:** `components/auth/user-menu.tsx`
```typescript
"use client";

import { useSession } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage src={session.user.image} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {session.user.name}
          <div className="text-xs text-muted-foreground">
            {session.user.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/dashboard">Dashboard</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings">Settings</a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => authClient.signOut()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 4.3 Update Header

**Update:** `components/app-header.tsx` to include user menu or login/signup buttons

---

## 5. Domain Verification System

### 5.1 Verification Methods

Offer three verification methods:

1. **DNS TXT Record** (Recommended)
   - Add TXT record: `domainstack-verify=<token>`
   - Check via DNS resolution service

2. **Meta Tag**
   - Add to homepage: `<meta name="domainstack-verify" content="<token>">`
   - Check via SEO service

3. **HTML File**
   - Upload file to: `/.well-known/domainstack-verify.txt`
   - Check via HTTP request

### 5.2 Verification Flow

**tRPC Procedure:** `server/routers/domains.ts`
```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const domainsRouter = createTRPCRouter({
  add: protectedProcedure
    .input(z.object({ domain: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const domain = normalizeDomain(input.domain);
      
      // Create domain if doesn't exist
      const domainRecord = await upsertDomain({
        name: domain,
        tld: getDomainTld(domain) ?? "",
        unicodeName: input.domain,
      });
      
      // Generate verification token
      const token = generateSecureToken();
      
      // Create user_domain record
      await db.insert(userDomains).values({
        userId,
        domainId: domainRecord.id,
        verificationToken: token,
        verificationRecord: `domainstack-verify=${token}`,
        isVerified: false,
      });
      
      return { token, domain };
    }),
  
  verify: protectedProcedure
    .input(z.object({
      domainId: z.string().uuid(),
      method: z.enum(["dns", "meta-tag", "file"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      
      // Get user_domain record
      const userDomain = await db
        .select()
        .from(userDomains)
        .where(
          and(
            eq(userDomains.userId, userId),
            eq(userDomains.domainId, input.domainId)
          )
        )
        .limit(1);
      
      if (!userDomain[0]) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      
      const { domain } = await db
        .select()
        .from(domains)
        .where(eq(domains.id, input.domainId))
        .limit(1)
        .then(r => r[0]);
      
      const expectedToken = userDomain[0].verificationToken;
      let verified = false;
      
      // Verify based on method
      switch (input.method) {
        case "dns":
          verified = await verifyDnsTxt(domain, expectedToken);
          break;
        case "meta-tag":
          verified = await verifyMetaTag(domain, expectedToken);
          break;
        case "file":
          verified = await verifyFile(domain, expectedToken);
          break;
      }
      
      if (verified) {
        await db
          .update(userDomains)
          .set({
            isVerified: true,
            verificationMethod: input.method,
            verifiedAt: new Date(),
          })
          .where(eq(userDomains.id, userDomain[0].id));
      }
      
      return { verified };
    }),
});
```

### 5.3 Verification Helpers

**File:** `server/services/domain-verification.ts`
```typescript
import "server-only";
import { resolveAll } from "./dns";
import { getSeo } from "./seo";

export async function verifyDnsTxt(
  domain: string,
  expectedToken: string
): Promise<boolean> {
  try {
    const dns = await resolveAll(domain);
    const txtRecords = dns.records.filter((r) => r.type === "TXT");
    
    return txtRecords.some((record) =>
      record.value === `domainstack-verify=${expectedToken}`
    );
  } catch {
    return false;
  }
}

export async function verifyMetaTag(
  domain: string,
  expectedToken: string
): Promise<boolean> {
  try {
    const seo = await getSeo(domain);
    const metaTags = seo.metaGeneral;
    
    // Check for verification meta tag
    return metaTags.some((tag) =>
      tag.name === "domainstack-verify" &&
      tag.content === expectedToken
    );
  } catch {
    return false;
  }
}

export async function verifyFile(
  domain: string,
  expectedToken: string
): Promise<boolean> {
  try {
    const url = `https://${domain}/.well-known/domainstack-verify.txt`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    
    if (!response.ok) return false;
    
    const content = await response.text();
    return content.trim() === expectedToken;
  } catch {
    return false;
  }
}
```

---

## 6. Notification System

### 6.1 Resend Integration

**File:** `lib/email/client.ts`
```typescript
import "server-only";
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export async function sendEmail(params: EmailTemplate): Promise<string> {
  const { to, subject, template, data } = params;
  
  // Load email template (create React Email templates)
  const html = await renderEmailTemplate(template, data);
  
  const { id } = await resend.emails.send({
    from: "Domainstack <notifications@domainstack.io>",
    to,
    subject,
    html,
  });
  
  return id;
}
```

### 6.2 Email Templates (using React Email)

**Installation:**
```bash
pnpm add react-email @react-email/components
```

**File structure:**
```
emails/
  - registration-expiring.tsx
  - certificate-expiring.tsx
  - nameserver-changed.tsx
  - certificate-changed.tsx
  - resolution-failure.tsx
```

**Example:** `emails/registration-expiring.tsx`
```typescript
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

interface Props {
  domain: string;
  expirationDate: string;
  daysUntilExpiration: number;
}

export default function RegistrationExpiringEmail({
  domain,
  expirationDate,
  daysUntilExpiration,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>
        {domain} expires in {daysUntilExpiration} days
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Domain Expiring Soon</Heading>
          <Text style={text}>
            Your domain <strong>{domain}</strong> will expire in{" "}
            <strong>{daysUntilExpiration} days</strong> on {expirationDate}.
          </Text>
          <Text style={text}>
            Make sure to renew it with your registrar to avoid losing access.
          </Text>
          <Link href={`https://domainstack.io/${domain}`} style={button}>
            View Domain Details
          </Link>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "system-ui, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const h1 = {
  color: "#000",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.25",
  margin: "16px 0",
};

const text = {
  color: "#000",
  fontSize: "14px",
  lineHeight: "24px",
};

const button = {
  backgroundColor: "#000",
  borderRadius: "6px",
  color: "#fff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "500",
  lineHeight: "20px",
  padding: "12px 20px",
  textDecoration: "none",
};
```

### 6.3 Notification Triggers (Inngest Functions)

**File:** `lib/inngest/functions/check-expirations.ts`
```typescript
import "server-only";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db/client";
import { and, eq, gte, lte } from "drizzle-orm";
import { sendEmail } from "@/lib/email/client";

export const checkExpirations = inngest.createFunction(
  { id: "check-expirations" },
  { cron: "0 9 * * *" }, // Daily at 9 AM UTC
  async ({ step, logger }) => {
    // Check registration expirations
    await step.run("check-registration-expirations", async () => {
      const now = new Date();
      
      // Get all verified user domains
      const userDomainsList = await db
        .select()
        .from(userDomains)
        .where(eq(userDomains.isVerified, true));
      
      for (const userDomain of userDomainsList) {
        // Get user preferences
        const prefs = await db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, userDomain.userId))
          .limit(1);
        
        const preferences = prefs[0];
        if (!preferences?.notifyRegistrationExpiring || !preferences.emailEnabled) {
          continue;
        }
        
        // Get registration data
        const reg = await db
          .select()
          .from(registrations)
          .where(eq(registrations.domainId, userDomain.domainId))
          .limit(1);
        
        const registration = reg[0];
        if (!registration?.expirationDate) continue;
        
        const daysUntil = Math.floor(
          (registration.expirationDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
        );
        
        // Check if we should notify
        if (preferences.registrationExpiryDays.includes(daysUntil)) {
          // Check if we already sent this notification
          const recentNotifs = await db
            .select()
            .from(notificationLog)
            .where(
              and(
                eq(notificationLog.userId, userDomain.userId),
                eq(notificationLog.domainId, userDomain.domainId),
                eq(notificationLog.notificationType, "registration_expiring"),
                gte(notificationLog.sentAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))
              )
            );
          
          if (recentNotifs.length > 0) continue;
          
          // Get user email
          const user = await db
            .select()
            .from(users)
            .where(eq(users.id, userDomain.userId))
            .limit(1);
          
          if (!user[0]?.email) continue;
          
          // Get domain name
          const domain = await db
            .select()
            .from(domains)
            .where(eq(domains.id, userDomain.domainId))
            .limit(1);
          
          // Send email
          const emailId = await sendEmail({
            to: user[0].email,
            subject: `${domain[0].name} expires in ${daysUntil} days`,
            template: "registration-expiring",
            data: {
              domain: domain[0].name,
              expirationDate: registration.expirationDate.toLocaleDateString(),
              daysUntilExpiration: daysUntil,
            },
          });
          
          // Log notification
          await db.insert(notificationLog).values({
            userId: userDomain.userId,
            domainId: userDomain.domainId,
            notificationType: "registration_expiring",
            emailId,
            metadata: { daysUntil },
          });
          
          logger.info("Sent registration expiration notification", {
            domain: domain[0].name,
            daysUntil,
          });
        }
      }
    });
    
    // Similar logic for certificate expirations
    await step.run("check-certificate-expirations", async () => {
      // Implementation similar to above but for certificates
    });
  }
);
```

### 6.4 Change Detection (Inngest Functions)

**File:** `lib/inngest/functions/detect-changes.ts`
```typescript
import "server-only";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email/client";

/**
 * Hook into existing section revalidation to detect changes.
 * Called after each successful revalidation.
 */
export const detectDomainChanges = inngest.createFunction(
  { id: "detect-domain-changes" },
  { event: "section/revalidated" }, // New event emitted after revalidation
  async ({ event, step, logger }) => {
    const { domain, section } = event.data;
    
    await step.run("detect-changes", async () => {
      // Get all users monitoring this domain
      const domainRecord = await db
        .select()
        .from(domains)
        .where(eq(domains.name, domain))
        .limit(1);
      
      if (!domainRecord[0]) return;
      
      const userDomainsList = await db
        .select()
        .from(userDomains)
        .where(
          and(
            eq(userDomains.domainId, domainRecord[0].id),
            eq(userDomains.isVerified, true)
          )
        );
      
      if (userDomainsList.length === 0) return;
      
      // Get previous snapshot
      const previousSnapshot = await db
        .select()
        .from(domainSnapshots)
        .where(
          and(
            eq(domainSnapshots.domainId, domainRecord[0].id),
            eq(domainSnapshots.snapshotType, section)
          )
        )
        .orderBy(desc(domainSnapshots.createdAt))
        .limit(1);
      
      // Get current data
      let currentData: any;
      switch (section) {
        case "registration":
          currentData = await db
            .select()
            .from(registrations)
            .where(eq(registrations.domainId, domainRecord[0].id))
            .limit(1)
            .then(r => r[0]);
          break;
        case "certificates":
          currentData = await db
            .select()
            .from(certificates)
            .where(eq(certificates.domainId, domainRecord[0].id))
            .limit(1)
            .then(r => r[0]);
          break;
        // Add other sections...
      }
      
      if (!currentData) return;
      
      // Compare with previous snapshot
      if (previousSnapshot[0]) {
        const changes = detectChanges(
          section,
          previousSnapshot[0].snapshotData,
          currentData
        );
        
        if (changes.length > 0) {
          // Notify all users monitoring this domain
          for (const userDomain of userDomainsList) {
            await notifyUserOfChanges(
              userDomain.userId,
              domainRecord[0].id,
              domain,
              section,
              changes
            );
          }
        }
      }
      
      // Save new snapshot
      await db.insert(domainSnapshots).values({
        domainId: domainRecord[0].id,
        snapshotType: section,
        snapshotData: currentData,
      });
    });
  }
);

function detectChanges(
  section: Section,
  previous: any,
  current: any
): Array<{ field: string; old: any; new: any }> {
  const changes: Array<{ field: string; old: any; new: any }> = [];
  
  if (section === "registration") {
    // Detect nameserver changes
    if (
      JSON.stringify(previous.nameservers) !==
      JSON.stringify(current.nameservers)
    ) {
      changes.push({
        field: "nameservers",
        old: previous.nameservers,
        new: current.nameservers,
      });
    }
    // Add other field comparisons...
  }
  
  // Add detection logic for other sections...
  
  return changes;
}

async function notifyUserOfChanges(
  userId: string,
  domainId: string,
  domainName: string,
  section: Section,
  changes: Array<{ field: string; old: any; new: any }>
): Promise<void> {
  // Check user preferences
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  
  const preferences = prefs[0];
  if (!preferences?.emailEnabled) return;
  
  // Check if user wants this type of notification
  const wantsNotification = 
    (section === "registration" && changes.some(c => c.field === "nameservers") && preferences.notifyNameserverChange) ||
    (section === "certificates" && preferences.notifyCertificateChange);
  
  if (!wantsNotification) return;
  
  // Check rate limiting (don't spam users)
  const recentNotifs = await db
    .select()
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.domainId, domainId),
        gte(notificationLog.sentAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
      )
    );
  
  if (recentNotifs.length > 5) return; // Max 5 notifications per domain per day
  
  // Get user email
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (!user[0]?.email) return;
  
  // Send notification email
  const emailId = await sendEmail({
    to: user[0].email,
    subject: `Changes detected for ${domainName}`,
    template: getTemplateForSection(section),
    data: {
      domain: domainName,
      changes,
    },
  });
  
  // Log notification
  await db.insert(notificationLog).values({
    userId,
    domainId,
    notificationType: `${section}_changed`,
    emailId,
    metadata: { changes },
  });
}
```

---

## 7. User Dashboard

### 7.1 Dashboard Page

**File:** `app/dashboard/page.tsx`
```typescript
import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { DomainList } from "@/components/dashboard/domain-list";
import { AddDomainButton } from "@/components/dashboard/add-domain-button";

export default async function DashboardPage() {
  const user = await requireAuth();
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Domains</h1>
        <AddDomainButton />
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <DomainList userId={user.id} />
      </Suspense>
    </div>
  );
}
```

### 7.2 Domain List Component

**File:** `components/dashboard/domain-list.tsx`
```typescript
import { db } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";
import { DomainCard } from "./domain-card";

interface Props {
  userId: string;
}

export async function DomainList({ userId }: Props) {
  const userDomainsList = await db
    .select({
      userDomain: userDomains,
      domain: domains,
      registration: registrations,
      certificate: certificates,
    })
    .from(userDomains)
    .leftJoin(domains, eq(userDomains.domainId, domains.id))
    .leftJoin(registrations, eq(domains.id, registrations.domainId))
    .leftJoin(certificates, eq(domains.id, certificates.domainId))
    .where(eq(userDomains.userId, userId))
    .orderBy(desc(userDomains.createdAt));
  
  if (userDomainsList.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No domains yet. Add your first domain to start monitoring.
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {userDomainsList.map((item) => (
        <DomainCard
          key={item.userDomain.id}
          userDomain={item.userDomain}
          domain={item.domain}
          registration={item.registration}
          certificate={item.certificate}
        />
      ))}
    </div>
  );
}
```

### 7.3 Domain Card Component

**File:** `components/dashboard/domain-card.tsx`
```typescript
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export function DomainCard({ userDomain, domain, registration, certificate }) {
  const registrationExpiring = registration?.expirationDate &&
    (registration.expirationDate.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
  
  const certExpiring = certificate?.validTo &&
    (certificate.validTo.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
  
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold">{domain.name}</h3>
        {userDomain.isVerified ? (
          <Badge variant="success">Verified</Badge>
        ) : (
          <Badge variant="warning">Pending</Badge>
        )}
      </div>
      
      <div className="space-y-2 text-sm">
        {registration?.expirationDate && (
          <div>
            <span className="text-muted-foreground">Expires: </span>
            <span className={registrationExpiring ? "text-red-600" : ""}>
              {formatDistanceToNow(registration.expirationDate, { addSuffix: true })}
            </span>
          </div>
        )}
        
        {certificate?.validTo && (
          <div>
            <span className="text-muted-foreground">Cert expires: </span>
            <span className={certExpiring ? "text-red-600" : ""}>
              {formatDistanceToNow(certificate.validTo, { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={`/${domain.name}`}>View Details</a>
        </Button>
        {!userDomain.isVerified && (
          <Button size="sm" asChild>
            <a href={`/domains/verify/${domain.id}`}>Verify</a>
          </Button>
        )}
      </div>
    </Card>
  );
}
```

---

## 8. Settings Page

### 8.1 Notification Preferences

**File:** `app/settings/notifications/page.tsx`
```typescript
import { requireAuth } from "@/lib/auth/server";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";

export default async function NotificationSettingsPage() {
  const user = await requireAuth();
  
  return (
    <div className="container max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Notification Settings</h1>
      <NotificationSettingsForm userId={user.id} />
    </div>
  );
}
```

**File:** `components/settings/notification-settings-form.tsx`
```typescript
"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/trpc/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function NotificationSettingsForm({ userId }: { userId: string }) {
  const { data: preferences, isLoading } = trpc.user.getNotificationPreferences.useQuery();
  const updateMutation = trpc.user.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      toast.success("Settings saved!");
    },
  });
  
  const [settings, setSettings] = useState(preferences);
  
  useEffect(() => {
    if (preferences) {
      setSettings(preferences);
    }
  }, [preferences]);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        updateMutation.mutate(settings);
      }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-enabled">Enable email notifications</Label>
          <Switch
            id="email-enabled"
            checked={settings.emailEnabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, emailEnabled: checked })
            }
          />
        </div>
        
        <div className="pl-6 space-y-4 border-l-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="registration-expiring">
              Domain expiration alerts
            </Label>
            <Switch
              id="registration-expiring"
              checked={settings.notifyRegistrationExpiring}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, notifyRegistrationExpiring: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="certificate-expiring">
              Certificate expiration alerts
            </Label>
            <Switch
              id="certificate-expiring"
              checked={settings.notifyCertificateExpiring}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, notifyCertificateExpiring: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="nameserver-change">Nameserver change alerts</Label>
            <Switch
              id="nameserver-change"
              checked={settings.notifyNameserverChange}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, notifyNameserverChange: checked })
              }
            />
          </div>
          
          {/* Add more notification preferences */}
        </div>
      </div>
      
      <Button type="submit" disabled={updateMutation.isPending}>
        Save Settings
      </Button>
    </form>
  );
}
```

---

## 9. tRPC Procedures

### 9.1 Protected Procedure

**Update:** `trpc/init.ts`
```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import { getSession } from "@/lib/auth/server";
import superjson from "superjson";

export async function createContext() {
  const { user, session } = await getSession();
  return { user, session };
}

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      user: ctx.user,
      session: ctx.session,
    },
  });
});
```

### 9.2 User Router

**File:** `server/routers/user.ts`
```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";

export const userRouter = createTRPCRouter({
  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);
    
    return prefs[0] || {
      emailEnabled: true,
      notifyRegistrationExpiring: true,
      notifyCertificateExpiring: true,
      registrationExpiryDays: [30, 14, 7, 1],
      certificateExpiryDays: [30, 14, 7, 1],
      notifyNameserverChange: true,
      notifyCertificateChange: true,
      notifyDnsChange: false,
      notifyHostingChange: true,
      notifyResolutionFailure: true,
    };
  }),
  
  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        emailEnabled: z.boolean(),
        notifyRegistrationExpiring: z.boolean(),
        notifyCertificateExpiring: z.boolean(),
        notifyNameserverChange: z.boolean(),
        notifyCertificateChange: z.boolean(),
        notifyDnsChange: z.boolean(),
        notifyHostingChange: z.boolean(),
        notifyResolutionFailure: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .insert(notificationPreferences)
        .values({
          userId: ctx.user.id,
          ...input,
        })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: input,
        });
      
      return { success: true };
    }),
});
```

---

## 10. Environment Variables

**Add to `.env.example`:**
```bash
# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# OAuth Providers (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=notifications@domainstack.io
```

---

## 11. Implementation Phases

### Phase 1: Authentication Foundation (Week 1)
- [ ] Install Better Auth and dependencies
- [ ] Create database schema and run migrations
- [ ] Set up Better Auth configuration
- [ ] Create auth API routes
- [ ] Build auth UI components (login, register, password reset)
- [ ] Add user menu to header
- [ ] Implement middleware for protected routes
- [ ] Test authentication flows

### Phase 2: Domain Management (Week 2)
- [ ] Create user_domains schema and migrations
- [ ] Build domain verification system (DNS, meta-tag, file)
- [ ] Create dashboard page with domain list
- [ ] Build "Add Domain" flow
- [ ] Build "Verify Domain" flow
- [ ] Add domain removal functionality
- [ ] Create domain detail pages with ownership badge
- [ ] Test verification methods

### Phase 3: Notification System (Week 3)
- [ ] Set up Resend integration
- [ ] Create email templates with React Email
- [ ] Implement notification preferences schema
- [ ] Build settings page for notification preferences
- [ ] Create Inngest function for expiration checks
- [ ] Create Inngest function for change detection
- [ ] Implement notification log and rate limiting
- [ ] Test email delivery

### Phase 4: Change Detection (Week 4)
- [ ] Implement domain snapshots system
- [ ] Add change detection logic for each section
- [ ] Emit revalidation events after updates
- [ ] Hook change detection into revalidation flow
- [ ] Build change history UI
- [ ] Test change detection accuracy
- [ ] Add notification templates for all change types

### Phase 5: Polish & Launch (Ongoing)
- [ ] Add analytics tracking for auth events
- [ ] Implement user onboarding flow
- [ ] Create help documentation
- [ ] Add domain search from dashboard
- [ ] Implement bulk domain import
- [ ] Add export functionality for domain data
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta testing with select users
- [ ] Public launch

---

## 12. Migration Strategy

Since this adds new features without breaking existing functionality:

1. **Database migrations:** Use Drizzle Kit to generate and apply migrations
2. **Backward compatibility:** All existing public endpoints remain unchanged
3. **Optional features:** Users can continue using Domainstack without an account
4. **Gradual rollout:** 
   - Phase 1: Auth available but not promoted
   - Phase 2: Add "Sign up" CTA to monitor domains
   - Phase 3: Full feature announcement

---

## 13. Testing Strategy

### Unit Tests
- Auth helper functions
- Domain verification logic
- Change detection algorithms
- Email template rendering

### Integration Tests
- Full auth flows (signup, login, password reset)
- Domain verification end-to-end
- Notification triggers
- User dashboard data fetching

### E2E Tests (with Playwright)
- User registration and login
- Domain addition and verification
- Notification settings changes
- Dashboard navigation

---

## 14. Security Considerations

### Authentication
- Use HTTPS only in production
- Implement rate limiting on auth endpoints
- Use secure session tokens (Better Auth handles this)
- Add CAPTCHA on registration (optional, can add later)
- Implement account lockout after failed attempts

### Domain Verification
- Rate limit verification attempts
- Expire verification tokens after 7 days
- Validate domain ownership before notifications
- Prevent spam by limiting domains per user (e.g., 100)

### Email Security
- Use DMARC, SPF, DKIM for Resend domain
- Validate email addresses before sending
- Implement unsubscribe links
- Rate limit notifications per user/domain
- Don't include sensitive data in emails

### Data Privacy
- GDPR compliance: Add data export/deletion
- Clear privacy policy
- Explicit consent for notifications
- Secure password storage (Better Auth handles this)
- Encrypt sensitive data at rest

---

## 15. Monitoring & Observability

### Metrics to Track
- User registrations (daily/weekly/monthly)
- Domain verifications (success rate)
- Notification deliveries (success/failure rates)
- Auth failures and reasons
- User retention (DAU/MAU)
- Most-monitored domains/TLDs

### Alerts
- High auth failure rate
- Email delivery failures
- Database connection issues
- Inngest job failures
- Unusual verification patterns

### Logging
- Use existing Pino logger
- Log auth events (login, registration, password reset)
- Log domain verification attempts
- Log notification sends
- Include user ID in all relevant logs

---

## 16. Documentation Needs

### User Documentation
- How to sign up and verify email
- Domain verification methods guide
- Notification settings explained
- FAQ section
- Troubleshooting guide

### Developer Documentation
- Better Auth setup instructions
- Database schema documentation
- Notification system architecture
- Adding new notification types
- Testing procedures

---

## 17. Cost Analysis

### Better Auth (Free/Open Source)
- **Setup:** Free
- **Running costs:** None (uses your existing Postgres)

### Resend Email
- **Free tier:** 3,000 emails/month, 100 emails/day
- **Paid:** $20/mo for 50,000 emails/month
- **Estimate:** If 1,000 users with 10 domains each = ~10,000 notifications/month (comfortably in free tier initially)

### Database (Neon/Vercel Postgres)
- **Additional storage:** Minimal (~100MB for 10K users)
- **Additional queries:** Notification checks run daily, not expensive

### Total Additional Cost
- **Initial:** $0 (can start with free tiers)
- **At scale (10K active users):** ~$20/mo for Resend

---

## 18. Success Metrics

### Adoption
- Target: 25% of regular users create accounts within 3 months
- Target: 60% of account holders verify at least one domain

### Engagement
- Target: 50% of account holders have active monitoring
- Target: <5% unsubscribe rate from notifications
- Target: 80% open rate on critical notifications (7-day expiry warnings)

### Technical
- Target: <1% email delivery failure rate
- Target: 99.9% auth endpoint uptime
- Target: <500ms average auth check latency

---

## 19. Future Enhancements (Post-MVP)

### Advanced Features
- **Team accounts:** Share domain monitoring with teammates
- **Slack/Discord integrations:** Send notifications to channels
- **Webhooks:** Allow users to set up custom webhooks for events
- **Mobile app:** iOS/Android apps for push notifications
- **2FA:** Add two-factor authentication option
- **API keys:** Let users access their data programmatically
- **Custom notification schedules:** Per-domain notification timing
- **Historical trends:** Show domain metric changes over time
- **Bulk operations:** Verify/manage multiple domains at once
- **Domain groups/tags:** Organize domains by project/client

### Potential Integrations
- Domain registrars (for renewal reminders with affiliate links)
- Certificate authorities (for renewal suggestions)
- Monitoring services (PagerDuty, Opsgenie)
- Project management tools (Linear, Jira)

---

## 20. Implementation Checklist

### Setup
- [ ] Install dependencies (Better Auth, Resend, React Email)
- [ ] Set up environment variables
- [ ] Configure OAuth apps (GitHub, Google)
- [ ] Set up Resend domain and verify DNS

### Database
- [ ] Create schema file for new tables
- [ ] Generate migrations with Drizzle Kit
- [ ] Apply migrations to development database
- [ ] Seed test data for development
- [ ] Update Drizzle Zod schemas

### Authentication
- [ ] Configure Better Auth
- [ ] Create auth API routes
- [ ] Build server-side auth helpers
- [ ] Build client-side auth hooks
- [ ] Create auth UI components
- [ ] Update app header with user menu
- [ ] Add middleware for protected routes

### Domain Verification
- [ ] Create domain verification service
- [ ] Build verification UI components
- [ ] Add tRPC procedures for domain management
- [ ] Create verification method instructions page
- [ ] Implement verification check logic

### Notifications
- [ ] Set up Resend client
- [ ] Create email template components
- [ ] Build email rendering function
- [ ] Create notification preferences schema
- [ ] Build settings page UI
- [ ] Implement Inngest expiration checker
- [ ] Implement Inngest change detector
- [ ] Add notification logging

### Dashboard
- [ ] Create dashboard layout
- [ ] Build domain list component
- [ ] Create domain card component
- [ ] Add "Add Domain" flow
- [ ] Build domain detail page enhancements
- [ ] Add domain removal functionality

### Testing
- [ ] Write unit tests for auth helpers
- [ ] Write tests for verification logic
- [ ] Write tests for change detection
- [ ] Add integration tests for critical flows
- [ ] Manual QA testing

### Documentation
- [ ] Update README with auth setup
- [ ] Create user guide for domain verification
- [ ] Document notification system
- [ ] Add inline code comments
- [ ] Create troubleshooting guide

### Launch
- [ ] Security audit
- [ ] Performance testing
- [ ] Set up monitoring/alerts
- [ ] Beta test with select users
- [ ] Marketing announcement
- [ ] Monitor error rates and user feedback

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding user accounts to Domainstack with:
- **Modern, self-hosted auth** using Better Auth
- **Flexible domain verification** with multiple methods
- **Intelligent notification system** for expirations and changes
- **Clean, user-friendly UI** built on existing design system
- **Scalable architecture** leveraging existing infrastructure

The phased approach allows for iterative development and testing, while the choice of Better Auth provides long-term flexibility and cost savings compared to managed services like Clerk.

**Estimated timeline:** 3-4 weeks for MVP, with 1-2 weeks of polish and testing before public launch.

**Next steps:** 
1. Review and approve this plan
2. Set up development environment (OAuth apps, Resend, etc.)
3. Begin Phase 1 implementation
4. Regular check-ins to review progress and adjust as needed
