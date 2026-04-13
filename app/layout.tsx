import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

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
    <html lang="es" className={plusJakarta.variable}>
      <body className={plusJakarta.className}>
        <a href="#main-content" className="skip-link">
          Ir al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
