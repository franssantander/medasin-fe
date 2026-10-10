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
  grant_type: z.enum(["free", "recurring", "lifetime"]),
  expires_at: z.iso.datetime().nullable(),
  enforcement_enabled: z.boolean(),
  limits: z.object({
    projects: limitSchema,
    areas: limitSchema,
    resources: limitSchema,
  }),
  usage: z.object({
    projects: usageSchema,
    areas: usageSchema,
    resources: usageSchema,
  }),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export const planLimitMetaSchema = z.object({
  feature: z.enum(coreFeatures),
  usage: usageSchema,
  limit: z.number().int().nonnegative(),
});

export type PlanLimitMeta = z.infer<typeof planLimitMetaSchema>;
