import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata = {
  title: "Pro Mobile",
  description: "Sistema de Rutas y Abordaje Pro Mobile",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased font-sans">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
