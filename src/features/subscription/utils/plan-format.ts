import type { CatalogPlan } from "../types";

export function formatPlanPrice(plan: Pick<CatalogPlan, "price_minor" | "currency" | "billing_interval">): string {
  if (plan.price_minor === 0) return "Free";

  const amount = new Intl.NumberFormat("en", {
    style: "currency",
    currency: plan.currency,
    minimumFractionDigits: plan.price_minor % 100 === 0 ? 0 : 2,
  }).format(plan.price_minor / 100);

  return plan.billing_interval ? `${amount} / ${plan.billing_interval}` : amount;
}

const byteUnits = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < byteUnits.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 || value >= 100 || Number.isInteger(value) ? 0 : 1;

  return `${value.toFixed(digits)} ${byteUnits[unit]}`;
}

/** A mailto link for upgrade requests, or null while no contact address is configured. */
export function upgradeContactHref(planName?: string): string | null {
  const email = process.env.NEXT_PUBLIC_UPGRADE_CONTACT_EMAIL?.trim();
  if (!email) return null;

  const subject = planName ? `Upgrade to ${planName}` : "Upgrade my Medasin plan";
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
