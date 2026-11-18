import { Suspense } from "react";
import { Cats, Footer, SiteHeader } from "@/components/Cats";
import { ProductGrid, type CatalogItem } from "@/components/ProductGrid";
import { getCatalog } from "@/lib/catalog";
import { formatPrice, imageUrl } from "@/lib/products";

async function Catalog() {
  const items: CatalogItem[] = (await getCatalog()).map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    category: p.category,
    price: formatPrice(p.price),
    stock: p.stock,
    imageUrl: imageUrl(p.image),
  }));

  return <ProductGrid items={items} />;
}

export default function Home() {
  return (
    <>
      <SiteHeader />

      <section className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 pt-8 pb-8 text-center">
        <Cats size={280} wiggle />
        <h1 className="text-6xl font-black text-ink sm:text-7xl">
          Catálogo <span className="text-red">Akagami</span>
        </h1>
        <p className="max-w-md text-lg">
          Mira nuestros productos y toca cualquier imagen para verla en grande.
        </p>
      </section>

      <Suspense
        fallback={
          <div className="flex flex-col items-center py-10">
            <Cats size={180} wiggle />
            <p className="font-display text-2xl">Cargando el menú…</p>
          </div>
        }
      >
        <Catalog />
      </Suspense>

      <Footer />
    </>
  );
}
