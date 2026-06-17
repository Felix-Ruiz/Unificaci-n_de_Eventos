import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "./ThemeProvider";
import { LanguageProvider } from "../context/LanguageContext";

export const metadata: Metadata = {
  title: "ACOFI Eventos | Registro Oficial",
  description: "Sistema oficial de unificación de formularios, acreditación y eventos de la Asociación Colombiana de Facultades de Ingeniería (ACOFI).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}