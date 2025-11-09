import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { registerServiceWorker } from "@/lib/pwa";
import ErrorBoundary from "@/components/error-boundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Finthos - Modern Payment Solutions",
  description: "Secure, fast, and reliable payment processing for businesses and individuals",
  keywords: ["payments", "fintech", "money transfer", "digital wallet"],
  authors: [{ name: "Finthos Team" }],
  viewport: "width=device-width, initial-scale=1",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finthos",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Finthos",
    title: "Finthos - Modern Payment Solutions",
    description: "Secure, fast, and reliable payment processing for businesses and individuals",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finthos - Modern Payment Solutions",
    description: "Secure, fast, and reliable payment processing for businesses and individuals",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Providers>
              {children}
            </Providers>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

// Register service worker on client side
if (typeof window !== 'undefined') {
  registerServiceWorker()
}

