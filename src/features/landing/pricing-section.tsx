"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

import { Accordion, AccordionContent, AccordionHeader, AccordionItem } from "@/components/ui/accordion";
import { Reveal } from "./motion/reveal";
import { PricingPlans } from "./pricing-plans";

const questions = [
  {
    question: "Do paid plans unlock more tools?",
    answer:
      "No. Every plan includes Board, Focus, Habits, Notes, Journal, Letters, and Plans, with no limits. Paid plans give you room for more projects, areas, resources, and files.",
  },
  {
    question: "What happens when I reach a limit?",
    answer:
      "Everything you have stays put. You can't add another project, area, or resource past the limit until you upgrade or make room. Archived items still count toward the limit.",
  },
  {
    question: "What happens if my paid plan ends?",
    answer:
      "Your account moves to Free and nothing is deleted. You can still open everything you made. Adding new projects, areas, or resources resumes once you're back under the Free limits.",
  },
  {
    question: "Can I start free and upgrade later?",
    answer: "Yes. Everything you create on Free carries over when you upgrade, exactly as you left it.",
  },
];

export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-14 py-20 sm:py-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-sm text-muted-foreground">Pricing</p>
          <h2 id="pricing-title" className="mt-3 font-spectral text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Every plan includes every tool.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Start free with the whole workspace. Upgrade when your system outgrows the limits on projects, areas,
            resources, and storage.
          </p>
        </Reveal>

        <PricingPlans />

        <Reveal className="grid gap-8 lg:grid-cols-[18rem_1fr]">
          <h3 className="font-spectral text-2xl font-semibold tracking-tight">Questions</h3>
          <Accordion className="border-t">
            {questions.map((item) => (
              <AccordionItem key={item.question} className="border-b">
                <AccordionHeader>
                  <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 rounded-md py-4 text-left text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    {item.question}
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-panel-open:rotate-180"
                      aria-hidden="true"
                    />
                  </AccordionPrimitive.Trigger>
                </AccordionHeader>
                <AccordionContent>
                  <p className="max-w-2xl pb-4 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
