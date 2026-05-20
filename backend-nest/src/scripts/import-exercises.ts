/**
 * Idempotent exercise importer. Safe to run multiple times.
 *
 * Usage: npm run script:import-exercises [path/to/exercises.json]
 * Default file: data/exercisesJson.json
 *
 * Expected JSON shape: { "exercises": [{ "name", "category?", "description?", "image?" }] }
 * Categories are upserted automatically — no pre-seeding required.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';

interface ExerciseEntry {
  name?: string;
  category?: string;
  description?: string;
  image?: string;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is missing in .env');

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const file = process.argv[2] ?? 'data/exercisesJson.json';
  if (!existsSync(file)) {
    console.log(`⚠️  Data file not found: ${file} — skipping.`);
    return;
  }
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { exercises?: ExerciseEntry[] };
  const exercises = raw.exercises ?? [];

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const ex of exercises) {
    const name = (ex.name ?? '').trim();
    if (!name) { skipped++; continue; }

    const categoryName = (ex.category ?? 'Uncategorized').trim();

    const category = await prisma.exerciseCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName, description: null },
    });

    const existing = await prisma.exercise.findFirst({
      where: { name, categoryId: category.id },
    });

    if (existing) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          description: ex.description ?? existing.description,
          image: ex.image ?? existing.image,
        },
      });
      updated++;
    } else {
      await prisma.exercise.create({
        data: {
          name,
          description: ex.description ?? null,
          image: ex.image ?? null,
          categoryId: category.id,
        },
      });
      created++;
    }
  }

  const total = await prisma.exercise.count();
  const catTotal = await prisma.exerciseCategory.count();
  console.log(
    `✅ Exercises: ${created} created, ${updated} updated, ${skipped} skipped. Total: ${total} exercises in ${catTotal} categories`,
  );
}

main()
  .catch((err: unknown) => {
    console.error('❌ Error importing exercises:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
