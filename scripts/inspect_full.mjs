import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  await signInWithEmailAndPassword(auth, "dani@gmail.com", "asdasdasd");

  console.log("=== ALL STUDENTS DOCS ===");
  const studentsSnap = await getDocs(collection(db, "students"));
  studentsSnap.forEach(d => console.log(d.id, "=>", d.data()));

  console.log("\n=== ALL USERS DOCS ===");
  const usersSnap = await getDocs(collection(db, "users"));
  usersSnap.forEach(d => console.log(d.id, "=>", d.data()));
}

main().catch(console.error);
