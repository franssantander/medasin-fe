import type { Metadata } from "next";
import { EB_Garamond, Geist, Inter, Manrope, Newsreader, Spectral } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/toast";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", axes: ["opsz"], preload: false });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", preload: false });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", preload: false });

const ebGaramond = EB_Garamond({
  variable: "--font-garamond-sans",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Medasin",
    template: "%s | Medasin",
  },
  description:
    "Medasin is a calm productivity app that helps you organize your tasks, build habits, focus deeply, and reflect daily.",
  openGraph: {
    title: "Medasin",
    description:
      "Medasin is a calm productivity app that helps you organize your tasks, build habits, focus deeply, and reflect daily.",
    type: "website",
    locale: "en_US",
    siteName: "Medasin",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${spectral.variable} ${newsreader.variable} ${manrope.variable} ${geist.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
