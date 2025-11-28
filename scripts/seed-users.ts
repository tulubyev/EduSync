import bcrypt from "bcrypt";
import db from "../server/db";

async function seedUsers() {
  const testUsers = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      email: "demo@example.com",
      phone: "+79000000011",
      firstName: "Demo",
      lastName: "User",
      password: "password"
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      email: "test2@example.com", 
      phone: "+79000000022",
      firstName: "Test",
      lastName: "User",
      password: "password123"
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      email: "alt@yachtdeck.ru",
      phone: "+79000000033",
      firstName: "Alt",
      lastName: "User",
      password: "owerktoo"
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      email: "admin@example.com",
      phone: "+79000000044",
      firstName: "Admin",
      lastName: "User",
      password: "admin123",
      adminRole: "super_admin"
    }
  ];

  for (const user of testUsers) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    console.log(`Password hash for ${user.email}:`, passwordHash);
  }
}

seedUsers().catch(console.error);
