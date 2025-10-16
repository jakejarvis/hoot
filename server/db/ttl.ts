export function addSeconds(base: Date, seconds: number): Date {
  return new Date(base.getTime() + seconds * 1000);
}

export function clampFuture(min: Date, max: Date): Date {
  return new Date(
    Math.min(Math.max(min.getTime(), Date.now() + 60_000), max.getTime()),
  );
}

export function ttlForRegistration(
  now: Date,
  isRegistered: boolean,
  expirationDate?: Date | null,
): Date {
  if (expirationDate) {
    const msUntil = expirationDate.getTime() - now.getTime();
    if (msUntil <= 7 * 24 * 60 * 60 * 1000) {
      // Revalidate more aggressively near expiry
      return addSeconds(now, 60 * 60); // 1h
    }
  }
  return addSeconds(now, isRegistered ? 24 * 60 * 60 : 6 * 60 * 60);
}

export function ttlForDnsRecord(now: Date, ttlSeconds?: number | null): Date {
  const ttl =
    typeof ttlSeconds === "number" && ttlSeconds > 0
      ? Math.min(ttlSeconds, 24 * 60 * 60)
      : 60 * 60;
  return addSeconds(now, ttl);
}

export function ttlForCertificates(now: Date, validTo: Date): Date {
  const window = addSeconds(now, 24 * 60 * 60);
  const revalidateBefore = new Date(validTo.getTime() - 48 * 60 * 60 * 1000);
  return clampFuture(
    addSeconds(now, 60 * 60),
    new Date(Math.min(window.getTime(), revalidateBefore.getTime())),
  );
}

export function ttlForHeaders(now: Date): Date {
  return addSeconds(now, 12 * 60 * 60);
}

export function ttlForHosting(now: Date): Date {
  return addSeconds(now, 24 * 60 * 60);
}

export function ttlForSeo(now: Date): Date {
  return addSeconds(now, 24 * 60 * 60);
}
