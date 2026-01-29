const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const fs = require("fs");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });


async function main() {
  try {
    const FILE = process.argv[2] || "data/exercisesJson.json";
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    const exercises = data.exercises || [];

    let created = 0;
    let updated = 0;

    for (const ex of exercises) {
      const name = (ex.name || "").trim();
      if (!name) continue;

      const categoryName = (ex.category || "Uncategorized").trim();

      // Upsert category
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
    console.log(`✅ Exercises imported: ${created} created, ${updated} updated. Total: ${total} exercises in ${catTotal} categories`);
  } catch (error) {
    console.error("❌ Error importing exercises:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
