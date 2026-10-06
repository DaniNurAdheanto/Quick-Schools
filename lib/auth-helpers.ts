import { auth, db } from "@/lib/firebase";
import { User, GoogleAuthProvider, signInWithPopup, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Checks if the user has completed onboarding and their profile data is complete in Firestore.
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

  // 2. Explicit completion flag
  if (userData.onboardingCompleted === true) {
    return true;
  }

  // 3. Any account with explicit Active status is considered complete
  const isExplicitActive =
    userData.status === "Aktif" ||
    userData.status === "Active" ||
    userData.isActive === true;

  // 4. Check for data completeness
  const hasBasicIdentity = Boolean((userData.name || userData.fullName || "").trim());
  const hasClassAssignment = Boolean(
    (userData.className && userData.className !== "-") ||
    (userData.classId && userData.classId !== "-") ||
    (userData.class && userData.class !== "-") ||
    (userData.kelas && userData.kelas !== "-")
  );
  const hasStudentIdentifier = Boolean(
    (userData.nisn && userData.nisn !== "-") ||
    (userData.nis && userData.nis !== "-") ||
    (userData.id && userData.id !== "-" && !userData.id.startsWith("TEMP-"))
  );
  const hasBioDetails = Boolean(
    (userData.phone && userData.phone !== "-") ||
    (userData.address && userData.address !== "-") ||
    userData.parentPhone ||
    userData.fatherName ||
    userData.motherName ||
    userData.guardianName
  );

  const hasStudentData = hasClassAssignment || hasStudentIdentifier || hasBioDetails;
  const hasTeacherData = Boolean(
    (userData.nip && userData.nip !== "-") ||
    userData.subject ||
    (userData.subjects && userData.subjects.length > 0)
  );
  const hasParentData = Boolean(
    (userData.studentIds && userData.studentIds.length > 0) ||
    (userData.linkedStudentIds && userData.linkedStudentIds.length > 0) ||
    (userData.studentId && userData.studentId !== "-") ||
    userData.studentName
  );

  const isDataComplete =
    hasBasicIdentity &&
    (role === "guru" || role === "teacher"
      ? hasTeacherData
      : role === "orang-tua" || role === "parent"
      ? hasParentData
      : hasStudentData);

  // If the account is explicitly active OR its profile data is complete, it is COMPLETE!
  if (isExplicitActive || isDataComplete) {
    // Only block if explicitly set to "Belum Onboarding" AND data is completely empty
    if (userData.status === "Belum Onboarding" && !isDataComplete) {
      return false;
    }
    return true;
  }

  // 5. Incomplete if explicitly marked "Belum Onboarding" or onboardingCompleted is false with missing data
  if (userData.status === "Belum Onboarding" || userData.onboardingCompleted === false) {
    return false;
  }

  return true;
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

  // 2. Active accounts or accounts that completed onboarding ALWAYS go to dashboard
  const isExplicitActive =
    userData.status === "Aktif" ||
    userData.status === "Active" ||
    userData.isActive === true;
  if (isExplicitActive || userData.onboardingCompleted === true) {
    return cleanTarget;
  }

  // 3. If their profile data is complete, go directly to dashboard
  if (isUserOnboardingComplete(userData)) {
    return cleanTarget;
  }

  // 4. ONLY explicitly pending new students go to onboarding
  if (userData.status === "Belum Onboarding" && userData.onboardingCompleted === false) {
    return "/onboarding";
  }

  return cleanTarget;
}

/**
 * Handles Google Sign-In with popup, checks deletion/activation status in Firestore,
 * provisions new users with pending onboarding status if first time,
 * and returns the appropriate redirect destination.
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

  // Check if account was deleted
  let isDeleted = false;
  try {
    const delByUid = await getDoc(doc(db, "deleted_accounts", user.uid));
    if (delByUid.exists()) isDeleted = true;
  } catch (e) {}

  if (!isDeleted && sanitizedEmail) {
    try {
      const delByEmail = await getDoc(doc(db, "deleted_accounts", sanitizedEmail));
      if (delByEmail.exists()) isDeleted = true;
    } catch (e) {}
  }

  if (isDeleted) {
    try {
      await deleteUser(user);
    } catch (e) {}
    try {
      await signOut(auth);
    } catch (e) {}
    try {
      localStorage.removeItem("quick_schools_auth_session");
      localStorage.removeItem("qs_auth_role_cache_v1");
    } catch (e) {}
    throw new Error("Akun Google ini telah dihapus oleh Administrator dan tidak dapat digunakan lagi.");
  }

  // Check user profile in Firestore
  const userDocRef = doc(db, "users", user.uid);
  const userDocSnap = await getDoc(userDocRef);

  let userData: any = null;

  if (!userDocSnap.exists()) {
    // New user signing in with Google: provision initial profile with pending onboarding
    userData = {
      uid: user.uid,
      email: cleanEmail,
      name: user.displayName || cleanEmail.split("@")[0] || "Pengguna",
      fullName: user.displayName || "",
      photoUrl: user.photoURL || "",
      role: "siswa",
      status: "Belum Onboarding",
      onboardingCompleted: false,
      authProvider: "google",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userDocRef, userData, { merge: true });
  } else {
    userData = userDocSnap.data();

    // Check if account is inactive/disabled
    if (userData.status === "Nonaktif" || userData.status === "deleted" || userData.isDeleted === true) {
      try {
        await signOut(auth);
      } catch (e) {}
      try {
        localStorage.removeItem("quick_schools_auth_session");
        localStorage.removeItem("qs_auth_role_cache_v1");
      } catch (e) {}
      throw new Error("Akun Anda berstatus Nonaktif. Silakan hubungi Super Admin untuk mengaktifkan akun Anda.");
    }
  }

  const redirectUrl = getPostLoginRedirect(userData);
  return { user, redirectUrl, userData };
}
