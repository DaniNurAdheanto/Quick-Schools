import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import config from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

export interface CreateAuthResult {
  uid: string;
  email: string;
}

/**
 * Creates a new user in Firebase Authentication using an isolated secondary Firebase App.
 * This guarantees that the currently logged-in Super Admin is NOT logged out during user creation.
 */
export async function createAuthAccount(
  email: string,
  password: string,
  displayName?: string
): Promise<CreateAuthResult> {
  const tempAppName = `AccountCreator-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const secondaryApp = initializeApp(firebaseConfig, tempAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    const newUser = userCredential.user;

    if (displayName && displayName.trim()) {
      try {
        await updateProfile(newUser, { displayName: displayName.trim() });
      } catch (profileErr) {
        console.warn("Could not update displayName:", profileErr);
      }
    }

    const result: CreateAuthResult = {
      uid: newUser.uid,
      email: newUser.email || email.trim()
    };

    // Sign out from the secondary instance before deleting it
    await signOut(secondaryAuth);
    return result;
  } catch (err: any) {
    let friendlyMessage = err.message || "Gagal mendaftarkan akun di sistem autentikasi.";
    if (err.code === "auth/email-already-in-use") {
      friendlyMessage = "Email sudah terdaftar pada sistem autentikasi. Gunakan email lain atau perbarui akun yang ada.";
    } else if (err.code === "auth/weak-password") {
      friendlyMessage = "Kata sandi terlalu lemah. Minimal harus terdiri dari 6 karakter.";
    } else if (err.code === "auth/invalid-email") {
      friendlyMessage = "Format email tidak valid. Pastikan penulisan email sudah benar.";
    }
    const enhancedError = new Error(friendlyMessage);
    (enhancedError as any).code = err.code;
    throw enhancedError;
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (cleanErr) {
      console.warn("Failed to delete secondary app:", cleanErr);
    }
  }
}
