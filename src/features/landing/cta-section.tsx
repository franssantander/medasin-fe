import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Reveal, SplitWords } from "./motion/reveal";

export function CtaSection() {
  return (
    <section aria-labelledby="cta-title" className="border-t bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <SplitWords
          id="cta-title"
          text="Your mind is at war when your ideas have nowhere to go."
          className="font-spectral text-3xl font-semibold tracking-tight text-balance sm:text-5xl"
        />
        <Reveal as="p" delay={0.45} className="mt-5 max-w-lg text-base leading-7 text-primary-foreground/70">
          Give them a home. Set up your projects and areas in a few minutes, free.
        </Reveal>
        <Reveal delay={0.6} className="mt-8">
          <Link
            href="/register"
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className: "group/cta px-4",
            })}
          >
            Create your free account
            <ArrowRight
              data-icon="inline-end"
              aria-hidden="true"
              className="transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
