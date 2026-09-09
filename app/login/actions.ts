"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, authCookieOptions, expectedAuthToken, verifyPasscode } from "@/lib/auth";

export async function login(formData: FormData) {
  const passcode = String(formData.get("passcode") ?? "");
  const next = String(formData.get("next") ?? "/sessions");

  if (!verifyPasscode(passcode)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, expectedAuthToken(), authCookieOptions);
  redirect(next || "/sessions");
}
