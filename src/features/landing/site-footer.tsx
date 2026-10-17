import Image from "next/image";
import Link from "next/link";

import { landingNavLinks } from "./landing-nav";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 font-garamond text-lg">
          <Image src="/images/medasin-logo.svg" alt="" width={28} height={28} />
          Medasin
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {landingNavLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="hover:text-foreground">
            Log in
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Create account
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Medasin</p>
      </div>
    </footer>
  );
}
