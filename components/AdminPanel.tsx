"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Link from "next/link";
import { Cats } from "./Cats";
import { createClient } from "@/lib/supabase/client";
import { revalidateCatalog } from "@/app/actions";
import {
  BUCKET,
  formatPrice,
  imageUrl,
  storageName,
  type Product,
} from "@/lib/products";

// Encabezados aceptados en el Excel (sin importar mayúsculas ni acentos)
const COLUMNS: Record<string, string[]> = {
  sku: ["sku", "codigo", "code", "clave", "id"],
  name: ["nombre", "name", "producto", "titulo"],
  description: ["descripcion", "description", "detalle"],
  category: ["categoria", "category", "tipo"],
  price: ["precio", "price", "costo"],
  stock: ["stock", "existencia", "existencias", "cantidad", "inventario"],
  image: ["imagen", "image", "foto", "img"],
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Texto limpio, o null si la celda está vacía. */
function text(v: unknown): string | null {
  const s = String(v).trim();
  return s || null;
}

/**
 * Acepta una URL o un nombre de archivo de imagen. Devuelve null para
 * cualquier otra cosa (por ejemplo el texto "Imagen no creada"), para no
 * guardar como imagen algo que no lo es.
 */
function asImage(v: unknown): string | null {
  const s = String(v).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(s) ? s : null;
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Reduce un encabezado a su primera palabra en singular, para que
 * "Precio de Venta" cuente como "precio" y "Imágenes" como "imagen".
 */
const headerKey = (raw: string) => {
  const first = norm(raw).split(/[^a-z0-9]+/).filter(Boolean)[0] ?? "";
  return first.replace(/(es|s)$/, "");
};

function parseRows(rows: Record<string, unknown>[]) {
  const products: Omit<Product, "id">[] = [];
  // Columnas que el Excel trae de verdad, con algún valor.
  const provided = new Set<string>();
  let skipped = 0;

  for (const row of rows) {
    const byKey: Record<string, unknown> = {};
    const loose: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      byKey[norm(k)] = v;
      const short = headerKey(k);
      if (short && loose[short] === undefined) loose[short] = v;
    }
    // El encabezado exacto manda; el abreviado solo rellena huecos.
    for (const [k, v] of Object.entries(loose)) {
      if (byKey[k] === undefined) byKey[k] = v;
    }

    const pick = (field: string) => {
      for (const alias of COLUMNS[field]) {
        if (byKey[alias] !== undefined && byKey[alias] !== "") return byKey[alias];
      }
      return null;
    };

    // Una columna cuenta como presente solo si aporta un valor utilizable:
    // así "Imagen no creada" no pisa las fotos ya enlazadas.
    function take<T>(field: string, transform: (v: unknown) => T | null) {
      const raw = pick(field);
      if (raw === null) return null;
      const value = transform(raw);
      if (value !== null) provided.add(field);
      return value;
    }

    const name = String(pick("name") ?? "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    provided.add("name");
    const sku = String(pick("sku") ?? "").trim() || storageName(name);
    provided.add("sku");

    products.push({
      sku,
      name,
      description: take("description", text),
      category: take("category", text),
      price: take("price", toNumber),
      stock: take("stock", toNumber),
      image: take("image", asImage),
      active: true,
    });
  }
  return { products, skipped, provided };
}

/** Clave para cruzar un producto con el nombre de archivo de su imagen. */
const matchKey = (s: string) => storageName(s).toLowerCase();

/** Igual, pero quitando la extensión del archivo. */
const fileMatchKey = (filename: string) =>
  matchKey(filename.replace(/\.[^.]+$/, ""));

/** Ejecuta `task` sobre `items`, como mucho `limit` a la vez. */
async function pool<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        await task(items[next++]);
      }
    }),
  );
}

