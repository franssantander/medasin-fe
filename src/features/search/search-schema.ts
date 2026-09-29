import { z } from "zod";

export const searchTypes = [
  "project",
  "area",
  "resource",
  "note",
  "journal",
  "letter",
  "plan",
  "habit",
  "goal",
] as const;

export const searchTypeSchema = z.enum(searchTypes);
export type SearchType = z.infer<typeof searchTypeSchema>;

const resultSchema = z
  .object({
    id: z.uuid(),
    type: searchTypeSchema,
    title: z.string(),
    subtitle: z.string().nullable(),
    snippet: z.string().nullable(),
    match_field: z.string(),
    archived: z.boolean(),
    updated_at: z.string(),
    area_uuid: z.uuid().optional(),
  })
  .refine((result) => result.type !== "goal" || Boolean(result.area_uuid), {
    message: "Goal results require an area UUID.",
  });

export const searchResponseSchema = z.object({
  data: z.object({
    query: z.string(),
    groups: z.array(
      z.object({
        type: searchTypeSchema,
        label: z.string(),
        total: z.number().int().nonnegative(),
        items: z.array(resultSchema),
      }),
    ),
  }),
  status: z.number(),
  message: z.string(),
});

export type SearchResult = z.infer<typeof resultSchema>;
export type SearchGroup = z.infer<typeof searchResponseSchema>["data"]["groups"][number];
export type SearchResponse = z.infer<typeof searchResponseSchema>;
