import { NextRequest, NextResponse } from "next/server";
import { 
  readStoredSchoolProfile, 
  writeStoredSchoolProfile 
} from "@/lib/school-profile-config";

export async function GET() {
  try {
    const profile = readStoredSchoolProfile();
    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = writeStoredSchoolProfile(body);
    return NextResponse.json({
      success: true,
      profile: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
