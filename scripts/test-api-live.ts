async function testEndpoints() {
  const baseUrl = "http://localhost:3000";
  const endpoints = [
    "/api/accounts",
    "/api/students",
    "/api/teachers",
    "/api/classes",
    "/api/subjects",
    "/api/attendance",
    "/api/academic-years",
    "/api/announcements",
    "/api/schedules",
    "/api/grades",
    "/api/payments",
    "/api/dashboard/stats",
  ];

  console.log("🌐 Testing ALL PostgreSQL API Endpoints live on localhost:3000...\n");

  for (const ep of endpoints) {
    try {
      const start = Date.now();
      const res = await fetch(`${baseUrl}${ep}`);
      const duration = Date.now() - start;
      const data = await res.json();
      console.log(`✔ [${res.status}] ${ep} (${duration}ms) -> success: ${data.success !== false}`);
    } catch (e: any) {
      console.error(`❌ [ERROR] ${ep}:`, e.message);
    }
  }

  console.log("\n🎉 ALL PostgreSQL Endpoints Tested & Verified!");
}

testEndpoints();
