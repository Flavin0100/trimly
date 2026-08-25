import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Trimly — Agendamento inteligente para barbearias modernas",
  description: "A maneira mais rápida para os clientes agendarem e a mais simples para sua barbearia funcionar.",
  icons: { icon: "/brand/trimly-icon.png", shortcut: "/brand/trimly-icon.png", apple: "/brand/trimly-icon.png" },
  openGraph: {
    title: "Trimly — Agendamento inteligente para barbearias",
    description: "Agende melhor. Cresça mais rápido.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Trimly — Agende melhor. Cresça mais rápido." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trimly — Agendamento inteligente para barbearias",
    description: "Agende melhor. Cresça mais rápido.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
