import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Fetch Customers data
    const customers = await prisma.saaSCustomer.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch Subscription Requests data
    const requests = await prisma.subscriptionRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Aggregations
    const totalCustomers = customers.length;
    const activeSchools = customers.filter((c) => c.status === "AKTIF").length;
    const trialSchools = customers.filter((c) => c.status === "TRIAL").length;
    const suspendedSchools = customers.filter((c) => c.status === "SUSPENDED").length;
    const nonaktifSchools = customers.filter((c) => c.status === "NONAKTIF").length;

    const totalStudents = customers.reduce((sum, c) => sum + (c.currentStudents || 0), 0);
    const totalCapacity = customers.reduce((sum, c) => sum + (c.maxStudents || 0), 0);

    const monthlyRevenue = customers
      .filter((c) => c.status === "AKTIF" && c.billingCycle === "MONTHLY")
      .reduce((sum, c) => sum + (c.priceAmount || 0), 0);

    const yearlyRevenue = customers
      .filter((c) => c.status === "AKTIF" && c.billingCycle === "YEARLY")
      .reduce((sum, c) => sum + (c.priceAmount || 0), 0);

    // Requests breakdown
    const totalRequests = requests.length;
    const pendingRequests = requests.filter((r) => r.status === "PENDING").length; // Menunggu
    const inProgressRequests = requests.filter(
      (r) => r.status === "CONTACTED" || r.status === "OFFER_SENT"
    ).length; // Diproses
    const approvedRequests = requests.filter((r) => r.status === "APPROVED").length; // Disetujui
    const rejectedRequests = requests.filter((r) => r.status === "REJECTED").length; // Ditolak

    // Distribution by Plan
    const planCounts: Record<string, number> = {
      trial: 0,
      standard: 0,
      pro: 0,
      enterprise: 0,
    };
    customers.forEach((c) => {
      const p = c.plan.toLowerCase();
      planCounts[p] = (planCounts[p] || 0) + 1;
    });

    // Distribution by School Level
    const levelCounts: Record<string, number> = {};
    customers.forEach((c) => {
      levelCounts[c.schoolLevel] = (levelCounts[c.schoolLevel] || 0) + 1;
    });

    // Recent 5 customers
    const recentCustomers = customers.slice(0, 5).map((c) => ({
      id: c.id,
      customerCode: c.customerCode,
      schoolName: c.schoolName,
      schoolLevel: c.schoolLevel,
      city: c.city,
      picName: c.picName,
      picPhone: c.picPhone,
      plan: c.plan,
      status: c.status,
      currentStudents: c.currentStudents,
      subscriptionEnd: c.subscriptionEnd,
      createdAt: c.createdAt,
    }));

    // Recent 5 requests
    const recentRequests = requests.slice(0, 5).map((r) => ({
      id: r.id,
      requestNumber: r.requestNumber,
      schoolName: r.schoolName,
      schoolLevel: r.schoolLevel,
      picName: r.picName,
      picPhone: r.picPhone,
      planInterest: r.planInterest,
      status: r.status,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalCustomers,
          activeSchools,
          trialSchools,
          suspendedSchools,
          nonaktifSchools,
          totalStudents,
          totalCapacity,
          estimatedMonthlyRunRate: monthlyRevenue + Math.round(yearlyRevenue / 12),
          totalRequests,
          pendingRequests,
          inProgressRequests,
          approvedRequests,
          rejectedRequests,
          conversionRate:
            totalRequests > 0
              ? Math.round((approvedRequests / totalRequests) * 100)
              : 0,
        },
        distributions: {
          plans: planCounts,
          levels: levelCounts,
        },
        recentCustomers,
        recentRequests,
      },
    });
  } catch (err: any) {
    console.error("GET /api/saas-dashboard/stats error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat ringkasan dashboard SaaS" },
      { status: 500 }
    );
  }
}

