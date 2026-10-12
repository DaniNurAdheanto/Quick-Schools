import { prisma } from "../lib/prisma";
import * as bcrypt from "bcryptjs";
import { signSessionToken, verifySessionToken } from "../lib/jwt";

async function testAuth() {
  console.log("Testing PostgreSQL authentication backend...");

  // 1. Find user in database
  const user = await prisma.user.findUnique({
    where: { email: "dani@gmail.com" },
  });

  if (!user) {
    console.error("❌ User not found!");
    return;
  }

  console.log("✔ Found user:", user.email, `(${user.name})`);

  // 2. Test password verification
  const isMatch = await bcrypt.compare("asdasdasd", user.passwordHash || "");
  console.log("✔ Password comparison result:", isMatch ? "VALID (Match!)" : "INVALID");

  // 3. Test JWT signing & verification
  const token = await signSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: "super-admin",
    status: "Aktif",
  });

  console.log("✔ JWT Session Token generated successfully (length:", token.length, ")");

  const verified = await verifySessionToken(token);
  console.log("✔ JWT Verification payload:", verified?.email, `Role: ${verified?.role}`);

  console.log("🎉 All PostgreSQL Auth Backend Tests Passed Successfully!");
}

testAuth()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
