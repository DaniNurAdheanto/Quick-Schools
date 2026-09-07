import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

async function checkDataSiswaSim() {
  await signInWithEmailAndPassword(auth, "dani@gmail.com", "asdasdasd");

  const studentsSnap = await getDocs(collection(db, "students"));
  const usersSnap = await getDocs(collection(db, "users"));

  const rawStudents = studentsSnap.docs.map(d => ({ _firestoreId: d.id, ...d.data() }));
  const rawUsers = usersSnap.docs.map(d => ({ _firestoreId: d.id, ...d.data() }));

  const studentMap = new Map();

  // 1. Process items from students collection
  rawStudents.forEach(item => {
    const key = item.uid || item.email?.toLowerCase() || item._firestoreId;
    studentMap.set(key, {
      ...item,
      _firestoreId: item._firestoreId,
      _allDocIds: [item._firestoreId],
      uid: item.uid || item._firestoreId,
      id: item.nisn || item.nis || item.id || "-",
      name: item.fullName || item.name || "",
      fullName: item.fullName || item.name || "",
      classId: item.classId || item.className || "10 IPA 1",
      className: item.className || item.classId || "10 IPA 1",
      status: item.status || "Aktif",
    });
  });

  // 2. Merge items from users collection
  rawUsers.forEach(u => {
    const role = (u.role || "").toLowerCase();
    if (role === "siswa" || role === "student") {
      const uEmail = (u.email || "").toLowerCase();
      const uUid = u.uid || u._firestoreId;

      let existingKey;
      for (const [k, v] of studentMap.entries()) {
        if (
          (uUid && (k === uUid || v.uid === uUid || v._firestoreId === uUid)) ||
          (uEmail && v.email?.toLowerCase() === uEmail)
        ) {
          existingKey = k;
          break;
        }
      }

      if (existingKey) {
        const existing = studentMap.get(existingKey);
        Object.keys(u).forEach(k => {
          if ((existing[k] === undefined || existing[k] === "" || existing[k] === "-") && u[k]) {
            existing[k] = u[k];
          }
        });
        if (!existing.name || existing.name === "Siswa Baru") existing.name = u.fullName || u.name || existing.name;
      } else {
        const newKey = uUid || uEmail || u._firestoreId;
        studentMap.set(newKey, {
          ...u,
          _firestoreId: u._firestoreId,
          _allDocIds: [u._firestoreId],
          uid: uUid,
          id: u.nisn || u.nis || u.id || "-",
          name: u.fullName || u.name || u.email?.split("@")[0] || "Siswa Baru",
          fullName: u.fullName || u.name || "",
          classId: u.classId || u.className || "10 IPA 1",
          className: u.className || u.classId || "10 IPA 1",
          status: u.status || "Aktif",
        });
      }
    }
  });

  console.log("SIMULATED DATA SISWA OUTPUT (" + studentMap.size + " students):");
  for (const [k, s] of studentMap.entries()) {
    console.log(`Key: ${k} | Name: ${s.fullName || s.name} | Class: ${s.classId} | ID: ${s.id} | UID: ${s.uid} | _firestoreId: ${s._firestoreId}`);
  }
}

checkDataSiswaSim().catch(console.error);
