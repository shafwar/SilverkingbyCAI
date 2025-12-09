import { z } from "zod";

/**
 * Input schema for gram-based inventory (Products Page 2).
 *
 * Design:
 * - name: human readable product name (e.g. "Silver King 250gr")
 * - weight: raw gram value used to decide QR mode (small vs large)
 * - quantity: how many physical units are represented
 * - serialPrefix: prefix for auto-generating serial codes (e.g. "SKP" -> SKP000001)
 * - serialCode: custom serial code (optional, only if serialPrefix is empty)
 *
 * QR behaviour:
 * - Selalu 1 QR per batch (independen dari weight/quantity)
 * - Each item gets a unique serialCode and rootKeyHash
 */
export const gramProductCreateSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    weight: z.coerce.number().int().positive("Weight must be positive"),
    quantity: z.coerce
      .number()
      .int()
      .positive("Quantity must be at least 1")
      .max(200000, "Maximum 200000 units per batch"),
    serialCode: z
      .string()
      .trim()
      .refine((val) => !val || /^[A-Za-z0-9]+$/.test(val), {
        message: "Serial must be alphanumeric",
      })
      .optional()
      .default(""),
    serialPrefix: z
      .string()
      .trim()
      .max(10)
      .refine((val) => !val || /^[A-Za-z0-9]+$/.test(val), {
        message: "Serial prefix must be alphanumeric",
      })
      .optional()
      .default(""),
  })
  .refine(
    (data) => {
      // If quantity > 1, serialPrefix must be provided
      if (data.quantity && data.quantity > 1) {
        return !!data.serialPrefix;
      }
      return true;
    },
    {
      message: "Serial prefix is required when creating multiple products",
      path: ["serialPrefix"],
    }
  )
  .refine(
    (data) => {
      // If quantity > 1, serialPrefix should be used (batch creation)
      // If quantity = 1 and serialPrefix is provided, use serialPrefix (for continuation)
      // If quantity = 1 and no serialPrefix, use serialCode (single product)
      if (data.quantity && data.quantity > 1) {
        return !data.serialCode || data.serialCode === ""; // Don't allow serialCode when batch creating
      }
      // If serialPrefix is provided (even with quantity = 1), don't allow serialCode
      if (data.serialPrefix && data.serialPrefix.trim() !== "") {
        return !data.serialCode || data.serialCode === "";
      }
      return true;
    },
    {
      message:
        "Cannot use serialCode when using serialPrefix. Use serialPrefix for batch creation or continuation.",
      path: ["serialCode"],
    }
  );

export type GramProductCreateInput = z.infer<typeof gramProductCreateSchema>;
