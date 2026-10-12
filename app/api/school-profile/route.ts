import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SCHOOL_PROFILE } from "@/context/SchoolProfileContext";

// Simple persistent store in memory / module state with defaults
let currentSchoolProfile = { ...DEFAULT_SCHOOL_PROFILE };

export async function GET() {
  return NextResponse.json({
    success: true,
    profile: currentSchoolProfile,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    currentSchoolProfile = {
      ...currentSchoolProfile,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json({
      success: true,
      profile: currentSchoolProfile,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
