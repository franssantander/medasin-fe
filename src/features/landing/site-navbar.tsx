"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { landingNavLinks } from "./landing-nav";


export function SiteNavbar() {
  // At the top the bar blends into the page; the edge appears once content scrolls under it.
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-50 w-full border-b border-transparent bg-background/90 backdrop-blur transition-[border-color,box-shadow] duration-300 data-scrolled:border-border data-scrolled:shadow-[0_1px_16px_-8px_oklch(0_0_0/0.18)] motion-reduce:transition-none"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-1 font-garamond text-xl"
        >
          <Image
            src="/images/medasin-logo.svg"
            alt="Medasin"
            width={36}
            height={36}
          />
          Medasin
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {landingNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Log in
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        </div>

        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="md:hidden" />
            }
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle menu</span>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Medasin</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 px-4">
              {landingNavLinks.map((link) => (
                <SheetClose
                  key={link.href}
                  render={
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    />
                  }
                >
                  {link.label}
                </SheetClose>
              ))}
            </nav>
            <Separator className="my-2" />
            <div className="flex flex-col gap-2 px-4">
              <SheetClose
                render={
                  <Link
                    href="/login"
                    className={buttonVariants({
                      variant: "outline",
                      className: "w-full",
                    })}
                  />
                }
              >
                Log in
              </SheetClose>
              <SheetClose
                render={
                  <Link
                    href="/register"
                    className={buttonVariants({ className: "w-full" })}
                  />
                }
              >
                Get started
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
