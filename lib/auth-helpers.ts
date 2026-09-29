import { auth, db } from "@/lib/firebase";
import { User, GoogleAuthProvider, signInWithPopup, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Checks if the user has completed onboarding and their profile data is complete in Firestore.
 */
export function isUserOnboardingComplete(userData: any): boolean {
  if (!userData) return false;

  // Explicit incomplete indicators
  if (userData.onboardingCompleted === false) return false;
  if (userData.status === "Belum Onboarding") return false;

  const role = (userData.role || "").toLowerCase().trim();

  // Super Admin & Admin are inherently fully onboarded
  if (role === "super-admin" || role === "superadmin" || role === "admin" || role === "owner" || role === "developer") {
    return true;
  }

  // Teachers & Principals created by school
  if (role === "guru" || role === "teacher" || role === "kepala-sekolah" || role === "principal") {
    if (userData.status === "Aktif" || userData.onboardingCompleted === true) {
      return true;
    }
  }

  // Parents
  if (role === "orang-tua" || role === "parent") {
    if (userData.status === "Aktif" || userData.onboardingCompleted === true) {
      return true;
    }
  }

  // Students & Self-registered users must have onboardingCompleted explicitly true and status 'Aktif'
  if (role === "siswa" || role === "student" || !role) {
    return Boolean(userData.onboardingCompleted) && userData.status !== "Belum Onboarding";
  }

  return Boolean(userData.onboardingCompleted);
}

/**
 * Determines where to redirect the user after successful authentication.
 */
export function getPostLoginRedirect(userData: any, targetRedirect?: string | null): string {
  const isComplete = isUserOnboardingComplete(userData);
  if (!isComplete) {
    return "/onboarding";
  }

  if (targetRedirect && targetRedirect !== "/login" && targetRedirect !== "/register" && targetRedirect !== "/onboarding") {
    return targetRedirect;
  }

  return "/dashboard";
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
