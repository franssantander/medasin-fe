import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Reveal, SplitWords } from "./motion/reveal";
import { ProductPreview } from "./product-preview";

export function HeroSection() {
  return (
    <section id="hero" aria-labelledby="hero-title" className="relative overflow-hidden pt-16 sm:pt-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center sm:px-6">
        <Reveal as="p" onMount className="text-sm text-muted-foreground">
          A connected system for a thoughtful life.
        </Reveal>

        <SplitWords
          as="h1"
          id="hero-title"
          onMount
          delay={0.1}
          text="Projects, notes, habits, and focus in one calm workspace."
          className="mt-4 font-spectral text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl"
        />

        <Reveal
          as="p"
          onMount
          delay={0.55}
          className="mt-6 max-w-xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-8"
        >
          Sort your life into Projects, Areas, and Resources. Then plan the work on a board, do it in a focus session,
          and write down how it went. Everything stays linked.
        </Reveal>

        <Reveal onMount delay={0.7} className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/register" className={buttonVariants({ size: "lg", className: "group/cta px-4" })}>
            Get started free
            <ArrowRight
              data-icon="inline-end"
              aria-hidden="true"
              className="transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
          <Link href="#how-it-works" className={buttonVariants({ variant: "outline", size: "lg", className: "px-4" })}>
            See how it works
          </Link>
        </Reveal>
        <Reveal as="p" onMount delay={0.8} className="mt-3 text-xs text-muted-foreground">
          Free plan includes every tool. No card needed.
        </Reveal>
      </div>

      <div className="relative mt-14 sm:mt-20">
        {/* A muted floor under the lower half of the window gives it somewhere to sit. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 bottom-0 border-t bg-muted/50" />
        <Reveal onMount delay={0.5} className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <ProductPreview />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Switch screens to look around. This is the real layout, with sample content.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
