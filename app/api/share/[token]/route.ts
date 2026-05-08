import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const order = await prisma.purchaseOrder.findFirst({
    where: { shareToken: token },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!order) return jsonError("分享連結無效或已失效", 404);
  return NextResponse.json({ order });
}
