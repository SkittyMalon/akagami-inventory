import type { Metadata } from "next";
import { Londrina_Solid, Nunito } from "next/font/google";
import "./globals.css";

// Londrina Solid: trazo grueso, redondeado y dibujado a mano (parecida a "Child Hood")
const londrina = Londrina_Solid({
  variable: "--font-londrina",
  subsets: ["latin"],
  weight: ["300", "400", "900"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Akagami | Catálogo",
  description: "Catálogo de productos Akagami",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${londrina.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
