import { Router, Request, Response } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth";
import multer from "multer";

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const router = Router();

// Configure multer for photo uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
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

    // Return user profile without password hash
    const { passwordHash, profileImage, ...profileData } = user;
    
    const responseData = {
      ...profileData,
      profileImage: profileImage ? `data:image/jpeg;base64,${profileImage}` : null,
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
    
    const responseData = {
      ...profileData,
      profileImage: profileImage ? `data:image/jpeg;base64,${profileImage}` : null,
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

      // Convert image to base64 for storage in database
      const base64Image = req.file.buffer.toString("base64");

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

      const { passwordHash, profileImage, ...profileData } = updatedUser;
      const responseData = {
        ...profileData,
        profileImage: profileImage ? `data:image/jpeg;base64,${profileImage}` : null,
      };
      res.json(responseData);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Ошибка загрузки фото" });
    }
  }
);

// Get single user details (Admin only)
router.get("/admin/:userId", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const adminId = (req as any).user?.id;
    const adminRole = (req as any).user?.role;
    
    if (adminRole !== 'super_admin' && adminRole !== 'analytics_admin') {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const { userId } = req.params;
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const { passwordHash, profileImage, ...profileData } = user;
    const responseData = {
      ...profileData,
      profileImageUrl: profileImage ? `data:image/webp;base64,${profileImage}` : null,
    };
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Ошибка получения пользователя" });
  }
});

// Update user profile (Admin only)
router.put("/admin/:userId", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const adminRole = (req as any).user?.role;
    if (adminRole !== 'super_admin' && adminRole !== 'analytics_admin') {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const { userId } = req.params;
    const { firstName, lastName, email, phone, isEmailVerified, isPhoneVerified } = req.body;

    const [updatedUser] = await db
      .update(users)
      .set({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        isEmailVerified: isEmailVerified !== undefined ? isEmailVerified : undefined,
        isPhoneVerified: isPhoneVerified !== undefined ? isPhoneVerified : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    console.log("✅ User updated by admin:", { userId, email });

    const { passwordHash, profileImage, ...profileData } = updatedUser;
    const responseData = {
      ...profileData,
      profileImageUrl: profileImage ? `data:image/webp;base64,${profileImage}` : null,
    };
    res.json(responseData);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Ошибка обновления пользователя" });
  }
});

// Delete user (Admin only) - only unverified users
router.delete("/admin/:userId", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const adminRole = (req as any).user?.role;
    if (adminRole !== 'super_admin') {
      return res.status(403).json({ message: "Только super_admin может удалять пользователей" });
    }

    const { userId } = req.params;
    
    // Check if user is unverified
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (user.isEmailVerified || user.isPhoneVerified) {
      return res.status(400).json({ message: "Можно удалять только неподтвержденных пользователей" });
    }

    // Delete user
    await db.delete(users).where(eq(users.id, userId));
    console.log("✅ User deleted by admin:", { userId });
    
    res.json({ message: "Пользователь удален" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Ошибка удаления пользователя" });
  }
});

export default router;
