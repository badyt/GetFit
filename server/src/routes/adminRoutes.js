const express = require("express");
const prisma = require("../../prisma/prisma");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticateToken, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticateToken, isAdmin);

// ─────────────────────────────────────────────
// Multer config for food & exercise images
// ─────────────────────────────────────────────
const makeStorage = (subDir) =>
    multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, "../../uploads", subDir);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
            cb(null, unique);
        },
    });

const imageFilter = (req, file, cb) => {
    const ok =
        /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase()) &&
        /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype);
    cb(ok ? null : new Error("Only image files are allowed"), ok);
};

const foodUpload = multer({ storage: makeStorage("food"), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const exerciseUpload = multer({ storage: makeStorage("exercises"), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────

/**
 * GET /admin/stats
 * Returns counts of users, trainers, trainees, foods, exercises
 */
router.get("/stats", async (req, res) => {
    try {
        const [totalUsers, trainers, trainees, admins, foods, exercises, categories] =
            await Promise.all([
                prisma.user.count(),
                prisma.user.count({ where: { role: "TRAINER" } }),
                prisma.user.count({ where: { role: "TRAINEE" } }),
                prisma.user.count({ where: { role: "ADMIN" } }),
                prisma.food.count(),
                prisma.exercise.count(),
                prisma.exerciseCategory.count(),
            ]);

        res.json({
            success: true,
            data: { totalUsers, trainers, trainees, admins, foods, exercises, categories },
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ success: false, message: "Failed to load stats" });
    }
});

// ─────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────

/**
 * GET /admin/users
 * List all users (with optional role filter & search)
 */
router.get("/users", async (req, res) => {
    try {
        const { role, search } = req.query;

        const where = {};
        if (role && ["TRAINER", "TRAINEE", "ADMIN"].includes(role.toUpperCase())) {
            where.role = role.toUpperCase();
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                profilePicture: true,
                isEmailVerified: true,
                createdAt: true,
                trainerId: true,
                trainer: { select: { id: true, name: true } },
                _count: { select: { trainees: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        res.json({ success: true, data: users });
    } catch (error) {
        console.error("Admin list users error:", error);
        res.status(500).json({ success: false, message: "Failed to list users" });
    }
});

/**
 * PATCH /admin/users/:id/promote
 * Promote a TRAINEE to TRAINER
 */
router.patch("/users/:id/promote", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, role: true, name: true },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (user.role !== "TRAINEE") {
            return res.status(400).json({
                success: false,
                message: `Cannot promote — user is already a ${user.role}`,
            });
        }

        // Promotion: set role to TRAINER, remove trainer relationship
        const updated = await prisma.user.update({
            where: { id },
            data: { role: "TRAINER", trainerId: null },
            select: { id: true, name: true, email: true, role: true },
        });

        res.json({
            success: true,
            message: `${updated.name} promoted to TRAINER`,
            data: updated,
        });
    } catch (error) {
        console.error("Admin promote error:", error);
        res.status(500).json({ success: false, message: "Failed to promote user" });
    }
});

/**
 * DELETE /admin/users/:id
 * Delete a user entirely (cannot delete yourself)
 */
router.delete("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ success: false, message: "You cannot delete yourself" });
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, role: true },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // If deleting a trainer, unlink their trainees first
        if (user.role === "TRAINER") {
            await prisma.user.updateMany({
                where: { trainerId: id },
                data: { trainerId: null },
            });
        }

        await prisma.user.delete({ where: { id } });

        res.json({
            success: true,
            message: `${user.name} (${user.role}) deleted successfully`,
        });
    } catch (error) {
        console.error("Admin delete user error:", error);
        res.status(500).json({ success: false, message: "Failed to delete user" });
    }
});

// ─────────────────────────────────────────────
// Food Management
// ─────────────────────────────────────────────

/**
 * GET /admin/foods
 * List all food items
 */
router.get("/foods", async (req, res) => {
    try {
        const foods = await prisma.food.findMany({ orderBy: { name: "asc" } });
        res.json({ success: true, data: foods });
    } catch (error) {
        console.error("Admin list foods error:", error);
        res.status(500).json({ success: false, message: "Failed to list foods" });
    }
});

/**
 * POST /admin/foods
 * Add a new food item (multipart/form-data with optional image)
 */
router.post("/foods", foodUpload.single("image"), async (req, res) => {
    try {
        const { name, caloriesPer100g, proteinPer100g } = req.body;

        if (!name || caloriesPer100g == null || proteinPer100g == null) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: "Name, caloriesPer100g, and proteinPer100g are required",
            });
        }

        // Check for duplicate name
        const existing = await prisma.food.findFirst({
            where: { name: { equals: name, mode: "insensitive" } },
        });
        if (existing) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(409).json({
                success: false,
                message: `A food named "${name}" already exists`,
            });
        }

        const food = await prisma.food.create({
            data: {
                name: name.trim(),
                caloriesPer100g: parseFloat(caloriesPer100g),
                proteinPer100g: parseFloat(proteinPer100g),
                image: req.file ? `/uploads/food/${req.file.filename}` : null,
            },
        });

        res.status(201).json({ success: true, data: food });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        console.error("Admin add food error:", error);
        res.status(500).json({ success: false, message: "Failed to add food" });
    }
});