export function AdminPanel() {
  const supabase = createClient();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [editing, setEditing] = useState<Product | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("products")
      .select("*")
      .order("name");
    if (error) setMsg(`Error al cargar: ${error.message}`);
    else setProducts((data ?? []) as Product[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function importExcel(file: File) {
    setBusy(true);
    setMsg("");
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const { products: parsed, skipped, provided } = parseRows(rows);
      if (parsed.length === 0) {
        setMsg("No se encontraron productos. Revisa que haya una columna 'nombre'.");
        return;
      }
      // Si el Excel repite un SKU, nos quedamos con la última fila
      const unique = [...new Map(parsed.map((p) => [p.sku, p])).values()];

      // Solo mandamos las columnas que el Excel trae de verdad: si no incluye
      // «imagen», las fotos ya enlazadas se quedan como están en vez de
      // borrarse.
      const columns = new Set(["sku", "name", "active", ...provided]);
      const payload = unique.map((p) =>
        Object.fromEntries(
          Object.entries(p).filter(([field]) => columns.has(field)),
        ),
      );

      const { error } = await supabase
        .from("products")
        .upsert(payload, { onConflict: "sku" });
      if (error) throw error;
      setMsg(
        `Listo: ${unique.length} productos importados o actualizados` +
          (skipped ? ` (${skipped} filas sin nombre omitidas)` : "") +
          `. Columnas leídas: ${[...provided].join(", ")}.`,
      );
      await Promise.all([load(), revalidateCatalog()]);
    } catch (e) {
      setMsg(`Error al importar: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImages(fileList: FileList) {
    const files = Array.from(fileList);
    setBusy(true);
    setMsg("");
    setProgress({ done: 0, total: files.length });

    // Lista fresca de productos: subir el archivo no sirve de nada si después
    // no queda enlazado en la columna "image" del producto que le toca.
    const { data: rows, error: loadError } = await supabase
      .from("products")
      .select("*");
    if (loadError) {
      setMsg(`Error al leer los productos: ${loadError.message}`);
      setProgress(null);
      setBusy(false);
      return;
    }

    // El nombre del producto tiene prioridad sobre el SKU si ambos coinciden.
    const index = new Map<string, Product>();
    for (const p of (rows ?? []) as Product[]) index.set(matchKey(p.sku), p);
    for (const p of (rows ?? []) as Product[]) index.set(matchKey(p.name), p);

    let uploaded = 0;
    let linked = 0;
    const failed: string[] = [];
    const orphans: string[] = [];

    await pool(files, 4, async (f) => {
      const path = storageName(f.name);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, f, { upsert: true, contentType: f.type || undefined });

      if (error) {
        failed.push(`${f.name} (${error.message})`);
      } else {
        uploaded++;
        const product = index.get(fileMatchKey(f.name));
        if (!product) {
          orphans.push(f.name);
        } else if (product.image === path) {
          linked++;
        } else {
          const { error: linkError } = await supabase
            .from("products")
            .update({ image: path })
            .eq("id", product.id);
          if (linkError) {
            failed.push(`${f.name} (subida, pero sin enlazar: ${linkError.message})`);
          } else {
            linked++;
          }
        }
      }
      setProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
    });

    const sample = (list: string[]) =>
      `${list.slice(0, 3).join(", ")}${list.length > 3 ? "…" : ""}`;

    setMsg(
      `${uploaded} de ${files.length} imágenes subidas · ${linked} enlazadas a su producto.` +
        (orphans.length
          ? ` ${orphans.length} no coinciden con ningún producto: ${sample(orphans)}.`
          : "") +
        (failed.length ? ` Fallaron ${failed.length}: ${sample(failed)}.` : ""),
    );

    setProgress(null);
    setBusy(false);
    await Promise.all([load(), revalidateCatalog()]);
  }

  async function uploadForProduct(p: Product, file: File) {
    setBusy(true);
    const name = `${storageName(p.sku)}-${crypto.randomUUID().slice(0, 8)}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(name, file, { upsert: true, contentType: file.type });
    if (error) setMsg(`Error al subir imagen: ${error.message}`);
    else await save({ ...p, image: name });
    setBusy(false);
  }

  async function save(p: Product) {
    const { error } = await supabase
      .from("products")
      .update({
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        stock: p.stock,
        image: p.image,
        active: p.active,
      })
      .eq("id", p.id);
    if (error) setMsg(`Error al guardar: ${error.message}`);
    else {
      setMsg("");
      await Promise.all([load(), revalidateCatalog()]);
    }
  }

  async function remove(p: Product) {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) setMsg(`Error al eliminar: ${error.message}`);
    else await Promise.all([load(), revalidateCatalog()]);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cats size={90} />
          <h1 className="text-5xl font-black">Panel de administración</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn btn-ghost">
            Ver catálogo
          </Link>
          <button onClick={logout} className="btn btn-ghost">
            Salir
          </button>
        </div>
      </header>

      {msg && (
        <p className="mt-4 rounded-xl border-[3px] border-ink bg-pink-soft p-3 font-bold">
          {msg}
        </p>
      )}

      {busy && (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 flex items-center gap-3 rounded-xl border-[3px] border-ink bg-pink-soft p-3 font-bold"
        >
          <span className="spinner" aria-hidden="true" />
          {progress
            ? `Subiendo ${progress.done} de ${progress.total} imágenes…`
            : "Procesando…"}
        </p>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="card-sticker p-5">
          <h2 className="text-3xl">1. Importar Excel</h2>
          <p className="mb-3 text-sm">
            Columnas: <b>sku, nombre, descripción, categoría, precio, stock,
            imagen</b>. Sirven también encabezados más largos o en plural
            («Precio de Venta», «Imágenes»). Si el SKU ya existe, se actualiza, y
            las columnas que no incluyas se quedan como están.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importExcel(f);
              e.target.value = "";
            }}
          />
        </section>

        <section className="card-sticker p-5">
          <h2 className="text-3xl">2. Subir imágenes</h2>
          <p className="mb-3 text-sm">
            Puedes subir varias a la vez. El nombre del archivo debe coincidir con
            el de la columna «imagen» del Excel.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={(e) => {
                if (e.target.files?.length) uploadImages(e.target.files);
                e.target.value = "";
              }}
            />
            {progress && <span className="spinner" aria-hidden="true" />}
          </div>
          {progress && (
            <p className="mt-2 text-sm font-bold">
              {progress.done} / {progress.total}
            </p>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-3xl">Productos ({products.length})</h2>
        {products.length === 0 ? (
          <div className="flex flex-col items-center py-10">
            <Cats size={200} wiggle />
            <p className="font-display text-2xl">Aún no hay productos</p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {products.map((p) => {
              const isEditing = editing?.id === p.id;
              const url = imageUrl(p.image);
              return (
                <li
                  key={p.id}
                  className={`card-sticker flex flex-wrap items-center gap-3 p-3 ${p.active ? "" : "opacity-60"}`}
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-ink bg-pink-soft">
                    {url ? (
                      <img src={url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Cats size={60} />
                    )}
                  </div>

                  {isEditing ? (
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                      <input className="input" value={editing.name} placeholder="Nombre"
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                      <input className="input" value={editing.category ?? ""} placeholder="Categoría"
                        onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                      <input className="input" type="number" step="0.01" value={editing.price ?? ""} placeholder="Precio"
                        onChange={(e) => setEditing({ ...editing, price: toNumber(e.target.value) })} />
                      <input className="input" type="number" value={editing.stock ?? ""} placeholder="Stock"
                        onChange={(e) => setEditing({ ...editing, stock: toNumber(e.target.value) })} />
                      <textarea className="input sm:col-span-2" value={editing.description ?? ""} placeholder="Descripción"
                        onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-2xl leading-tight">{p.name}</p>
                      <p className="text-sm opacity-80">
                        {p.sku} · {p.category ?? "Sin categoría"} · {formatPrice(p.price) || "Sin precio"} · stock {p.stock ?? "—"}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {isEditing ? (
                      <>
                        <button className="btn" onClick={async () => { await save(editing); setEditing(null); }}>
                          Guardar
                        </button>
                        <button className="btn btn-ghost" onClick={() => setEditing(null)}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="btn btn-ghost cursor-pointer">
                          Foto
                          <input type="file" accept="image/*" hidden disabled={busy}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadForProduct(p, f);
                              e.target.value = "";
                            }} />
                        </label>
                        <button className="btn btn-ghost" onClick={() => save({ ...p, active: !p.active })}>
                          {p.active ? "Ocultar" : "Mostrar"}
                        </button>
                        <button className="btn btn-ghost" onClick={() => setEditing(p)}>
                          Editar
                        </button>
                        <button className="btn btn-danger" onClick={() => remove(p)}>
                          Borrar
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
