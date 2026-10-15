import { auth, db } from "@/lib/firebase";
import { User, GoogleAuthProvider, signInWithPopup, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

/**
 * Checks if the user has completed onboarding and their profile data is complete.
 */
export function isUserOnboardingComplete(userData: any): boolean {
  if (!userData) return false;

  const role = (userData.role || "").toLowerCase().trim();

  // 1. Super Admin, Admin, Teachers, Parents, and school staff management roles never require student onboarding
  if (
    role === "super-admin" ||
    role === "superadmin" ||
    role === "admin" ||
    role === "guru" ||
    role === "teacher" ||
    role === "orang-tua" ||
    role === "parent" ||
    role === "kepala-sekolah" ||
    role === "principal" ||
    role === "owner" ||
    role === "developer" ||
    role === "staff" ||
    role === "tata-usaha" ||
    role === "bendahara"
  ) {
    return true;
  }

  // 2. Explicit incomplete check:
  // If explicitly marked as not completed or pending onboarding, it is NOT complete!
  if (
    userData.onboardingCompleted === false ||
    userData.status === "Belum Onboarding" ||
    userData.status === "BELUM_ONBOARDING"
  ) {
    return false;
  }

  // 3. Explicit completion flag
  if (userData.onboardingCompleted === true) {
    return true;
  }

  // 4. Any account with explicit Active status and complete data
  const isExplicitActive =
    userData.status === "Aktif" ||
    userData.status === "Active" ||
    userData.status === "AKTIF" ||
    userData.isActive === true;

  const hasBasicIdentity = Boolean((userData.name || userData.fullName || "").trim());
  const hasStudentIdentifier = Boolean(
    (userData.nisn && userData.nisn !== "-" && !userData.nisn.startsWith("TEMP-")) ||
    (userData.nis && userData.nis !== "-" && !userData.nis.startsWith("TEMP-"))
  );
  const hasClassAssignment = Boolean(
    (userData.className && userData.className !== "-") ||
    (userData.classId && userData.classId !== "-") ||
    (userData.class && userData.class !== "-") ||
    (userData.kelas && userData.kelas !== "-")
  );

  if (isExplicitActive && hasBasicIdentity && hasStudentIdentifier && hasClassAssignment) {
    return true;
  }

  return false;
}

/**
 * Determines where to redirect the user after successful authentication.
 */
export function getPostLoginRedirect(userData: any, targetRedirect?: string | null): string {
  const cleanTarget = (targetRedirect && targetRedirect !== "/login" && targetRedirect !== "/register" && targetRedirect !== "/onboarding")
    ? targetRedirect
    : "/dashboard";

  if (!userData) {
    return cleanTarget;
  }

  const role = (userData.role || "").toLowerCase().trim();

  // 1. Super Admin, Admin, Teachers, Parents, and staff ALWAYS go directly to dashboard
  if (
    role === "super-admin" ||
    role === "superadmin" ||
    role === "admin" ||
    role === "owner" ||
    role === "developer" ||
    role === "guru" ||
    role === "teacher" ||
    role === "kepala-sekolah" ||
    role === "principal" ||
    role === "orang-tua" ||
    role === "parent" ||
    role === "staff" ||
    role === "tata-usaha" ||
    role === "bendahara"
  ) {
    return cleanTarget;
  }

  // 2. Students who have not completed onboarding MUST go to /onboarding
  if (!isUserOnboardingComplete(userData)) {
    return "/onboarding";
  }

  return cleanTarget;
}

/**
 * Handles Google Sign-In with popup.
 * Strictly verifies whether the account exists in the PostgreSQL User table.
 * If the account does NOT exist in the database (or is deactivated), rejects the login,
 * signs out from Firebase, purges caches, and throws a clear Indonesian error message.
 * If valid, sets session cookie and returns authentic database profile and redirect URL.
 */
export async function executeGoogleAuth(): Promise<{
  user: User;
  redirectUrl: string;
  userData: any;
}> {
  let result: any;
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    result = await signInWithPopup(auth, provider);
  } catch (authErr: any) {
    const isUnauthorizedDomain =
      authErr?.code === "auth/unauthorized-domain" ||
      (typeof authErr?.message === "string" && authErr.message.includes("auth/unauthorized-domain"));

    if (isUnauthorizedDomain) {
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const errorMsg = `Domain '${currentHost}' belum diizinkan di Firebase Authentication. Tambahkan '${currentHost}' ke Authorized Domains di Firebase Console > Authentication > Settings > Authorized domains.`;
      const err = new Error(errorMsg);
      (err as any).code = "auth/unauthorized-domain";
      throw err;
    }
    throw authErr;
  }

  const user = result.user;
  const cleanEmail = (user.email || "").toLowerCase().trim();
  const sanitizedEmail = cleanEmail.replace(/[^a-z0-9]/g, "_");

  // 1. Check if explicitly marked in deleted_accounts
  let isDeletedAudit = false;
  try {
    const delByUid = await getDoc(doc(db, "deleted_accounts", user.uid));
    if (delByUid.exists()) isDeletedAudit = true;
  } catch (e) {}

  if (!isDeletedAudit && sanitizedEmail) {
    try {
      const delByEmail = await getDoc(doc(db, "deleted_accounts", sanitizedEmail));
      if (delByEmail.exists()) isDeletedAudit = true;
    } catch (e) {}
  }

  if (isDeletedAudit) {
    try {
      await deleteUser(user);
    } catch (e) {}
    try {
      await signOut(auth);
    } catch (e) {}
    try {
      localStorage.removeItem("quick_schools_auth_session_v3");
      localStorage.removeItem("quick_schools_auth_session");
      localStorage.removeItem("qs_auth_role_cache_v1");
      sessionStorage.clear();
    } catch (e) {}
    throw new Error("Akun Google ini telah dihapus oleh Administrator dan tidak dapat digunakan lagi.");
  }

  // 2. STRICT CHECK: Verify that the account exists in PostgreSQL User table!
  let dbCheckRes: Response;
  let dbCheckData: any;
  try {
    dbCheckRes = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: cleanEmail,
        uid: user.uid,
        displayName: user.displayName,
        photoUrl: user.photoURL,
      }),
    });
    dbCheckData = await dbCheckRes.json();
  } catch (fetchErr: any) {
    console.error("Failed to connect to /api/auth/google:", fetchErr);
    try {
      await signOut(auth);
    } catch (e) {}
    throw new Error("Gagal menghubungkan ke server untuk verifikasi akun database. Silakan coba beberapa saat lagi.");
  }

  // 3. If account does NOT exist in PostgreSQL (or is deactivated), strictly reject!
  if (!dbCheckRes.ok || !dbCheckData.success || !dbCheckData.user) {
    // Purge session from Firebase
    try {
      await signOut(auth);
    } catch (e) {}

    // Purge any residual Firestore docs for this user to prevent ghost states
    try {
      await deleteDoc(doc(db, "users", user.uid));
      if (sanitizedEmail) {
        await deleteDoc(doc(db, "users", sanitizedEmail));
      }
    } catch (e) {}

    // Purge client session caches
    try {
      localStorage.removeItem("quick_schools_auth_session_v3");
      localStorage.removeItem("quick_schools_auth_session");
      localStorage.removeItem("qs_auth_role_cache_v1");
      sessionStorage.clear();
    } catch (e) {}

    const rejectionMessage =
      dbCheckData.error ||
      "Akun Google ini belum terdaftar di tabel akun database sekolah. Silakan hubungi Administrator untuk mendaftarkan akun Anda terlebih dahulu.";

    throw new Error(rejectionMessage);
  }

  // 4. Account is valid and verified in PostgreSQL!
  const dbUser = dbCheckData.user;

  // Sync / update Firestore user doc with official database data
  try {
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        id: dbUser.id,
        email: cleanEmail,
        name: dbUser.name || user.displayName || cleanEmail.split("@")[0],
        fullName: dbUser.name || user.displayName || "",
        photoUrl: user.photoURL || dbUser.avatarUrl || "",
        role: dbUser.role,
        status: dbUser.status,
        onboardingCompleted: dbUser.onboardingCompleted,
        authProvider: "google",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (syncErr) {
    console.warn("Firestore sync warning on Google login:", syncErr);
  }

  // Set fresh activity timestamp for idle timeout manager
  try {
    localStorage.setItem("quick_schools_last_activity_timestamp", Date.now().toString());
  } catch (e) {}

  const redirectUrl = getPostLoginRedirect(dbUser);
  return { user, redirectUrl, userData: dbUser };
}
