import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";

    // 1. Fetch Customers
    const customers = await prisma.saaSCustomer.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch Subscription Requests
    const requests = await prisma.subscriptionRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 3. Fetch Invoices
    const invoices = await prisma.saaSInvoice.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 4. Fetch Operation Logs
    const logs = await prisma.saaSOperationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    const now = new Date();
    let startDate: Date | null = null;
    if (period === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === "ytd") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Filter datasets if period is specified
    const scopedRequests = startDate
      ? requests.filter((r) => new Date(r.createdAt) >= startDate)
      : requests;
    const scopedInvoices = startDate
      ? invoices.filter((i) => new Date(i.createdAt) >= startDate)
      : invoices;

    // Aggregations
    const totalCustomers = customers.length;
    const activeSchools = customers.filter((c) => c.status === "AKTIF").length;
    const trialSchools = customers.filter((c) => c.status === "TRIAL").length;
    const suspendedSchools = customers.filter((c) => c.status === "SUSPENDED").length;
    const nonaktifSchools = customers.filter((c) => c.status === "NONAKTIF").length;

    const totalStudents = customers.reduce((sum, c) => sum + (c.currentStudents || 0), 0);
    const totalCapacity = customers.reduce((sum, c) => sum + (c.maxStudents || 0), 0);

    // Revenue calculations
    const totalPaidRevenue = invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const periodPaidRevenue = scopedInvoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const unpaidRevenue = invoices
      .filter((inv) => inv.status === "UNPAID")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const overdueRevenue = invoices
      .filter((inv) => inv.status === "OVERDUE")
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Recurring run rate (MRR & ARR)
    const monthlyRecurringRevenue = customers
      .filter((c) => c.status === "AKTIF")
      .reduce((sum, c) => {
        if (c.billingCycle === "YEARLY") {
          return sum + Math.round((c.priceAmount || 0) / 12);
        }
        return sum + (c.priceAmount || 0);
      }, 0);

    const annualRunRate = monthlyRecurringRevenue * 12;

    // Subscriptions expiring soon (within 30 days) or already expired
    const expiringSubscriptions = customers
      .filter((c) => c.subscriptionEnd)
      .map((c) => {
        const endDate = new Date(c.subscriptionEnd!);
        const diffMs = endDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return {
          id: c.id,
          customerCode: c.customerCode,
          schoolName: c.schoolName,
          schoolLevel: c.schoolLevel,
          plan: c.plan,
          status: c.status,
          picName: c.picName,
          picPhone: c.picPhone,
          subscriptionEnd: c.subscriptionEnd,
          daysLeft,
          isExpired: daysLeft <= 0,
        };
      })
      .filter((c) => c.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const expiringCount = expiringSubscriptions.length;

    // Requests breakdown
    const totalRequests = scopedRequests.length;
    const pendingRequests = scopedRequests.filter((r) => r.status === "PENDING").length;
    const inProgressRequests = scopedRequests.filter(
      (r) => r.status === "CONTACTED" || r.status === "OFFER_SENT"
    ).length;
    const approvedRequests = scopedRequests.filter((r) => r.status === "APPROVED").length;
    const rejectedRequests = scopedRequests.filter((r) => r.status === "REJECTED").length;
    const conversionRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;

    // Growth calculation (new customers this month vs total)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newCustomersThisMonth = customers.filter((c) => new Date(c.createdAt) >= thisMonthStart).length;
    const growthRate = totalCustomers > 0 ? Math.round((newCustomersThisMonth / totalCustomers) * 100) : 0;

    // Monthly Trends for Charts (Last 6 Months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const mYear = d.getFullYear();
      const nextM = new Date(mYear, mIdx + 1, 1);

      const custCount = customers.filter((c) => new Date(c.createdAt) < nextM).length;
      const reqCount = requests.filter((r) => {
        const rd = new Date(r.createdAt);
        return rd >= d && rd < nextM;
      }).length;
      const revAmount = invoices
        .filter((inv) => {
          const id = inv.paidAt ? new Date(inv.paidAt) : new Date(inv.createdAt);
          return inv.status === "PAID" && id >= d && id < nextM;
        })
        .reduce((sum, inv) => sum + inv.amount, 0);

      monthlyTrends.push({
        month: `${monthNames[mIdx]} ${mYear}`,
        shortMonth: monthNames[mIdx],
        customers: custCount,
        revenue: revAmount > 0 ? revAmount : Math.round(monthlyRecurringRevenue * (custCount / (totalCustomers || 1))),
        requests: reqCount,
      });
    }

    // Distribution by Plan
    const planConfig: Record<string, { name: string; color: string }> = {
      trial: { name: "Trial 14 Hari", color: "#F59E0B" },
      standard: { name: "Sekolah Rintisan", color: "#3B82F6" },
      pro: { name: "Sekolah Pro", color: "#531FFF" },
      enterprise: { name: "Yayasan Enterprise", color: "#10B981" },
    };

    const planStats: Record<string, { count: number; revenue: number; students: number }> = {
      trial: { count: 0, revenue: 0, students: 0 },
      standard: { count: 0, revenue: 0, students: 0 },
      pro: { count: 0, revenue: 0, students: 0 },
      enterprise: { count: 0, revenue: 0, students: 0 },
    };

    customers.forEach((c) => {
      const p = c.plan.toLowerCase();
      if (!planStats[p]) {
        planStats[p] = { count: 0, revenue: 0, students: 0 };
      }
      planStats[p].count += 1;
      planStats[p].revenue += c.priceAmount || 0;
      planStats[p].students += c.currentStudents || 0;
    });

    const planDistributions = Object.entries(planStats).map(([key, data]) => ({
      key,
      name: planConfig[key]?.name || key,
      count: data.count,
      revenue: data.revenue,
      students: data.students,
      percentage: totalCustomers > 0 ? Math.round((data.count / totalCustomers) * 100) : 0,
      color: planConfig[key]?.color || "#6B7280",
    }));

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

    // Recent operation logs
    const recentLogs = logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityName: l.entityName,
      description: l.description,
      performedBy: l.performedBy,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        period,
        summary: {
          totalCustomers,
          activeSchools,
          trialSchools,
          suspendedSchools,
          nonaktifSchools,
          totalStudents,
          totalCapacity,
          totalPaidRevenue,
          periodPaidRevenue,
          unpaidRevenue,
          overdueRevenue,
          mrr: monthlyRecurringRevenue,
          arr: annualRunRate,
          expiringCount,
          growthRate,
          totalRequests,
          pendingRequests,
          inProgressRequests,
          approvedRequests,
          rejectedRequests,
          conversionRate,
        },
        monthlyTrends,
        distributions: {
          plans: planDistributions,
          levels: levelCounts,
        },
        expiringSubscriptions,
        recentCustomers,
        recentRequests,
        recentLogs,
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
