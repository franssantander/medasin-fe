import { z } from "zod";

export const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    description: z.string().trim().optional(),
    icon: z.string().trim().max(50).optional(),
    background: z
      .string()
      .trim()
      .regex(/^#[0-9a-f]{6}$/i, "Enter a valid 6-digit hex color."),
    start_date: z.string().optional(),
    due_date: z.string().optional(),
    area_mode: z.enum(["existing", "new"]),
    area_uuid: z.string().optional(),
    area_name: z.string().trim().max(120).optional(),
  })
  .superRefine((value, context) => {
    if (value.start_date && value.due_date && value.due_date < value.start_date) {
      context.addIssue({
        code: "custom",
        path: ["due_date"],
        message: "Due date must be on or after the start date.",
      });
    }

    if (value.area_mode === "existing" && !value.area_uuid) {
      context.addIssue({
        code: "custom",
        path: ["area_uuid"],
        message: "Choose an area.",
      });
    }

    if (value.area_mode === "new" && !value.area_name) {
      context.addIssue({
        code: "custom",
        path: ["area_name"],
        message: "Area name is required.",
      });
    }
  });

export type ProjectFormValues = z.input<typeof projectSchema>;
