import { z } from "zod";

export const resourceSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(255),
  links: z
    .array(
      z
        .string()
        .max(4096)
        .refine((value) => {
          try {
            return ["http:", "https:"].includes(new URL(value).protocol);
          } catch {
            return false;
          }
        }, "Enter a valid HTTP or HTTPS link."),
    )
    .max(100),
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
  tag_names: z.array(z.string().trim().min(1).max(100)).max(100),
  tag_uuids: z.array(z.string().uuid()).max(100),
  project_uuid: z.string().uuid().optional(),
  area_uuid: z.string().uuid().optional(),
});
