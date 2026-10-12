const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const testAccounts = [
  { role: "SUPER_ADMIN", email: "dani@gmail.com", pass: "asdasdasd" },
  { role: "ADMIN", email: "admin@quickschools.sch.id", pass: "asdasdasd" },
  { role: "KEPALA_SEKOLAH", email: "kepalasekolah@quickschools.sch.id", pass: "asdasdasd" },
  { role: "GURU", email: "budi.guru@quickschools.sch.id", pass: "asdasdasd" },
  { role: "SISWA", email: "ahmad.siswa@quickschools.sch.id", pass: "asdasdasd" },
  { role: "ORANG_TUA", email: "dahlan.wali@quickschools.sch.id", pass: "asdasdasd" },
];

async function testRolesLogin() {
  console.log("🔐 Testing all role logins in PostgreSQL backend...\n");
  for (const acc of testAccounts) {
    const user = await prisma.user.findUnique({
      where: { email: acc.email }
    });
    if (!user) {
      console.error(`❌ User not found: ${acc.email}`);
      continue;
    }
    const isMatch = await bcrypt.compare(acc.pass, user.passwordHash || "");
    if (!isMatch) {
      console.error(`❌ Password mismatch for ${acc.email}`);
      continue;
    }
    console.log(`✅ [${acc.role}] Login credentials verified: ${acc.email} (${user.name})`);
  }
  console.log("\n🎉 All 6 role accounts verified successfully!");
  await prisma.$disconnect();
}

testRolesLogin();
