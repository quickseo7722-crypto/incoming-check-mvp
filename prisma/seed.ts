import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com";
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "admin1234";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Idempotent: never overwrite an existing admin's password or role.
    // Just make sure the account stays active. This protects manually rotated
    // passwords from being reset on every deploy.
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
      name: "老闆",
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
