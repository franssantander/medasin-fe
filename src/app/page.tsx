import { CtaSection } from "@/features/landing/cta-section";
import { HeroSection } from "@/features/landing/hero-section";
import { MotionProvider } from "@/features/landing/motion/motion-provider";
import { ParaSection } from "@/features/landing/para-section";
import { PricingSection } from "@/features/landing/pricing-section";
import { SiteFooter } from "@/features/landing/site-footer";
import { SiteNavbar } from "@/features/landing/site-navbar";
import { ToolsSection } from "@/features/landing/tools-section";

export default function Home() {
  return (
    <MotionProvider>
      <SiteNavbar />
      <main>
        <HeroSection />
        <ParaSection />
        <ToolsSection />
        <PricingSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </MotionProvider>
  );
}
