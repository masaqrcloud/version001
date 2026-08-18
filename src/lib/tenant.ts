import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";

export const ACTIVE_VENUE_COOKIE = "active_venue";

export const ADMIN_ROLES: Role[] = ["PLATFORM", "OWNER", "ADMIN"];
export const WAITER_ROLES: Role[] = ["PLATFORM", "OWNER", "ADMIN", "WAITER"];
export const KITCHEN_ROLES: Role[] = [
  "PLATFORM",
  "OWNER",
  "ADMIN",
  "WAITER",
  "KITCHEN",
];
export const FLOOR_ROLES: Role[] = [
  "PLATFORM",
  "OWNER",
  "ADMIN",
  "WAITER",
  "KITCHEN",
];

export type StaffUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: Role;
  venueId: string;
  isPlatform: boolean;
};

export function isPlatform(role: Role) {
  return role === "PLATFORM";
}

export async function getStaffUser(roles?: Role[]) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      user: null,
      error: NextResponse.json({ error: "Giriş gerekli" }, { status: 401 }),
    };
  }

  if (session.user.role !== "PLATFORM" && !session.user.venueId) {
    return {
      user: null,
      error: NextResponse.json({ error: "Giriş gerekli" }, { status: 401 }),
    };
  }

  if (roles && !roles.includes(session.user.role)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }),
    };
  }

  const staff: StaffUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    venueId: session.user.venueId ?? "",
    isPlatform: isPlatform(session.user.role),
  };
  const venueId = await resolveVenueId(staff);

  return {
    user: { ...staff, venueId },
    error: null,
  };
}

export async function resolveVenueId(user: StaffUser) {
  if (!user.isPlatform) {
    return user.venueId;
  }

  const store = await cookies();
  const override = store.get(ACTIVE_VENUE_COOKIE)?.value;
  if (override) return override;
  return user.venueId;
}

export function homeForRole(role: Role) {
  if (role === "KITCHEN") return "/staff/kitchen";
  if (role === "WAITER") return "/staff/waiter";
  return "/admin";
}

export function canAccessAdmin(role: Role) {
  return ADMIN_ROLES.includes(role);
}

export function canAccessWaiter(role: Role) {
  return WAITER_ROLES.includes(role);
}

export function canAccessKitchen(role: Role) {
  return KITCHEN_ROLES.includes(role);
}

export function canAccessReports(role: Role) {
  return ADMIN_ROLES.includes(role);
}
