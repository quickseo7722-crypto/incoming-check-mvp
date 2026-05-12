import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const paymentMethodOptions = ["現金", "轉帳", "Line Pay", "其他"] as const;
export type PaymentMethod = (typeof paymentMethodOptions)[number];
export type SaleStatus = "normal" | "void";

export const saleStatusOptions = ["all", "normal", "void"] as const;

export const saleStatusLabels: Record<SaleStatus, string> = {
  normal: "正常",
  void: "作廢",
};

export function getTodayDateString(base = new Date()) {
  return new Date(base.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isValidDateInput(value?: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function normalizeDateInput(value?: string | null, fallback = getTodayDateString()) {
  return isValidDateInput(value) ? value : fallback;
}

export function buildDateRange(startDate?: string | null, endDate?: string | null) {
  const normalizedStart = normalizeDateInput(startDate);
  const normalizedEnd = normalizeDateInput(endDate, normalizedStart);
  const safeStart = normalizedStart <= normalizedEnd ? normalizedStart : normalizedEnd;
  const safeEnd = normalizedStart <= normalizedEnd ? normalizedEnd : normalizedStart;
  const start = new Date(`${safeStart}T00:00:00+08:00`);
  const end = new Date(`${safeEnd}T00:00:00+08:00`);

  return {
    startDate: safeStart,
    endDate: safeEnd,
    range: {
      gte: start,
      lt: new Date(end.getTime() + 24 * 60 * 60 * 1000),
    },
  };
}

export function buildSingleDayRange(date?: string | null) {
  const safeDate = normalizeDateInput(date);
  return {
    date: safeDate,
    range: buildDateRange(safeDate, safeDate).range,
  };
}

export function toMoneyNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function formatDateTimeForApi(value: Date) {
  const local = new Date(value.getTime() + 8 * 60 * 60 * 1000).toISOString();
  return local.slice(0, 19).replace("T", " ");
}

export function serializeSaleSummary(sale: {
  id: string;
  saleNo: string;
  checkoutTime: Date;
  totalAmount: Prisma.Decimal | number;
  paymentMethod: string;
  cashier: string;
  note: string | null;
  status: string;
}) {
  return {
    id: sale.id,
    sale_no: sale.saleNo,
    checkout_time: formatDateTimeForApi(sale.checkoutTime),
    total_amount: toMoneyNumber(sale.totalAmount),
    payment_method: sale.paymentMethod,
    cashier: sale.cashier,
    note: sale.note || "",
    status: sale.status,
  };
}

export function serializeSaleDetail(sale: {
  id: string;
  saleNo: string;
  checkoutTime: Date;
  totalAmount: Prisma.Decimal | number;
  paymentMethod: string;
  cashier: string;
  note: string | null;
  status: string;
  voidReason?: string | null;
  voidTime?: Date | null;
  voidBy?: string | null;
  items: Array<{
    id: string;
    itemName: string;
    quantity: Prisma.Decimal | number;
    unitPrice: Prisma.Decimal | number;
    subtotal: Prisma.Decimal | number;
    itemNote: string | null;
  }>;
}) {
  return {
    ...serializeSaleSummary(sale),
    void_reason: sale.voidReason || "",
    void_time: sale.voidTime ? formatDateTimeForApi(sale.voidTime) : "",
    void_by: sale.voidBy || "",
    items: sale.items.map((item) => ({
      id: item.id,
      item_name: item.itemName,
      quantity: toMoneyNumber(item.quantity),
      unit_price: toMoneyNumber(item.unitPrice),
      subtotal: toMoneyNumber(item.subtotal),
      item_note: item.itemNote || "",
    })),
  };
}

export type SaleFilters = {
  startDate?: string | null;
  endDate?: string | null;
  paymentMethod?: string | null;
  cashier?: string | null;
  keyword?: string | null;
  status?: string | null;
};

export type SaleCreateInput = {
  paymentMethod: PaymentMethod;
  cashier: string;
  note?: string | null;
  items: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number;
    itemNote?: string | null;
  }>;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function createSaleRecord(input: SaleCreateInput) {
  const checkoutTime = new Date();
  const datePart = getTodayDateString(checkoutTime).replaceAll("-", "");
  const normalizedItems = input.items.map((item) => {
    const quantity = roundMoney(item.quantity);
    const unitPrice = roundMoney(item.unitPrice);
    const subtotal = roundMoney(quantity * unitPrice);

    return {
      itemName: item.itemName.trim(),
      quantity,
      unitPrice,
      subtotal,
      itemNote: item.itemNote?.trim() || null,
    };
  });
  const totalAmount = roundMoney(
    normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
  );

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const latestSale = await tx.sale.findFirst({
            where: {
              saleNo: {
                startsWith: `S${datePart}`,
              },
            },
            orderBy: {
              saleNo: "desc",
            },
            select: {
              saleNo: true,
            },
          });

          const nextSequence = latestSale ? Number(latestSale.saleNo.slice(-4)) + 1 : 1;
          const saleNo = `S${datePart}${String(nextSequence).padStart(4, "0")}`;

          return tx.sale.create({
            data: {
              saleNo,
              checkoutTime,
              totalAmount,
              paymentMethod: input.paymentMethod,
              cashier: input.cashier.trim(),
              note: input.note?.trim() || null,
              status: "normal",
              items: {
                create: normalizedItems,
              },
            },
            include: {
              items: {
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              },
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("sale_no_generation_failed");
}

export async function voidSaleRecord(id: string, input: { voidReason: string; voidBy: string }) {
  const existing = await prisma.sale.findUnique({
    where: { id },
  });

  if (!existing) {
    return { kind: "not_found" as const };
  }

  if (existing.status === "void") {
    return { kind: "already_void" as const };
  }

  const sale = await prisma.sale.update({
    where: { id },
    data: {
      status: "void",
      voidReason: input.voidReason.trim(),
      voidTime: new Date(),
      voidBy: input.voidBy.trim(),
    },
  });

  return { kind: "ok" as const, sale };
}

export async function listSales(filters: SaleFilters) {
  const { range, startDate, endDate } = buildDateRange(filters.startDate, filters.endDate);
  const paymentMethod = filters.paymentMethod && filters.paymentMethod !== "all" ? filters.paymentMethod : undefined;
  const cashier = filters.cashier?.trim();
  const keyword = filters.keyword?.trim();
  const status = filters.status && filters.status !== "all" ? filters.status : undefined;

  const sales = await prisma.sale.findMany({
    where: {
      checkoutTime: range,
      paymentMethod,
      status,
      ...(cashier
        ? {
            cashier: {
              contains: cashier,
              mode: "insensitive",
            },
          }
        : {}),
      ...(keyword
        ? {
            items: {
              some: {
                itemName: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
            },
          }
        : {}),
    },
    orderBy: [{ checkoutTime: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      saleNo: true,
      checkoutTime: true,
      totalAmount: true,
      paymentMethod: true,
      cashier: true,
      note: true,
      status: true,
    },
  });

  return {
    filters: {
      startDate,
      endDate,
      paymentMethod: paymentMethod || "all",
      cashier: cashier || "",
      keyword: keyword || "",
      status: status || "all",
    },
    sales,
  };
}

export async function getSaleDetailById(id: string) {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
}

export async function getDailyReport(date?: string | null) {
  const { date: safeDate, range } = buildSingleDayRange(date);
  const where = {
    status: "normal",
    checkoutTime: range,
  } satisfies Prisma.SaleWhereInput;

  const [summary, paymentSummary, itemSummary, cashierSummary] = await Promise.all([
    prisma.sale.aggregate({
      where,
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where,
      _sum: { totalAmount: true },
      _count: { _all: true },
      orderBy: { paymentMethod: "asc" },
    }),
    prisma.saleItem.groupBy({
      by: ["itemName"],
      where: {
        sale: where,
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: { itemName: "asc" },
    }),
    prisma.sale.groupBy({
      by: ["cashier"],
      where,
      _sum: { totalAmount: true },
      _count: { _all: true },
      orderBy: { cashier: "asc" },
    }),
  ]);

  return {
    date: safeDate,
    totalAmount: toMoneyNumber(summary._sum.totalAmount),
    transactionCount: summary._count._all,
    paymentSummary: paymentSummary
      .map((entry) => ({
        payment_method: entry.paymentMethod,
        amount: toMoneyNumber(entry._sum.totalAmount),
        count: entry._count._all,
      }))
      .sort((left, right) => right.amount - left.amount),
    itemSummary: itemSummary
      .map((entry) => ({
        item_name: entry.itemName,
        quantity: toMoneyNumber(entry._sum.quantity),
        amount: toMoneyNumber(entry._sum.subtotal),
      }))
      .sort((left, right) => right.amount - left.amount),
    cashierSummary: cashierSummary
      .map((entry) => ({
        cashier: entry.cashier,
        transaction_count: entry._count._all,
        amount: toMoneyNumber(entry._sum.totalAmount),
      }))
      .sort((left, right) => right.amount - left.amount),
  };
}
