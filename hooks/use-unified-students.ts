"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { isStudentRole } from "@/lib/roles-config";

export interface UnifiedStudent {
  _firestoreId: string;
  _allDocIds: string[];
  uid: string;
  id: string;
  nis: string;
  nisn: string;
  name: string;
  fullName: string;
  nickname?: string;
  email: string;
  gender: string;
  birthPlace?: string;
  birthDate?: string;
  religion?: string;
  nik?: string;
  address?: string;
  phone?: string;
  classId: string;
  className: string;
  major?: string;
  entryYear?: string;
  level?: string;
  studentStatus?: string;
  previousSchool?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  parentPhone?: string;
  parentJob?: string;
  parentIncome?: string;
  parentAddress?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  status: string;
  onboardingCompleted: boolean;
  imageUrl?: string;
  photoUrl?: string;
  pendingOnboardingReminder?: boolean;
  reminderSentAt?: any;
  [key: string]: any;
}

export function useUnifiedStudents() {
  const [students, setStudents] = useState<UnifiedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const rawStudentsRef = useRef<any[]>([]);
  const rawUsersRef = useRef<any[]>([]);

  const mergeAndSetStudents = useCallback(() => {
    const studentMap = new Map<string, UnifiedStudent>();

    // 1. Process items from `students` collection
    rawStudentsRef.current.forEach(item => {
      const key = item.uid || item.email?.toLowerCase() || item._firestoreId;
      const isUnboarded = item.status === "Belum Onboarding" || item.onboardingCompleted === false;

      studentMap.set(key, {
        ...item,
        _firestoreId: item._firestoreId,
        _allDocIds: [item._firestoreId],
        uid: item.uid || item._firestoreId,
        id: item.nisn || item.nis || item.id || item._firestoreId || "-",
        nis: item.nis || item.id || "-",
        nisn: item.nisn || item.id || "-",
        name: item.fullName || item.name || "",
        fullName: item.fullName || item.name || "",
        nickname: item.nickname || "",
        email: item.email || "",
        gender: item.gender || "Laki-laki",
        birthPlace: item.birthPlace || "",
        birthDate: item.birthDate || "",
        religion: item.religion || "Islam",
        nik: item.nik || "",
        address: item.address || "",
        phone: item.phone || "-",
        classId: item.classId || item.className || item.class || "10 IPA 1",
        className: item.className || item.classId || item.class || "10 IPA 1",
        major: item.major || "MIPA",
        entryYear: item.entryYear || "2025/2026",
        level: item.level || "SMA",
        studentStatus: item.studentStatus || "Siswa Baru",
        previousSchool: item.previousSchool || "",
        fatherName: item.fatherName || "",
        motherName: item.motherName || "",
        guardianName: item.guardianName || "",
        parentPhone: item.parentPhone || "",
        parentJob: item.parentJob || "",
        parentIncome: item.parentIncome || "",
        parentAddress: item.parentAddress || "",
        emergencyName: item.emergencyName || "",
        emergencyPhone: item.emergencyPhone || "",
        emergencyRelation: item.emergencyRelation || "",
        status: isUnboarded ? "Belum Onboarding" : (item.status || "Aktif"),
        onboardingCompleted: !isUnboarded,
        imageUrl: item.imageUrl || item.photoUrl || "",
        photoUrl: item.photoUrl || item.imageUrl || "",
        pendingOnboardingReminder: item.pendingOnboardingReminder || false,
        reminderSentAt: item.reminderSentAt || null,
      });
    });

    // 2. Merge items from `users` collection where role is student/siswa
    rawUsersRef.current.forEach(u => {
      if (isStudentRole(u.role)) {
        const uEmail = (u.email || "").toLowerCase();
        const uUid = u.uid || u._firestoreId;
        const isUnboarded = u.onboardingCompleted === false || u.status === "Belum Onboarding";

        let existingKey: string | undefined;
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
          const existing = studentMap.get(existingKey)!;
          if (!existing._allDocIds.includes(u._firestoreId)) {
            existing._allDocIds.push(u._firestoreId);
          }
          // Merge rich fields from u (users collection has full profile)
          Object.keys(u).forEach(k => {
            if (k === "_firestoreId") return;
            if (u[k] !== undefined && u[k] !== null && u[k] !== "") {
              if (
                existing[k] === undefined || 
                existing[k] === "" || 
                existing[k] === "-" || 
                u.updatedAt ||
                ["gender", "birthPlace", "birthDate", "religion", "nik", "address", "phone", "email", "major", "entryYear", "level", "studentStatus", "previousSchool", "fatherName", "motherName", "guardianName", "parentPhone", "parentJob", "parentIncome", "parentAddress", "emergencyName", "emergencyPhone", "emergencyRelation"].includes(k)
              ) {
                existing[k] = u[k];
              }
            }
          });
          if (u.fullName || u.name) {
            existing.name = u.fullName || u.name || existing.name;
            existing.fullName = u.fullName || u.name || existing.fullName;
          }
          const uClass = u.classId || u.className || u.kelas || u.class;
          if (uClass && uClass !== "-") {
            existing.classId = uClass;
            existing.className = uClass;
            existing.kelas = uClass;
            existing.class = uClass;
          }
          if (u.status) {
            existing.status = isUnboarded ? "Belum Onboarding" : u.status;
            existing.onboardingCompleted = !isUnboarded;
          }
        } else {
          const newKey = uUid || uEmail || u._firestoreId;
          studentMap.set(newKey, {
            ...u,
            _firestoreId: u._firestoreId,
            _allDocIds: [u._firestoreId],
            uid: uUid,
            id: u.nisn || u.nis || u.id || u._firestoreId || "-",
            nis: u.nis || "-",
            nisn: u.nisn || "-",
            name: u.fullName || u.name || u.email?.split("@")[0] || "Siswa Baru",
            fullName: u.fullName || u.name || "",
            nickname: u.nickname || "",
            email: u.email || "",
            gender: u.gender || "Laki-laki",
            birthPlace: u.birthPlace || "",
            birthDate: u.birthDate || "",
            religion: u.religion || "Islam",
            nik: u.nik || "",
            address: u.address || "",
            phone: u.phone || "-",
            classId: u.classId || u.className || u.class || "10 IPA 1",
            className: u.className || u.classId || u.class || "10 IPA 1",
            major: u.major || "MIPA",
            entryYear: u.entryYear || "2025/2026",
            level: u.level || "SMA",
            studentStatus: u.studentStatus || "Siswa Baru",
            status: isUnboarded ? "Belum Onboarding" : (u.status || "Aktif"),
            onboardingCompleted: !isUnboarded,
            imageUrl: u.imageUrl || u.photoUrl || "",
            photoUrl: u.photoUrl || u.imageUrl || "",
            pendingOnboardingReminder: u.pendingOnboardingReminder || false,
            reminderSentAt: u.reminderSentAt || null,
          });
        }
      }
    });

    const unifiedList = Array.from(studentMap.values());
    setStudents(unifiedList);
    setLoading(false);
  }, []);

  useEffect(() => {
    let unsubStudents: (() => void) | undefined;
    let unsubUsers: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoading(true);
        const qStudents = query(collection(db, "students"));
        const qUsers = query(collection(db, "users"));

        unsubStudents = onSnapshot(
          qStudents,
          (snapshot) => {
            rawStudentsRef.current = snapshot.docs.map(d => ({ ...d.data(), _firestoreId: d.id }));
            mergeAndSetStudents();
          },
          (err) => {
            console.error("Error listening to students collection:", err);
            setError(err);
            setLoading(false);
          }
        );

        unsubUsers = onSnapshot(
          qUsers,
          (snapshot) => {
            rawUsersRef.current = snapshot.docs.map(d => ({ ...d.data(), _firestoreId: d.id }));
            mergeAndSetStudents();
          },
          (err) => {
            console.error("Error listening to users collection:", err);
            setError(err);
            setLoading(false);
          }
        );
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubStudents) unsubStudents();
      if (unsubUsers) unsubUsers();
    };
  }, [mergeAndSetStudents]);

  const getStudentByIdOrName = useCallback(
    (targetIdOrName?: string): UnifiedStudent | undefined => {
      if (!targetIdOrName) return undefined;
      const target = targetIdOrName.trim().toLowerCase();
      return students.find(s => {
        return (
          (s._firestoreId && s._firestoreId.toLowerCase() === target) ||
          (s.id && s.id.toLowerCase() === target) ||
          (s.uid && s.uid.toLowerCase() === target) ||
          (s.nis && s.nis.toLowerCase() === target) ||
          (s.nisn && s.nisn.toLowerCase() === target) ||
          (s.name && s.name.toLowerCase() === target) ||
          (s.fullName && s.fullName.toLowerCase() === target) ||
          (s.email && s.email.toLowerCase() === target)
        );
      });
    },
    [students]
  );

  return {
    students,
    setStudents,
    loading,
    error,
    getStudentByIdOrName,
    rawStudents: rawStudentsRef.current,
    rawUsers: rawUsersRef.current
  };
}
