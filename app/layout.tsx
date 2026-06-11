import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zenix Blox",
  description: "Experiência oficial Zenix Blox."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
