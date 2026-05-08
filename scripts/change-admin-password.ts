import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , email, nextPassword] = process.argv;

  if (!email || !nextPassword) {
    console.error("Usage: npm run admin:change-password -- <admin-email> <new-password>");
    process.exit(1);
  }

  if (nextPassword.length < 8) {
    console.error("New password must be at least 8 characters long.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`User not found for email: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(nextPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log(`Password updated for ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
