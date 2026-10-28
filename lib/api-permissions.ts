import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { 
  PermissionAction, 
  MenuPermission, 
  DEFAULT_PERMISSIONS, 
  resolveMenuPermission, 
  isSuperAdminRole, 
  normalizeRole,
  ROUTE_TO_MENU_ID 
} from "@/lib/roles-config";

const ROLES_FILE = path.join(process.cwd(), "data", "roles-permissions.json");

/**
 * Loads current stored permissions from disk or fallback
 */
export function getStoredRolePermissions(): Record<string, Record<string, MenuPermission>> {
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
    console.warn("getStoredRolePermissions error, using defaults:", err);
  }
  return DEFAULT_PERMISSIONS;
}

/**
 * Checks whether a role has permission for a specific menu and action
 */
export function checkRolePermission(
  role: string | null | undefined,
  menuIdOrRoute: string,
  action: PermissionAction = "view"
): boolean {
  if (!role) return false;
  if (isSuperAdminRole(role)) return true;

  const menuId = ROUTE_TO_MENU_ID[menuIdOrRoute] || menuIdOrRoute;

  // Accounts is locked exclusively to Super Admin
  if (menuId === "accounts") {
    return isSuperAdminRole(role);
  }

  const stored = getStoredRolePermissions();
  const canonicalRole = normalizeRole(role);
  const rolePerms = stored[canonicalRole] || DEFAULT_PERMISSIONS[canonicalRole];

  if (rolePerms && rolePerms[menuId]) {
    const resolved = resolveMenuPermission(rolePerms[menuId]);
    return Boolean(resolved[action]);
  }

  return false;
}

/**
 * Returns a 403 Forbidden Response if permission check fails
 */
export function createForbiddenResponse(menu: string, action: PermissionAction, role: string) {
  const actionLabels: Record<PermissionAction, string> = {
    view: "melihat data / mengakses menu",
    create: "menambahkan data baru",
    edit: "mengubah data",
    delete: "menghapus data",
    approve: "memberikan persetujuan / verifikasi",
    export: "mengekspor data",
  };

  return NextResponse.json(
    {
      success: false,
      error: `Akses ditolak: Peran "${role}" tidak memiliki izin untuk ${actionLabels[action] || action} pada modul "${menu}".`,
      requiredPermission: { menu, action, role },
    },
    { status: 403 }
  );
}
