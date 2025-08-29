import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kimerizm Takip Sistemi v2.0",
  description: "Organ nakli sonrası kimerizm izlem ve risk değerlendirme sistemi",
  keywords: ["kimerizm", "organ nakli", "AI", "machine learning", "risk assessment"],
  authors: [{ name: "Kimerizm Research Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold">
                      K
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold">Kimerizm Takip Sistemi</h1>
                      <p className="text-xs text-muted-foreground">v2.0 - AI Destekli</p>
                    </div>
                  </div>
                </div>
                
                                <nav className="flex items-center space-x-6">
                  <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
                    Dashboard
                  </Link>
                  <Link href="/patients" className="text-sm font-medium transition-colors hover:text-primary">
                    Hastalar
                  </Link>
                  <Link href="/reports" className="text-sm font-medium transition-colors hover:text-primary">
                    Raporlar
                  </Link>
                </nav>
              </div>
            </header>
            
            <main className="container mx-auto py-6">
              {children}
            </main>
            
            <footer className="border-t py-6 text-center text-sm text-muted-foreground">
              <p>© 2025 Kimerizm Takip Sistemi v2.0 - Gelişmiş AI ve risk analizi ile desteklenen organ nakli takip sistemi</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}