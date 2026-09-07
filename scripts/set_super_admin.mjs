import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
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

async function setDaniSuperAdmin() {
  await signInWithEmailAndPassword(auth, "dani@gmail.com", "asdasdasd");
  
  const userRef = doc(db, "users", "NJzKw1QdgKSqfuBBwzylnHyOSnk2");
  await updateDoc(userRef, {
    role: "super-admin",
    updatedAt: new Date().toISOString()
  });

  const updatedSnap = await getDoc(userRef);
  console.log("Successfully updated dani@gmail.com:", updatedSnap.data());
}

setDaniSuperAdmin().catch(console.error);
