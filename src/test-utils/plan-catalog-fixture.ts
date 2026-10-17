export const planCatalogFixture = [
  {
    uuid: "plan-free", slug: "free", name: "Free", description: "Every Medasin tool, with room to set up your system.",
    price_minor: 0, currency: "PHP", billing_interval: null,
    limits: { projects: 10, areas: 5, resources: 100, storage_mb: 1024 },
    features: ["Up to 10 projects", "Up to 5 areas", "Up to 100 resources", "1 GB storage", "Every tool: Boards, Focus, Habits, Notes, Journal, Letters, and Calendar"],
  },
  {
    uuid: "plan-focus", slug: "focus", name: "Focus", description: "Every tool, with more room for projects, areas, resources, and files.",
    price_minor: 9900, currency: "PHP", billing_interval: "month",
    limits: { projects: 50, areas: 20, resources: 1000, storage_mb: 10240 },
    features: ["Up to 50 projects", "Up to 20 areas", "Up to 1,000 resources", "10 GB storage", "Every tool: Boards, Focus, Habits, Notes, Journal, Letters, and Calendar"],
  },
  {
    uuid: "plan-clarity", slug: "clarity", name: "Clarity", description: "Every tool, with unlimited projects, areas, and resources and the most storage.",
    price_minor: 14900, currency: "PHP", billing_interval: "month",
    limits: { projects: null, areas: null, resources: null, storage_mb: 102400 },
    features: ["Unlimited projects", "Unlimited areas", "Unlimited resources", "100 GB storage", "Every tool: Boards, Focus, Habits, Notes, Journal, Letters, and Calendar"],
  },
];
