export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  stock: number | null;
  image: string | null; // URL completa o nombre de archivo en el bucket "products"
  active: boolean;
};

export const BUCKET = "products";

/** Nombre seguro para Storage (sin acentos, espacios ni símbolos raros). */
export function storageName(name: string) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Convierte el valor de la columna "imagen" en una URL utilizable. */
export function imageUrl(image: string | null): string | null {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(storageName(image))}`;
}

export function formatPrice(price: number | null) {
  if (price == null) return "";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(price);
}
