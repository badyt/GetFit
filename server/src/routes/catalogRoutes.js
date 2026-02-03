const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * GET /catalog/foods
 * Get all foods
 */
router.get("/foods", async (req, res) => {
  try {
    const foods = await prisma.food.findMany({
      select: {
        id: true,
        name: true,
        caloriesPer100g: true,
        proteinPer100g: true,
        image: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json({
      success: true,
      data: foods,
    });
  } catch (error) {
    console.error("Error fetching foods:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch foods",
    });
  }
});

/**
 * GET /catalog/exercises
 * Get all exercises grouped by category
 */
router.get("/exercises", async (req, res) => {
  try {
    const categories = await prisma.exerciseCategory.findMany({
      select: {
        id: true,
        name: true,
        exercises: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true,
          },
          orderBy: {
            name: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching exercises:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exercises",
    });
  }
});

module.exports = router;
