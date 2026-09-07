import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
});
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function syncJosua() {
  await signInWithEmailAndPassword(auth, "dani@gmail.com", "asdasdasd");
  
  // Sync Josua in users collection
  await updateDoc(doc(db, "users", "sTMozU2ZI1PpbQdGN6sbuCHouJv2"), {
    classId: "12 MIPA 1",
    className: "12 MIPA 1",
    status: "Aktif",
    onboardingCompleted: true
  });
  console.log("Synchronized Josua in users collection!");
}

syncJosua().catch(console.error);