/**
 * DELETE /admin/foods/:id
 * Delete a food item
 */
router.delete("/foods/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const food = await prisma.food.findUnique({ where: { id } });
        if (!food) {
            return res.status(404).json({ success: false, message: "Food not found" });
        }

        await prisma.food.delete({ where: { id } });
        res.json({ success: true, message: `${food.name} deleted` });
    } catch (error) {
        console.error("Admin delete food error:", error);
        res.status(500).json({ success: false, message: "Failed to delete food" });
    }
});

// ─────────────────────────────────────────────
// Exercise Management
// ─────────────────────────────────────────────

/**
 * GET /admin/categories
 * List all exercise categories
 */
router.get("/categories", async (req, res) => {
    try {
        const categories = await prisma.exerciseCategory.findMany({
            select: { id: true, name: true, _count: { select: { exercises: true } } },
            orderBy: { name: "asc" },
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error("Admin list categories error:", error);
        res.status(500).json({ success: false, message: "Failed to list categories" });
    }
});

/**
 * GET /admin/exercises
 * List all exercises grouped by category
 */
router.get("/exercises", async (req, res) => {
    try {
        const exercises = await prisma.exercise.findMany({
            include: { category: { select: { id: true, name: true } } },
            orderBy: { name: "asc" },
        });
        res.json({ success: true, data: exercises });
    } catch (error) {
        console.error("Admin list exercises error:", error);
        res.status(500).json({ success: false, message: "Failed to list exercises" });
    }
});

/**
 * POST /admin/exercises
 * Add a new exercise (multipart/form-data with optional image)
 */
router.post("/exercises", exerciseUpload.single("image"), async (req, res) => {
    try {
        const { name, description, categoryName, categoryId } = req.body;
        if (!name || (!categoryName && !categoryId)) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: "Name and categoryName or categoryId are required",
            });
        }
        // Resolve category
        let resolvedCategoryId = categoryId;
        if (categoryName && !categoryId) {
            const cat = await prisma.exerciseCategory.upsert({
                where: { name: categoryName.trim() },
                update: {},
                create: { name: categoryName.trim() },
            });
            resolvedCategoryId = cat.id;
        }
        // Check for duplicate name in same category
        const existing = await prisma.exercise.findFirst({
            where: {
                name: { equals: name, mode: "insensitive" },
                categoryId: resolvedCategoryId,
            },
        });
        if (existing) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(409).json({
                success: false,
                message: `An exercise named "${name}" already exists in this category`,
            });
        }
        const exercise = await prisma.exercise.create({
            data: {
                name: name.trim(),
                description: description || null,
                image: req.file ? `/uploads/exercises/${req.file.filename}` : null,
                categoryId: resolvedCategoryId,
            },
            include: { category: { select: { name: true } } },
        });
        res.status(201).json({ success: true, data: exercise });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        console.error("Admin add exercise error:", error);
        res.status(500).json({ success: false, message: "Failed to add exercise" });
    }
});

/**
 * DELETE /admin/exercises/:id
 * Delete an exercise
 */
router.delete("/exercises/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const exercise = await prisma.exercise.findUnique({ where: { id } });
        if (!exercise) {
            return res.status(404).json({ success: false, message: "Exercise not found" });
        }

        await prisma.exercise.delete({ where: { id } });
        res.json({ success: true, message: `${exercise.name} deleted` });
    } catch (error) {
        console.error("Admin delete exercise error:", error);
        res.status(500).json({ success: false, message: "Failed to delete exercise" });
    }
});

module.exports = router;
