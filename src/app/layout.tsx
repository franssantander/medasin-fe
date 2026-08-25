import type { Metadata } from "next";
import { EB_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/toast";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

const ebGaramond = EB_Garamond({
  variable: "--font-garamond-sans",
  subsets: ["latin"],
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
      className={`${ebGaramond.variable} ${manrope.variable}`}
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
