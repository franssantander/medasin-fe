import type { Metadata } from "next";

import { HomeOverviewPage } from "@/features/home/components/home-page";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return <HomeOverviewPage />;
}
