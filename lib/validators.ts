import { ItemCheckStatus } from "@prisma/client";
import { z } from "zod";
import { paymentMethodOptions } from "@/lib/sales";

export const loginSchema = z.object({
  email: z.string().email("請輸入有效的 Email"),
  password: z.string().min(4, "密碼至少需要 4 碼"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "請輸入目前密碼"),
    newPassword: z.string().min(8, "新密碼至少需要 8 碼"),
    confirmPassword: z.string().min(1, "請再次輸入新密碼"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "兩次輸入的新密碼不一致",
    path: ["confirmPassword"],
  });

export const purchaseOrderCreateSchema = z.object({
  title: z.string().min(1, "請輸入叫貨單標題"),
  supplierName: z.string().optional().default(""),
  orderDate: z.string().optional().default(""),
});

export const purchaseOrderItemInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "品項名稱不可空白"),
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
  checkerName: z.string().min(1, "請輸入清點人員名稱"),
  items: z.array(
    z.object({
      id: z.string(),
      receivedQuantity: z.number().nullable(),
      status: z.nativeEnum(ItemCheckStatus),
      staffNote: z.string().optional().default(""),
    }),
  ),
});

export const saleItemCreateSchema = z.object({
  item_name: z.string().trim().min(1, "品項名稱不可空白"),
  quantity: z.number().positive("數量必須大於 0"),
  unit_price: z.number().min(0, "單價不可小於 0"),
  item_note: z.string().optional().default(""),
});

export const saleCreateSchema = z.object({
  payment_method: z
    .string()
    .refine(
      (value): value is (typeof paymentMethodOptions)[number] =>
        paymentMethodOptions.includes(value as (typeof paymentMethodOptions)[number]),
      "請選擇付款方式",
    ),
  cashier: z.string().trim().min(1, "請輸入經手人"),
  note: z.string().optional().default(""),
  items: z.array(saleItemCreateSchema).min(1, "請至少輸入一個品項"),
});

export const saleVoidSchema = z.object({
  void_reason: z.string().trim().min(1, "請輸入作廢原因"),
  void_by: z.string().trim().min(1, "請輸入作廢人員"),
});
