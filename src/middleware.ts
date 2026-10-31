import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * - panel.alanadi.com/...  ->  /panel/... (aynı Vercel projesi, ikinci alan adı)
 * - Supabase oturumunu yeniler, /panel/* sayfaları giriş ister
 */
export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get("host") ?? "";
  const path = url.pathname;
  const passthrough = ["/panel", "/giris", "/auth", "/sifre"].some((p) => path.startsWith(p));

  let res: NextResponse;
  if (host.startsWith("panel.") && !passthrough) {
    url.pathname = `/panel${path === "/" ? "" : path}`;
    res = NextResponse.rewrite(url);
  } else {
    res = NextResponse.next({ request: req });
  }

  const needsAuth = url.pathname.startsWith("/panel");
  if (!needsAuth && !path.startsWith("/giris")) return res;
  if (!supabaseConfigured()) {
    return needsAuth ? redirect(req, "/giris") : res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (needsAuth && !user) return redirect(req, "/giris", res);
  if (path.startsWith("/giris") && user) return redirect(req, "/panel", res);
  return res;
}

function redirect(req: NextRequest, to: string, carry?: NextResponse) {
  const target = req.nextUrl.clone();
  target.pathname = to;
  target.search = "";
  const res = NextResponse.redirect(target);
  carry?.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|sablonlar/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
