import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { 
  ROLES, 
  APP_MENUS, 
  DEFAULT_PERMISSIONS, 
  resolveMenuPermission, 
  MenuPermission, 
  isSuperAdminRole 
} from "@/lib/roles-config";

const ROLES_FILE = path.join(process.cwd(), "data", "roles-permissions.json");

function readStoredPermissions(): Record<string, Record<string, MenuPermission>> {
  try {
    if (fs.existsSync(ROLES_FILE)) {
      const content = fs.readFileSync(ROLES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      const cleaned: Record<string, Record<string, MenuPermission>> = {};
      for (const [roleId, modules] of Object.entries(parsed)) {
        cleaned[roleId] = {};
        for (const [modId, perm] of Object.entries(modules as any)) {
          cleaned[roleId][modId] = resolveMenuPermission(perm as any);
        }
      }
      return cleaned;
    }
  } catch (err) {
    console.warn("Error reading roles-permissions.json, falling back to defaults:", err);
  }
  return DEFAULT_PERMISSIONS;
}

function writeStoredPermissions(data: Record<string, Record<string, MenuPermission>>) {
  try {
    const dir = path.dirname(ROLES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ROLES_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing roles-permissions.json:", err);
  }
}

// GET /api/roles - Fetch current role configurations & permissions
export async function GET() {
  try {
    const stored = readStoredPermissions();

    // Ensure all standard roles exist in response
    const resultPermissions: Record<string, Record<string, MenuPermission>> = {
      ...DEFAULT_PERMISSIONS,
      ...stored,
    };

    return NextResponse.json({
      success: true,
      roles: ROLES.filter((r) => r.id !== "saas-admin"),
      menus: APP_MENUS.filter((m) => !m.id.startsWith("saas-") && m.id !== "subscription-requests"),
      permissions: resultPermissions,
    });
  } catch (err: any) {
    console.error("GET /api/roles error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal memuat konfigurasi role: " + err.message },
      { status: 500 }
    );
  }
}

// POST /api/roles - Save/update permissions for a role or reset
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roleId, modules, reset, userRole: callerRole } = body;

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: "Role ID wajib disertakan." },
        { status: 400 }
      );
    }

    if (roleId === "saas-admin") {
      return NextResponse.json(
        { success: false, error: "Role SaaS Administrator adalah role internal perusahaan dan tidak dapat dimodifikasi di menu sekolah." },
        { status: 403 }
      );
    }

    const currentPermissions = readStoredPermissions();

    // If reset requested, revert this role to factory defaults
    if (reset) {
      const defaultForRole = DEFAULT_PERMISSIONS[roleId] || {};
      currentPermissions[roleId] = { ...defaultForRole };
      writeStoredPermissions(currentPermissions);

      // Sync with Firestore
      try {
        await setDoc(doc(db, "roles", roleId), {
          roleId,
          modules: defaultForRole,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore sync error on reset:", fsErr);
      }

      return NextResponse.json({
        success: true,
        message: `Hak akses role ${roleId} berhasil direset ke rekomendasi standar.`,
        permissions: currentPermissions[roleId],
      });
    }

    if (!modules || typeof modules !== "object") {
      return NextResponse.json(
        { success: false, error: "Data modules permission tidak valid." },
        { status: 400 }
      );
    }

    // Clean and normalize each module's permission
    const cleanedModules: Record<string, MenuPermission> = {};
    for (const [modId, perm] of Object.entries(modules)) {
      // Prevent non-super-admin from granting access to accounts
      if (modId === "accounts" && !isSuperAdminRole(callerRole)) {
        cleanedModules[modId] = resolveMenuPermission({
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          export: false,
        });
        continue;
      }
      cleanedModules[modId] = resolveMenuPermission(perm as any);
    }

    // Ensure legacy fallback module keys are maintained for backward compatibility
    if (!cleanedModules["users"] && cleanedModules["students"]) {
      cleanedModules["users"] = cleanedModules["students"];
    }
    if (!cleanedModules["academic"] && cleanedModules["schedule"]) {
      cleanedModules["academic"] = cleanedModules["schedule"];
    }
    if (!cleanedModules["finance"] && cleanedModules["payments"]) {
      cleanedModules["finance"] = cleanedModules["payments"];
    }

    // Update in stored permissions
    currentPermissions[roleId] = cleanedModules;

    // Apply aliases if role is student or parent
    if (roleId === "siswa") {
      currentPermissions["student"] = cleanedModules;
    } else if (roleId === "orang-tua") {
      currentPermissions["parent"] = cleanedModules;
      currentPermissions["orangtua"] = cleanedModules;
    } else if (roleId === "guru") {
      currentPermissions["teacher"] = cleanedModules;
    } else if (roleId === "kepala-sekolah") {
      currentPermissions["kepalasekolah"] = cleanedModules;
    }

    writeStoredPermissions(currentPermissions);

    // Sync to Firestore for real-time live notification
    try {
      await setDoc(doc(db, "roles", roleId), {
        roleId,
        modules: cleanedModules,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      if (roleId === "siswa") {
        await setDoc(doc(db, "roles", "student"), {
          roleId: "student",
          modules: cleanedModules,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } else if (roleId === "orang-tua") {
        await setDoc(doc(db, "roles", "parent"), {
          roleId: "parent",
          modules: cleanedModules,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } else if (roleId === "guru") {
        await setDoc(doc(db, "roles", "teacher"), {
          roleId: "teacher",
          modules: cleanedModules,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } else if (roleId === "kepala-sekolah") {
        await setDoc(doc(db, "roles", "kepalasekolah"), {
          roleId: "kepalasekolah",
          modules: cleanedModules,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (fsErr) {
      console.warn("Firestore sync error on update:", fsErr);
    }

    return NextResponse.json({
      success: true,
      message: `Konfigurasi hak akses role "${roleId}" berhasil disimpan dan diterapkan di seluruh sistem.`,
      permissions: cleanedModules,
    });
  } catch (err: any) {
    console.error("POST /api/roles error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan konfigurasi role: " + err.message },
      { status: 500 }
    );
  }
}
