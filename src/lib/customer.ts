import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const CUSTOMER_COOKIE = "customer_session";
export const CUSTOMER_OAUTH_COOKIE = "customer_oauth";

const CUSTOMER_MAX_AGE = 60 * 60 * 24 * 180;

function secret() {
  return process.env.AUTH_SECRET ?? "dev-guest-secret";
}

function sign(value: string) {
  const sig = createHmac("sha256", secret()).update(value).digest("hex");
  return `${value}.${sig}`;
}

function verifySigned(value: string | undefined) {
  if (!value) return null;
  const split = value.lastIndexOf(".");
  if (split <= 0) return null;
  const token = value.slice(0, split);
  const sig = value.slice(split + 1);
  const expected = createHmac("sha256", secret()).update(token).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return token;
}

function envValue(name: string) {
  return (process.env[name] ?? "").trim().replace(/^["']|["']$/g, "");
}

export function googleClientId() {
  return envValue("GOOGLE_CLIENT_ID");
}

export function googleClientSecret() {
  return envValue("GOOGLE_CLIENT_SECRET");
}

export function appUrl(request?: Request) {
  const fromEnv = (
    envValue("AUTH_URL") ||
    envValue("NEXT_PUBLIC_APP_URL")
  ).replace(/\/$/, "");
  let url = fromEnv;
  if (!url || /localhost|127\.0\.0\.1/.test(url)) {
    const host = request
      ? request.headers.get("x-forwarded-host") || request.headers.get("host")
      : null;
    if (host && !/localhost|127\.0\.0\.1/.test(host)) {
      url = `https://${host}`;
    } else if (process.env.NODE_ENV === "production") {
      url = "https://masaqr.net";
    }
  }
  if (!url) url = "http://localhost:3000";
  url = url.replace(/\/$/, "");
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    url = url.replace(/^http:\/\//, "https://");
  }
  return url;
}

export function isGoogleAuthConfigured() {
  return Boolean(googleClientId() && googleClientSecret());
}

export function googleCallbackUrl(request?: Request) {
  return `${appUrl(request)}/api/guest/auth/google/callback`;
}

export function publicUrl(path: string, request?: Request) {
  return new URL(path, `${appUrl(request)}/`).toString();
}

export function customerCookieOptions(maxAge = CUSTOMER_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: appUrl().startsWith("https://"),
  };
}

export function signedCustomerCookie(customerId: string) {
  return sign(customerId);
}

export function verifySignedCustomerId(value: string | undefined) {
  return verifySigned(value);
}

export async function getCustomerFromCookie() {
  const store = await cookies();
  const customerId = verifySignedCustomerId(store.get(CUSTOMER_COOKIE)?.value);
  if (!customerId) return null;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer || customer.deletedAt) return null;
  return customer;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  name?: string | null;
};

export async function upsertCustomerFromGoogle(profile: GoogleProfile) {
  const email = profile.email.trim().toLowerCase();
  const name = profile.name?.trim() || email.split("@")[0] || "Misafir";
  const existing = await prisma.customer.findFirst({
    where: {
      deletedAt: null,
      OR: [{ googleSub: profile.sub }, { email }],
    },
  });
  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        googleSub: profile.sub,
        email,
        name: existing.name?.trim() || name,
      },
    });
  }
  return prisma.customer.create({
    data: {
      email,
      name,
      googleSub: profile.sub,
    },
  });
}

export async function attachCustomerToGuest<
  T extends { id: string; customerId: string | null; nickname: string | null },
>(
  guest: T,
  venueId: string,
  options?: {
    explicit?: boolean;
    customer?: { id: string; name: string | null };
  },
) {
  const customer = options?.customer ?? (await getCustomerFromCookie());
  if (!customer) return guest;

  const member = await prisma.venueMember.findUnique({
    where: {
      venueId_customerId: { venueId, customerId: customer.id },
    },
  });
  if (member?.unlinkedAt && !options?.explicit) {
    return guest;
  }

  if (!member) {
    await prisma.venueMember.create({
      data: { venueId, customerId: customer.id },
    });
  } else if (member.unlinkedAt && options?.explicit) {
    await prisma.venueMember.update({
      where: { id: member.id },
      data: { unlinkedAt: null, joinedAt: new Date() },
    });
  }

  const nextName = guest.nickname?.trim() || customer.name?.trim() || null;
  if (guest.customerId === customer.id && guest.nickname === nextName) {
    return guest;
  }
  return prisma.guest.update({
    where: { id: guest.id },
    data: {
      customerId: customer.id,
      nickname: nextName,
    },
  });
}

export function createOAuthState(qrToken: string) {
  const nonce = randomBytes(16).toString("hex");
  const payload = Buffer.from(
    JSON.stringify({
      qr: qrToken,
      n: nonce,
      exp: Date.now() + 10 * 60 * 1000,
    }),
  ).toString("base64url");
  return { state: sign(payload), nonce };
}

export function readOAuthState(state: string | undefined) {
  const payload = verifySigned(state);
  if (!payload) return null;
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { qr?: string; n?: string; exp?: number };
    if (!data.qr || !data.n || !data.exp || data.exp < Date.now()) return null;
    return { qr: data.qr, nonce: data.n };
  } catch {
    return null;
  }
}

export async function deleteCustomerAccount(customerId: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.venueMember.updateMany({
      where: { customerId, unlinkedAt: null },
      data: { unlinkedAt: now },
    }),
    prisma.guest.updateMany({
      where: { customerId },
      data: { customerId: null },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: {
        deletedAt: now,
        googleSub: null,
        name: null,
        email: `deleted-${customerId}.${now.getTime()}@invalid`,
      },
    }),
  ]);
}
