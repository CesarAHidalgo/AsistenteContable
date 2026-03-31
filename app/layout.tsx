import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asistente Contable",
  description: "Panel personal para registrar ingresos, gastos, deudas y recordatorios."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
