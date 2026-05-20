/**
 * Idempotent admin user seeder. Safe to run multiple times.
 *
 * Required env vars: ADMIN_EMAIL, ADMIN_PASSWORD
 * Optional env vars: ADMIN_NAME (defaults to "Admin")
 *
 * Behaviour:
 *   - Skips if any ADMIN user already exists
 *   - Promotes the existing user if the email is taken by a non-admin
 *   - Creates a new ADMIN user otherwise
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is missing in .env');

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    console.log('⚠️  ADMIN_EMAIL and ADMIN_PASSWORD not set — skipping admin seed.');
    return;
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (existingAdmin) {
    console.log(`✅ Admin already exists (${existingAdmin.email}) — skipping.`);
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: 'ADMIN', isEmailVerified: true },
    });
    console.log(`✅ Existing user "${existingUser.name}" (${email}) promoted to ADMIN.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: hashedPassword, role: 'ADMIN', isEmailVerified: true },
  });
  console.log(`✅ Admin account created: ${email}`);
}

main()
  .catch((err: unknown) => {
    console.error('❌ Error seeding admin:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
