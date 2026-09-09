import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isAuthTokenValid } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/manifest.json"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/s/")) return true;
  if (pathname.startsWith("/icons/")) return true;
  return false;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!isAuthTokenValid(token)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
