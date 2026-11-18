/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { STORE } from "@/lib/store";

// Los gatitos de Akagami, reutilizables en todo el front-end.
export function Cats({
  size = 160,
  className = "",
  wiggle = false,
}: {
  size?: number;
  className?: string;
  wiggle?: boolean;
}) {
  return (
    <img
      src="/akagami-logo.png"
      alt="Gatitos Akagami comiendo ramen"
      width={size}
      className={`select-none ${wiggle ? "wiggle" : ""} ${className}`}
      draggable={false}
    />
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b-4 border-ink bg-pink-soft">
      <div className="candy-stripe" />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label={`${STORE.name}, ir al catálogo`}
        >
          <Cats size={64} />
          <span className="min-w-0">
            <span className="block font-display text-3xl leading-none text-red sm:text-4xl">
              {STORE.name}
            </span>
            <span className="mt-1 flex items-center gap-1 text-xs opacity-75">
              <PinIcon />
              {STORE.address}
            </span>
          </span>
        </Link>

        <Link href="/admin" className="btn btn-ghost shrink-0">
          Administrador
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t-4 border-ink bg-pink-soft">
      <div className="candy-stripe" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center">
        <Cats size={170} wiggle />
        <p className="font-display text-2xl">¡Gracias por visitar Akagami!</p>

        <p className="flex items-center gap-1.5 text-sm">
          <PinIcon />
          {STORE.address}
        </p>

        <a
          href={STORE.instagramUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn-ghost flex items-center gap-2"
        >
          <InstagramIcon />
          {STORE.instagram}
        </a>
      </div>
    </footer>
  );
}
