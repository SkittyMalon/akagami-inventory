import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import type { Product } from "./products";

/** Etiqueta de caché del catálogo público. */
export const CATALOG_TAG = "catalog";

/**
 * Productos visibles en el catálogo.
 *
 * Va en caché del servidor, así que se prerenderiza dentro del shell estático
 * en vez de consultarse en cada visita. Se refresca cuando el panel de
 * administración llama a `revalidateCatalog()`, y como mucho una vez por hora
 * si alguien edita la tabla directamente en Supabase.
 */
export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  // Cliente sin cookies: el catálogo es público y no depende de la sesión,
  // que es lo que permite cachearlo en el servidor.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("name");

  // Lanzamos en vez de devolver un estado de error: así el fallo no se guarda
  // en caché y la siguiente petición vuelve a intentarlo.
  if (error) {
    throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  }

  return (data ?? []) as Product[];
}
