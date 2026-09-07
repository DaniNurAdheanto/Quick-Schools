import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
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

async function seedStudentGrades() {
  await signInWithEmailAndPassword(auth, "dani@gmail.com", "asdasdasd");
  console.log("Logged in!");

  const sampleGrades = [
    {
      studentId: "DDbdG9JhDtQ0kbJ1YSNBInFWWxB2",
      studentName: "Siswa Test",
      subject: "Matematika Wajib",
      type: "Tugas",
      score: 88,
      semester: "Ganjil",
      academicYear: "2025/2026"
    },
    {
      studentId: "DDbdG9JhDtQ0kbJ1YSNBInFWWxB2",
      studentName: "Siswa Test",
      subject: "Matematika Wajib",
      type: "Ulangan",
      score: 92,
      semester: "Ganjil",
      academicYear: "2025/2026"
    },
    {
      studentId: "DDbdG9JhDtQ0kbJ1YSNBInFWWxB2",
      studentName: "Siswa Test",
      subject: "Matematika Wajib",
      type: "UTS",
      score: 85,
      semester: "Ganjil",
      academicYear: "2025/2026"
    },
    {
      studentId: "sTMozU2ZI1PpbQdGN6sbuCHouJv2",
      studentName: "Josua",
      subject: "Matematika Wajib",
      type: "Tugas",
      score: 84,
      semester: "Ganjil",
      academicYear: "2025/2026"
    },
    {
      studentId: "sTMozU2ZI1PpbQdGN6sbuCHouJv2",
      studentName: "Josua",
      subject: "Matematika Wajib",
      type: "Ulangan",
      score: 80,
      semester: "Ganjil",
      academicYear: "2025/2026"
    },
    {
      studentId: "Kv8XK680MQOZXrwLVLTg4vaq55p1",
      studentName: "Wahyu",
      subject: "Matematika Wajib",
      type: "Tugas",
      score: 90,
      semester: "Ganjil",
      academicYear: "2025/2026"
    },
    {
      studentId: "Kv8XK680MQOZXrwLVLTg4vaq55p1",
      studentName: "Wahyu",
      subject: "Matematika Wajib",
      type: "Ulangan",
      score: 88,
      semester: "Ganjil",
      academicYear: "2025/2026"
    }
  ];

  for (const grade of sampleGrades) {
    await addDoc(collection(db, "grades"), {
      ...grade,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(`Added grade for ${grade.studentName} (${grade.type}: ${grade.score})`);
  }
}

seedStudentGrades().catch(console.error);
