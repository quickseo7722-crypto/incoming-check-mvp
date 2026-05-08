import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireCurrentAdminUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const auth = await requireCurrentAdminUser(request);
  if (!auth) return jsonError("無權限存取", 401);

  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "密碼格式不正確", 400);
  }

  const isMatch = await bcrypt.compare(parsed.data.currentPassword, auth.user.passwordHash);
  if (!isMatch) {
    return jsonError("目前密碼錯誤", 401);
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { passwordHash },
  });

  await createAuditLog({
    userId: auth.user.id,
    action: "admin_password_changed",
    targetType: "User",
    targetId: auth.user.id,
  });

  return NextResponse.json({ ok: true });
}
