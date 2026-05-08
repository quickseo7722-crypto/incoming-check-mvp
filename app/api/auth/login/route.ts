import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "登入資料格式錯誤" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "帳號不存在或已停用" }, { status: 401 });
  }

  const isMatch = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!isMatch) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }

  await setSessionCookie({
    userId: user.id,
    role: user.role,
    name: user.name,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  });
}
