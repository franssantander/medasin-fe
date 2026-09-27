import type { Metadata } from "next";

import { DashboardPage } from "@/features/home/components/dashboard-page";

export const metadata: Metadata = { title: "Dashboard" };

export default function HomePage() {
  return <DashboardPage />;
}
