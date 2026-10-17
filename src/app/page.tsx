import { HeroSection } from "@/features/landing/hero-section";
import { PricingSection } from "@/features/landing/pricing-section";
import { SiteNavbar } from "@/features/landing/site-navbar";

export default function Home() {
  return (
    <>
      <SiteNavbar />
      <main>
        <HeroSection />
        <PricingSection />
      </main>
    </>
  );
}
