import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";

export async function createClient() {
  // El cliente de Supabase lee valores inestables (Date.now) al construirse,
  // así que se excluye del prerender: solo corre en tiempo de petición.
  await io();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: lo refresca el proxy.
          }
        },
      },
    },
  );
}
