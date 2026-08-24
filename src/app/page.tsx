import { HeroSection } from "@/features/landing/hero-section";
import { SiteNavbar } from "@/features/landing/site-navbar";

export default function Home() {
  return (
    <>
      <SiteNavbar />
      <main>
        <HeroSection />
      </main>
    </>
  );
}
