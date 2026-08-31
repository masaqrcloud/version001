import { z } from "zod";

export const menuOptionInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  priceDelta: z.number().min(0).max(100000),
  available: z.boolean().optional(),
});

export const menuOptionGroupInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    required: z.boolean().optional(),
    minSelections: z.number().int().min(0).max(20),
    maxSelections: z.number().int().min(1).max(20),
    options: z.array(menuOptionInputSchema).min(1).max(40),
  })
  .refine((group) => group.minSelections <= group.maxSelections, {
    message: "Minimum seçim maksimumdan büyük olamaz",
  })
  .refine(
    (group) =>
      group.maxSelections <= group.options.length &&
      group.minSelections <= group.options.length,
    { message: "Seçim sınırı seçenek sayısını aşamaz" },
  );

export type MenuOptionGroupInput = z.infer<typeof menuOptionGroupInputSchema>;
