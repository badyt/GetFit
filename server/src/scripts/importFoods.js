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
    const FILE = process.argv[2] || "data/foodJson.json";
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    const foods = data.foods || [];

    let created = 0;
    let updated = 0;

    for (const f of foods) {
      const name = (f.name || "").trim();
      if (!name) continue;

      const existing = await prisma.food.findFirst({
        where: { name },
      });

      if (existing) {
        await prisma.food.update({
          where: { id: existing.id },
          data: {
            caloriesPer100g: f.caloriesPer100g ?? existing.caloriesPer100g,
            proteinPer100g: f.proteinPer100g ?? existing.proteinPer100g,
          },
        });
        updated++;
      } else {
        await prisma.food.create({
          data: {
            name,
            caloriesPer100g: f.caloriesPer100g ?? 0,
            proteinPer100g: f.proteinPer100g ?? 0,
          },
        });
        created++;
      }
    }

    const total = await prisma.food.count();
    console.log(`✅ Foods imported: ${created} created, ${updated} updated. Total: ${total}`);
  } catch (error) {
    console.error("❌ Error importing foods:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
