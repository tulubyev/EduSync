import { Router, Request, Response } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth";
import multer from "multer";
import sharp from "sharp";

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const router = Router();

// Configure multer for photo uploads (memory storage)
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

    // Return user profile without password hash, return profile image as data URI
    const { passwordHash, profileImage, ...profileData } = user;
    
    // Generate smaller avatar for sidebar (48x48) from stored base64
    let profileImageAvatar = null;
    if (profileImage) {
      const avatarBuffer = await sharp(Buffer.from(profileImage, "base64"))
        .webp({ quality: 90 })
        .resize(48, 48, {
          fit: "cover",
          position: "center",
        })
        .toBuffer();
      profileImageAvatar = `data:image/webp;base64,${avatarBuffer.toString("base64")}`;
    }
    
    const responseData = {
      ...profileData,
      profileImageUrl: profileImage ? `data:image/webp;base64,${profileImage}` : null,
      profileImageAvatar,
    };
    res.json(responseData);
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

    const { passwordHash, profileImage, ...profileData } = updatedUser;
    
    // Generate smaller avatar for sidebar (48x48) from stored base64
    let profileImageAvatar = null;
    if (profileImage) {
      const avatarBuffer = await sharp(Buffer.from(profileImage, "base64"))
        .webp({ quality: 90 })
        .resize(48, 48, {
          fit: "cover",
          position: "center",
        })
        .toBuffer();
      profileImageAvatar = `data:image/webp;base64,${avatarBuffer.toString("base64")}`;
    }
    
    const responseData = {
      ...profileData,
      profileImageUrl: profileImage ? `data:image/webp;base64,${profileImage}` : null,
      profileImageAvatar,
    };
    res.json(responseData);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Ошибка обновления профиля" });
  }
});

// Upload profile photo - stored directly in database
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

      // Convert image to WebP and optimize - create full size version
      const webpBuffer = await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .resize(400, 400, {
          fit: "cover",
          position: "center",
        })
        .toBuffer();

      // Convert to base64 for storage in database
      const base64Image = webpBuffer.toString("base64");

      // Update user with photo stored in database
      const [updatedUser] = await db
        .update(users)
        .set({
          profileImage: base64Image,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      console.log("✅ Profile photo uploaded to database:", { userId, size: base64Image.length });

      // Generate smaller avatar for sidebar (48x48)
      const avatarBuffer = await sharp(req.file.buffer)
        .webp({ quality: 90 })
        .resize(48, 48, {
          fit: "cover",
          position: "center",
        })
        .toBuffer();
      const base64Avatar = avatarBuffer.toString("base64");

      const { passwordHash, profileImage, ...profileData } = updatedUser;
      const responseData = {
        ...profileData,
        profileImageUrl: profileImage ? `data:image/webp;base64,${profileImage}` : null,
        profileImageAvatar: profileImage ? `data:image/webp;base64,${base64Avatar}` : null,
      };
      res.json(responseData);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Ошибка загрузки фото" });
    }
  }
);

export default router;
