import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email =
    process.env.ADMIN_EMAIL ||
    process.env.DEFAULT_ADMIN_EMAIL ||
    "admin@example.com";
  const password =
    process.env.ADMIN_PASSWORD ||
    process.env.DEFAULT_ADMIN_PASSWORD ||
    "admin1234";
  const name = process.env.ADMIN_NAME || "老闆";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Idempotent seed: do not overwrite an existing admin password.
    if (!existing.isActive) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      console.log(`Reactivated existing admin: ${email}`);
    } else {
      console.log(`Admin already exists (${email}); leaving credentials untouched.`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`Created default admin: ${email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
