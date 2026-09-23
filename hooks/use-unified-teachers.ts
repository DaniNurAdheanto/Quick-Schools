"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

export interface UnifiedTeacher {
  _firestoreId: string;
  _allDocIds: string[];
  uid: string;
  id: string;
  nip: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  contact: string;
  role: string;
  subject: string;
  subjectIds: string[];
  subjects: string[];
  homeroomClass?: string;
  status: "Aktif" | "Cuti" | "Nonaktif" | string;
  imageUrl?: string;
  photoUrl?: string;
  gender?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export function useUnifiedTeachers() {
  const [teachers, setTeachers] = useState<UnifiedTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const rawTeachersRef = useRef<any[]>([]);
  const rawUsersRef = useRef<any[]>([]);

  const mergeAndSetTeachers = useCallback(() => {
    const teacherMap = new Map<string, UnifiedTeacher>();

    const isDocId = (val: any) => typeof val === "string" && val.length >= 20 && !/^\d+$/.test(val);

    // 1. Process items from `teachers` collection
    rawTeachersRef.current.forEach((item) => {
      const key = item.uid || (item.email ? item.email.toLowerCase().trim() : "") || item.nip || item.id || item._firestoreId;
      
      const cleanNip = (!isDocId(item.nip) && item.nip && item.nip !== "-") ? String(item.nip).trim()
        : (!isDocId(item.id) && item.id && item.id !== "-") ? String(item.id).trim()
        : "";

      const rawPhoto = item.imageUrl || item.photoUrl || "";
      const validPhoto = (typeof rawPhoto === "string" && !rawPhoto.startsWith("blob:")) ? rawPhoto : "";

      const rawSubjectIds = Array.isArray(item.subjectIds) ? item.subjectIds : [];
      const rawSubjects = Array.isArray(item.subjects) ? item.subjects : (item.subject || item.role ? [item.subject || item.role] : []);
      const primarySubject = item.subject || item.role || (rawSubjects.length > 0 ? rawSubjects[0] : "Mata Pelajaran Umum");

      const phone = item.contact || item.phone || "";

      teacherMap.set(key, {
        ...item,
        _firestoreId: item._firestoreId,
        _allDocIds: [item._firestoreId],
        uid: item.uid || (isDocId(item._firestoreId) ? item._firestoreId : ""),
        id: cleanNip || item.id || item._firestoreId,
        nip: cleanNip || "-",
        name: item.name || item.fullName || "Guru Pengajar",
        fullName: item.fullName || item.name || "Guru Pengajar",
        email: (item.email || "").toLowerCase().trim(),
        phone: phone,
        contact: phone,
        role: primarySubject,
        subject: primarySubject,
        subjectIds: rawSubjectIds,
        subjects: rawSubjects,
        homeroomClass: item.homeroomClass || item.className || item.class || "",
        status: item.status || "Aktif",
        imageUrl: validPhoto,
        photoUrl: validPhoto,
        gender: item.gender || "Laki-laki",
        address: item.address || "",
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || "",
      });
    });

    // 2. Merge items from `users` collection where role is `guru` or `teacher`
    rawUsersRef.current.forEach((u) => {
      const uRole = (u.role || "").toLowerCase().trim();
      if (uRole === "guru" || uRole === "teacher") {
        const uEmail = (u.email || "").toLowerCase().trim();
        const uUid = u.uid || u._firestoreId;
        const uNip = (!isDocId(u.nip) && u.nip && u.nip !== "-") ? String(u.nip).trim()
          : (!isDocId(u.id) && u.id && u.id !== "-") ? String(u.id).trim()
          : "";

        // Find existing record in teacherMap by UID, Email, or NIP
        let existingKey: string | undefined;
        for (const [k, v] of teacherMap.entries()) {
          if (
            (uUid && (k === uUid || v.uid === uUid || v._firestoreId === uUid)) ||
            (uEmail && v.email?.toLowerCase() === uEmail) ||
            (uNip && (v.nip === uNip || v.id === uNip))
          ) {
            existingKey = k;
            break;
          }
        }

        const rawUPhoto = u.photoUrl || u.imageUrl || "";
        const validUPhoto = (typeof rawUPhoto === "string" && !rawUPhoto.startsWith("blob:")) ? rawUPhoto : "";

        if (existingKey) {
          const existing = teacherMap.get(existingKey)!;
          if (!existing._allDocIds.includes(u._firestoreId)) {
            existing._allDocIds.push(u._firestoreId);
          }

          // Merge fields prioritizing richer / updated user profile data
          if (!existing.uid && uUid) existing.uid = uUid;
          if (u.name || u.fullName) {
            existing.name = u.name || u.fullName || existing.name;
            existing.fullName = u.fullName || u.name || existing.fullName;
          }
          if (uEmail && !existing.email) existing.email = uEmail;
          if (uNip && (!existing.nip || existing.nip === "-")) {
            existing.nip = uNip;
            existing.id = uNip;
          }
          if (u.phone && (!existing.phone || existing.phone === "-")) {
            existing.phone = u.phone;
            existing.contact = u.phone;
          }
          if (u.homeroomClass) existing.homeroomClass = u.homeroomClass;
          if (u.status) existing.status = u.status;
          if (u.gender) existing.gender = u.gender;
          if (u.address) existing.address = u.address;

          // If user doc has valid photo, update existing photo
          if (validUPhoto) {
            existing.imageUrl = validUPhoto;
            existing.photoUrl = validUPhoto;
          }

          // Merge subjects if available
          if (Array.isArray(u.subjectIds) && u.subjectIds.length > 0) {
            existing.subjectIds = Array.from(new Set([...existing.subjectIds, ...u.subjectIds]));
          }
          if (Array.isArray(u.subjects) && u.subjects.length > 0) {
            existing.subjects = Array.from(new Set([...existing.subjects, ...u.subjects]));
          }
          if (u.subject && (!existing.subject || existing.subject === "Guru Pengajar")) {
            existing.subject = u.subject;
            existing.role = u.subject;
          }
        } else {
          // Add as new unified teacher from users collection
          const newKey = uUid || uEmail || uNip || u._firestoreId;
          const phone = u.contact || u.phone || "";
          const rawSubjectIds = Array.isArray(u.subjectIds) ? u.subjectIds : [];
          const rawSubjects = Array.isArray(u.subjects) ? u.subjects : (u.subject || u.role ? [u.subject || u.role] : []);
          const primarySubject = u.subject || u.role || (rawSubjects.length > 0 ? rawSubjects[0] : "Guru Pengajar");

          teacherMap.set(newKey, {
            ...u,
            _firestoreId: u._firestoreId,
            _allDocIds: [u._firestoreId],
            uid: uUid,
            id: uNip || uUid || u._firestoreId,
            nip: uNip || "-",
            name: u.name || u.fullName || "Guru Pengajar",
            fullName: u.fullName || u.name || "Guru Pengajar",
            email: uEmail,
            phone: phone,
            contact: phone,
            role: primarySubject,
            subject: primarySubject,
            subjectIds: rawSubjectIds,
            subjects: rawSubjects,
            homeroomClass: u.homeroomClass || u.className || "",
            status: u.status || "Aktif",
            imageUrl: validUPhoto,
            photoUrl: validUPhoto,
            gender: u.gender || "Laki-laki",
            address: u.address || "",
            createdAt: u.createdAt || "",
            updatedAt: u.updatedAt || "",
          });
        }
      }
    });

    const unifiedList = Array.from(teacherMap.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
    setTeachers(unifiedList);
    setLoading(false);
  }, []);

  useEffect(() => {
    let unsubTeachers: (() => void) | undefined;
    let unsubUsers: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoading(true);
        const qTeachers = query(collection(db, "teachers"));
        const qUsers = query(collection(db, "users"));

        unsubTeachers = onSnapshot(
          qTeachers,
          (snapshot) => {
            rawTeachersRef.current = snapshot.docs.map((d) => ({ ...d.data(), _firestoreId: d.id }));
            mergeAndSetTeachers();
          },
          (err) => {
            console.error("Error listening to teachers collection:", err);
            setError(err);
            setLoading(false);
          }
        );

        unsubUsers = onSnapshot(
          qUsers,
          (snapshot) => {
            rawUsersRef.current = snapshot.docs.map((d) => ({ ...d.data(), _firestoreId: d.id }));
            mergeAndSetTeachers();
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
      if (unsubTeachers) unsubTeachers();
      if (unsubUsers) unsubUsers();
    };
  }, [mergeAndSetTeachers]);

  const getTeacherByIdOrName = useCallback(
    (queryStr: string): UnifiedTeacher | undefined => {
      if (!queryStr || !queryStr.trim()) return undefined;
      const clean = queryStr.toLowerCase().trim();
      return teachers.find(
        (t) =>
          t.uid === queryStr ||
          t._firestoreId === queryStr ||
          (t.nip && t.nip !== "-" && t.nip.toLowerCase() === clean) ||
          (t.id && t.id.toLowerCase() === clean) ||
          (t.name && t.name.toLowerCase().trim() === clean) ||
          (t.fullName && t.fullName.toLowerCase().trim() === clean) ||
          (t.email && t.email.toLowerCase().trim() === clean)
      );
    },
    [teachers]
  );

  return {
    teachers,
    setTeachers,
    loading,
    error,
    getTeacherByIdOrName,
    rawTeachers: rawTeachersRef.current,
    rawUsers: rawUsersRef.current,
  };
}
