"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ACTIVE_VENUE_COOKIE, homeForRole } from "@/lib/tenant";

export async function loginAction(_prev: { error?: string }, formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "E-posta veya şifre hatalı" };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { error: "E-posta veya şifre hatalı" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-posta veya şifre hatalı" };
    }
    throw error;
  }

  const store = await cookies();
  store.delete(ACTIVE_VENUE_COOKIE);
  redirect(homeForRole(user.role));
}
