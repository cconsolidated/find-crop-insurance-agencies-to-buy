import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Fieldnote · Texas Agency Intelligence", template: "%s · Fieldnote" },
  description: "Private acquisition-screening workspace for Texas crop-insurance agencies.",
  openGraph: {
    title: "Fieldnote · Texas Agency Intelligence",
    description: "Private acquisition-screening workspace for Texas crop-insurance agencies.",
    images: [{ url: "/fieldnote-og.png", width: 1731, height: 909, alt: "Texas agricultural fields with an agency intelligence network overlay" }],
  },
  twitter: { card: "summary_large_image", images: ["/fieldnote-og.png"] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
