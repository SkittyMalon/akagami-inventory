"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { Cats } from "./Cats";

export type CatalogItem = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  price: string; // ya formateado
  stock: number | null;
  imageUrl: string | null;
};

export function ProductGrid({ items }: { items: CatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = useMemo(
    () => [
      "Todas",
      ...Array.from(
        new Set(items.map((i) => i.category).filter(Boolean) as string[]),
      ).sort(),
    ],
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (category === "Todas" || i.category === category) &&
        (!q ||
          `${i.name} ${i.sku} ${i.description ?? ""} ${i.category ?? ""}`
            .toLowerCase()
            .includes(q)),
    );
  }, [items, query, category]);

  // Solo las imágenes de los productos visibles, para navegar entre ellas
  const slides = filtered
    .filter((i) => i.imageUrl)
    .map((i) => ({ src: i.imageUrl!, alt: i.name, id: i.id }));
  const openIndex = slides.findIndex((s) => s.id === openId);

  return (
    <section className="mx-auto w-full max-w-6xl px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Buscar producto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`btn ${c === category ? "" : "btn-ghost"}`}
              style={{ fontSize: "1rem", padding: "0.1rem 0.9rem" }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Cats size={220} wiggle />
          <p className="font-display text-3xl">
            Los gatitos no encontraron nada…
          </p>
          <p>Prueba con otra búsqueda o categoría.</p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <li key={p.id} className="card-sticker flex flex-col overflow-hidden">
              <button
                type="button"
                disabled={!p.imageUrl}
                onClick={() => setOpenId(p.id)}
                aria-label={`Ampliar imagen de ${p.name}`}
                className="aspect-square w-full cursor-zoom-in overflow-hidden border-b-[3px] border-ink bg-pink-soft disabled:cursor-default"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Cats size={110} />
                  </div>
                )}
              </button>
              <div className="flex flex-1 flex-col gap-1 p-3">
                {p.category && (
                  <span className="text-xs font-bold uppercase text-red">
                    {p.category}
                  </span>
                )}
                <h3 className="text-2xl leading-tight">{p.name}</h3>
                {p.description && (
                  <p className="line-clamp-2 text-sm opacity-80">
                    {p.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-end gap-2 pt-2">
                  {p.stock === 0 && (
                    <span className="mr-auto rounded-full border-2 border-ink bg-pink px-2 text-xs font-bold">
                      Agotado
                    </span>
                  )}
                  <span className="font-display text-2xl text-red">
                    {p.price}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Lightbox
        open={openIndex >= 0}
        close={() => setOpenId(null)}
        index={Math.max(openIndex, 0)}
        slides={slides}
        plugins={[Zoom]}
        on={{ view: ({ index }) => setOpenId(slides[index]?.id ?? null) }}
      />
    </section>
  );
}
