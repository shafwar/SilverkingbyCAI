import { z } from "zod";

/**
 * Input schema for gram-based inventory (Products Page 2).
 *
 * Design:
 * - name: human readable product name (e.g. "Silver King 250gr")
 * - weight: raw gram value used to decide QR mode (small vs large)
 * - quantity: how many physical units are represented
 *
 * QR behaviour:
 * - Selalu 1 QR per batch (independen dari weight/quantity)
 */
export const gramProductCreateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  weight: z.coerce.number().int().positive("Weight must be positive"),
  quantity: z.coerce
    .number()
    .int()
    .positive("Quantity must be at least 1")
    .max(200000, "Maximum 200000 units per batch"),
});

export type GramProductCreateInput = z.infer<typeof gramProductCreateSchema>;
