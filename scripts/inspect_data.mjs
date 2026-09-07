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

async function inspectData() {
  await signInWithEmailAndPassword(auth, "dani@gmail.com", "asdasdasd");
  console.log("Auth success!");

  console.log("\n=== CLASSES ===");
  const classesSnap = await getDocs(collection(db, "classes"));
  classesSnap.forEach(d => console.log(`[CLASS] ID: ${d.id} | Name: ${d.data().name}`));

  console.log("\n=== STUDENTS COLLECTION ===");
  const studentsSnap = await getDocs(collection(db, "students"));
  studentsSnap.forEach(d => console.log(`[STUDENT] ID: ${d.id} | Name: ${d.data().fullName || d.data().name} | Class: ${d.data().classId || d.data().className} | NISN: ${d.data().nisn}`));

  console.log("\n=== USERS (role = siswa/student) ===");
  const usersSnap = await getDocs(collection(db, "users"));
  usersSnap.forEach(d => {
    const data = d.data();
    if ((data.role || "").toLowerCase() === "siswa" || (data.role || "").toLowerCase() === "student") {
      console.log(`[USER] ID: ${d.id} | Name: ${data.fullName || data.name} | Class: ${data.classId || data.className} | Email: ${data.email} | NISN: ${data.nisn}`);
    }
  });

  console.log("\n=== GRADES ===");
  const gradesSnap = await getDocs(collection(db, "grades"));
  console.log(`Total grades: ${gradesSnap.size}`);
  gradesSnap.forEach(d => console.log(`[GRADE] ID: ${d.id} | StudentID: ${d.data().studentId} | StudentName: ${d.data().studentName} | Class: ${d.data().classId} | Subject: ${d.data().subject} | Score: ${d.data().score}`));
}

inspectData().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
