"use server";

import { updateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";

/**
 * Vacía la caché del catálogo tras un cambio en el panel de administración,
 * para que la siguiente visita a "/" vea los productos actualizados.
 */
export async function revalidateCatalog() {
  updateTag(CATALOG_TAG);
}
