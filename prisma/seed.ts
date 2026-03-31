import { PrismaClient, Role } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("Seeding database...");

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@clawmemaybe.com" },
  });

  if (existingAdmin) {
    console.log("Admin user already exists, skipping seed.");
    return;
  }

  // Create admin user with default password
  const defaultPassword = "admin123";
  const passwordHash = await hashPassword(defaultPassword);

  const admin = await prisma.user.create({
    data: {
      email: "admin@clawmemaybe.com",
      name: "Admin",
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log("Created admin user:");
  console.log(`  Email: ${admin.email}`);
  console.log(`  Password: ${defaultPassword}`);
  console.log("  ⚠️  Please change the default password after first login!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
