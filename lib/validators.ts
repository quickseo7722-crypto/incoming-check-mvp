import { ItemCheckStatus } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("請輸入正確 Email"),
  password: z.string().min(4, "密碼至少 4 碼"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "請輸入目前密碼"),
    newPassword: z.string().min(8, "新密碼至少 8 碼"),
    confirmPassword: z.string().min(1, "請再次輸入新密碼"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "新密碼與確認新密碼必須一致",
    path: ["confirmPassword"],
  });

export const purchaseOrderCreateSchema = z.object({
  title: z.string().min(1, "請輸入叫貨單標題"),
  supplierName: z.string().optional().default(""),
  orderDate: z.string().optional().default(""),
});

export const purchaseOrderItemInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "品名不可空白"),
  spec: z.string().optional().default(""),
  orderedQuantity: z.number().nullable(),
  unit: z.string().optional().default(""),
  receivedQuantity: z.number().nullable().optional(),
  status: z.nativeEnum(ItemCheckStatus).default(ItemCheckStatus.UNCHECKED),
  staffNote: z.string().optional().default(""),
  bossNote: z.string().optional().default(""),
  note: z.string().optional().default(""),
  confidence: z.number().nullable().optional(),
  rawText: z.string().optional().default(""),
  checkedByName: z.string().optional().default(""),
});

export const purchaseOrderUpdateSchema = z.object({
  title: z.string().min(1, "請輸入叫貨單標題"),
  supplierName: z.string().optional().default(""),
  orderDate: z.string().optional().default(""),
  finalNote: z.string().optional().default(""),
  items: z.array(purchaseOrderItemInputSchema),
});

export const itemCheckSchema = z.object({
  receivedQuantity: z.number().nullable(),
  status: z.nativeEnum(ItemCheckStatus),
  staffNote: z.string().optional().default(""),
  checkerName: z.string().optional().default(""),
});

export const shareSubmitSchema = z.object({
  checkerName: z.string().min(1, "請輸入清點人名稱"),
  items: z.array(
    z.object({
      id: z.string(),
      receivedQuantity: z.number().nullable(),
      status: z.nativeEnum(ItemCheckStatus),
      staffNote: z.string().optional().default(""),
    }),
  ),
});
