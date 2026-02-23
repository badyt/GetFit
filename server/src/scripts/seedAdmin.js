/**
 * seedAdmin.js — Idempotent admin user seeder
 *
 * Creates the initial ADMIN account if one does not already exist.
 * Credentials are read from environment variables:
 *   ADMIN_EMAIL    (required)
 *   ADMIN_PASSWORD (required)
 *   ADMIN_NAME     (optional, defaults to "Admin")
 *
 * Safe to run multiple times — skips if any ADMIN user already exists.
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || "Admin";

    if (!email || !password) {
      console.log(
        "⚠️  ADMIN_EMAIL and ADMIN_PASSWORD not set — skipping admin seed."
      );
      return;
    }

    // Check if ANY admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      console.log(
        `✅ Admin account already exists (${existingAdmin.email}) — skipping.`
      );
      return;
    }

    // Check if the email is already taken by a non-admin user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Promote existing user to ADMIN
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: "ADMIN", isEmailVerified: true },
      });
      console.log(
        `✅ Existing user "${existingUser.name}" (${email}) promoted to ADMIN.`
      );
      return;
    }

    // Create new admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        isEmailVerified: true,
      },
    });

    console.log(`✅ Admin account created: ${email}`);
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
