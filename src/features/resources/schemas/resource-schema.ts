import { z } from "zod";

export const resourceSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(255, "Use a title of 255 characters or fewer."),
  icon: z.string().trim().max(50).optional(),
  background: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i, "Enter a valid 6-digit hex color."),
  links: z
    .array(
      z
        .string()
        .max(4096, "Use a link of 4096 characters or fewer.")
        .refine((value) => {
          try {
            return ["http:", "https:"].includes(new URL(value).protocol);
          } catch {
            return false;
          }
        }, "Enter a valid HTTP or HTTPS link."),
    )
    .max(100, "Add at most 100 links."),
  files: z
    .array(
      z
        .custom<File>((value) => value instanceof File)
        .refine(
          (file) => file.size <= 20 * 1024 * 1024,
          "Each upload must be 20 MB or smaller.",
        ),
    )
    .max(10, "Choose at most 10 uploads."),
  tag_names: z.array(z.string().trim().min(1, "Enter a tag name.").max(100, "Use tag names of 100 characters or fewer.")).max(100, "Add at most 100 new tags."),
  tag_uuids: z.array(z.string().uuid()).max(100, "Choose at most 100 tags."),
  project_uuids: z.array(z.string().uuid()).max(100, "Choose at most 100 projects."),
  area_uuids: z.array(z.string().uuid()).max(100, "Choose at most 100 areas."),
});
