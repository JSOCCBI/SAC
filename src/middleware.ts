import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/privacy"];
  const isPublic = publicRoutes.some(r => pathname.startsWith(r));

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // SAC is for active managers only — checked on the server for every page, not just at the login form
  if (session && !isPublic) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, active")
      .eq("id", session.user.id)
      .single();

    if (profile?.role !== "manager" || profile?.active === false) {
      const reason = profile?.active === false ? "deactivated" : "no_access";
      const redirectResponse = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));
      request.cookies.getAll()
        .filter(c => c.name.startsWith("sb-"))
        .forEach(c => redirectResponse.cookies.set(c.name, "", { maxAge: 0, path: "/" }));
      return redirectResponse;
    }
  }

  // A signed-in user opening a reset link must still reach the reset page
  if (session && isPublic && !pathname.startsWith("/reset-password") && !pathname.startsWith("/privacy")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
