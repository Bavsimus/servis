import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./env";

/** Route handler ve server component'ler için oturum çerezli istemci */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // server component içinden çağrıldıysa çerez yazılamaz; middleware yeniler
        }
      },
    },
  });
}
