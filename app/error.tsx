"use client";

import { Cats } from "@/components/Cats";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <Cats size={180} />
      <p className="font-display text-2xl text-red">
        No se pudo cargar el catálogo. Revisa la configuración de Supabase.
      </p>
      <button onClick={reset} className="btn">
        Reintentar
      </button>
    </div>
  );
}
