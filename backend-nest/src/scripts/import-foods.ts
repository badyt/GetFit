/**
 * Idempotent food importer. Safe to run multiple times.
 *
 * Usage: npm run script:import-foods [path/to/foods.json]
 * Default file: data/foodJson.json
 *
 * Expected JSON shape: { "foods": [{ "name", "caloriesPer100g", "proteinPer100g", "image?" }] }
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';

interface FoodEntry {
  name?: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  image?: string;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is missing in .env');

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const file = process.argv[2] ?? 'data/foodJson.json';
  if (!existsSync(file)) {
    console.log(`⚠️  Data file not found: ${file} — skipping.`);
    return;
  }
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { foods?: FoodEntry[] };
  const foods = raw.foods ?? [];

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const f of foods) {
    const name = (f.name ?? '').trim();
    if (!name) { skipped++; continue; }

    const existing = await prisma.food.findFirst({ where: { name } });

    if (existing) {
      await prisma.food.update({
        where: { id: existing.id },
        data: {
          caloriesPer100g: f.caloriesPer100g ?? existing.caloriesPer100g,
          proteinPer100g: f.proteinPer100g ?? existing.proteinPer100g,
          image: f.image ?? existing.image,
        },
      });
      updated++;
    } else {
      await prisma.food.create({
        data: {
          name,
          caloriesPer100g: f.caloriesPer100g ?? 0,
          proteinPer100g: f.proteinPer100g ?? 0,
          image: f.image ?? null,
        },
      });
      created++;
    }
  }

  const total = await prisma.food.count();
  console.log(
    `✅ Foods: ${created} created, ${updated} updated, ${skipped} skipped. Total in DB: ${total}`,
  );
}

main()
  .catch((err: unknown) => {
    console.error('❌ Error importing foods:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
