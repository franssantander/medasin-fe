import { z } from "zod";

export const coreFeatures = ["projects", "areas", "resources"] as const;
export type CoreFeature = (typeof coreFeatures)[number];

export const coreFeatureLabels: Record<CoreFeature, string> = {
  projects: "Projects",
  areas: "Areas",
  resources: "Resources",
};

const limitSchema = z.number().int().nonnegative().nullable();
const usageSchema = z.number().int().nonnegative();

export const subscriptionSchema = z.object({
  plan: z.object({ slug: z.string().min(1), name: z.string().min(1) }),
  grant_type: z.enum(["free", "recurring"]),
  expires_at: z.iso.datetime().nullable(),
  enforcement_enabled: z.boolean(),
  limits: z.object({
    projects: limitSchema,
    areas: limitSchema,
    resources: limitSchema,
    storage_bytes: limitSchema,
  }),
  usage: z.object({
    projects: usageSchema,
    areas: usageSchema,
    resources: usageSchema,
    storage_bytes: usageSchema,
  }),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export const planLimitMetaSchema = z.object({
  /** `storage` usage and limit are in bytes. */
  feature: z.enum([...coreFeatures, "storage"]),
  usage: usageSchema,
  limit: z.number().int().nonnegative(),
});

export type PlanLimitMeta = z.infer<typeof planLimitMetaSchema>;

export const catalogPlanSchema = z.object({
  uuid: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  price_minor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  billing_interval: z.enum(["month"]).nullable(),
  limits: z.object({
    projects: limitSchema,
    areas: limitSchema,
    resources: limitSchema,
    storage_mb: limitSchema,
  }),
  features: z.array(z.string()),
});

export const planCatalogSchema = z.array(catalogPlanSchema);

export type CatalogPlan = z.infer<typeof catalogPlanSchema>;
