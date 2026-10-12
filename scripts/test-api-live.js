async function testApi() {
  const baseUrl = "http://localhost:3000";
  const endpoints = [
    "/api/accounts",
    "/api/classes",
    "/api/teachers",
    "/api/students",
    "/api/subjects",
    "/api/schedules",
    "/api/grades",
    "/api/attendance",
    "/api/payments",
    "/api/announcements",
    "/api/parents",
    "/api/dashboard/stats",
    "/api/academic-years"
  ];

  console.log("🚀 Testing all Quick Schools PostgreSQL APIs...\n");
  let passed = 0;
  let failed = 0;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`);
      const data = await res.json();
      if (res.ok && (data.success || Array.isArray(data) || typeof data === 'object')) {
        console.log(`✅ [${res.status}] ${endpoint} - OK`);
        passed++;
      } else {
        console.error(`❌ [${res.status}] ${endpoint} - FAILED:`, data);
        failed++;
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${endpoint}:`, err.message);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

testApi();
