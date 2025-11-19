import { z } from "zod";

export const productCreateSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    weight: z.coerce.number().int().positive("Weight must be positive"),
    serialCode: z
      .string()
      .trim()
      .refine(
        (val) => !val || /^[A-Za-z0-9]+$/.test(val),
        {
          message: "Serial must be alphanumeric",
        }
      )
      .optional()
      .default(""),
    serialPrefix: z
      .string()
      .trim()
      .max(10)
      .refine(
        (val) => !val || /^[A-Za-z0-9]+$/.test(val),
        {
          message: "Serial prefix must be alphanumeric",
        }
      )
      .optional()
      .default(""),
    quantity: z.coerce.number().int().positive().max(10000, "Maximum 10000 products per batch").optional(),
    price: z.coerce.number().nonnegative().optional(),
    stock: z.coerce.number().int().nonnegative().optional(),
  })
  .refine(
    (data) => {
      // If quantity > 1, serialPrefix must be provided
      // If quantity = 1 and serialPrefix is provided, it's allowed (for continuation)
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
      message: "Cannot use serialCode when using serialPrefix. Use serialPrefix for batch creation or continuation.",
      path: ["serialCode"],
    }
  );

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

