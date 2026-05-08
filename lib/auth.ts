import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

const SESSION_COOKIE = "incoming-check-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  role: UserRole;
  name: string;
  exp: number;
};

export type SessionUser = Omit<SessionPayload, "exp">;

function getSecret() {
  return process.env.SESSION_SECRET || "local-dev-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function encode(payload: SessionPayload) {
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${base}.${sign(base)}`;
}

function decode(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const [base, providedSignature] = token.split(".");
  if (!base || !providedSignature) return null;
  const expectedSignature = sign(base);
  if (providedSignature.length !== expectedSignature.length) return null;
  const isValid = timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature),
  );
  if (!isValid) return null;
  const parsed = JSON.parse(Buffer.from(base, "base64url").toString("utf8")) as SessionPayload;
  if (parsed.exp < Date.now()) return null;
  return parsed;
}

export async function setSessionCookie(session: SessionUser) {
  const cookieStore = await cookies();
  const token = encode({
    ...session,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = decode(token);
  if (!payload) return null;

  return {
    userId: payload.userId,
    role: payload.role,
    name: payload.name,
  } satisfies SessionUser;
}

export function getSessionFromToken(token?: string | null) {
  const payload = decode(token);
  if (!payload) return null;

  return {
    userId: payload.userId,
    role: payload.role,
    name: payload.name,
  } satisfies SessionUser;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    redirect("/login");
  }
  return session;
}
