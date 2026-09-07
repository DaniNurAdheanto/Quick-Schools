import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
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

async function cleanOldDummyGrades() {
  await signInWithEmailAndPassword(auth, "dani@gmail.com", "asdasdasd");
  const oldGradeIds = [
    "69a5691e-c4bf-46e1-b091-dbf3948c781c",
    "78248083-927e-4bce-abc2-4d5ad267301d",
    "CKNGZS4auDwXhfCJ2Am5",
    "b1920226-9b4b-4ae9-84b9-1e1d60040cfd",
    "m1LFHvUcw71cBh5coBrt"
  ];

  for (const id of oldGradeIds) {
    try {
      await deleteDoc(doc(db, "grades", id));
      console.log(`Deleted orphaned grade ${id}`);
    } catch (e) {
      console.warn(`Could not delete ${id}:`, e.message);
    }
  }
}

cleanOldDummyGrades().catch(console.error);
