import { Router, Request, Response } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const router = Router();

// Configure multer for photo uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"));
    }
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads", "profiles");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get user profile
router.get("/profile", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Не авторизован" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    // Return user profile without password hash
    const { passwordHash, ...profileData } = user;
    res.json(profileData);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Ошибка получения профиля" });
  }
});

// Update user profile
router.post("/profile", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Не авторизован" });
    }

    const { email, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !phone) {
      return res.status(400).json({ message: "Отсутствуют необходимые поля" });
    }

    // Check if email is already taken by another user
    if (email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: "Этот email уже используется" });
      }
    }

    // Check if phone is already taken by another user
    if (phone) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone));

      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: "Этот телефон уже используется" });
      }
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        email,
        firstName,
        lastName,
        phone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    console.log("✅ User profile updated:", { userId, email, phone });

    const { passwordHash, ...profileData } = updatedUser;
    res.json(profileData);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Ошибка обновления профиля" });
  }
});

// Upload profile photo
router.post(
  "/profile/photo",
  authenticateToken as any,
  upload.single("photo"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Не авторизован" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Файл не загружен" });
      }

      // Generate unique filename
      const filename = `${userId}-${Date.now()}.webp`;
      const filepath = path.join(uploadsDir, filename);

      // Convert and optimize image
      await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .resize(400, 400, {
          fit: "cover",
          position: "center",
        })
        .toFile(filepath);

      // Update user with new photo URL
      const photoUrl = `/uploads/profiles/${filename}`;
      const [updatedUser] = await db
        .update(users)
        .set({
          profileImageUrl: photoUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      console.log("✅ Profile photo uploaded:", { userId, photoUrl });

      const { passwordHash, ...profileData } = updatedUser;
      res.json(profileData);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Ошибка загрузки фото" });
    }
  }
);

export default router;
