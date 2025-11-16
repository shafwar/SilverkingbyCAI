import { z } from "zod";

export const productCreateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  weight: z.coerce.number().int().positive("Weight must be positive"),
  serialCode: z.string().trim().min(6).regex(/^[A-Za-z0-9]+$/, {
    message: "Serial must be alphanumeric",
  }).optional(),
  price: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
});

export const productUpdateSchema = z.object({
  id: z.coerce.number().int(),
  name: z.string().min(2).optional(),
  weight: z.coerce.number().int().positive().optional(),
  serialCode: z
    .string()
    .trim()
    .min(6)
    .regex(/^[A-Za-z0-9]+$/)
    .optional(),
  price: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

