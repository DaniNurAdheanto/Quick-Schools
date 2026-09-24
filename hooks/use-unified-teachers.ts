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

    const normalizeName = (name: string) => {
      if (!name) return "";
      return name
        .toLowerCase()
        .replace(/,\s*(s\.pd|m\.pd|s\.kom|m\.kom|s\.t|m\.t|s\.si|m\.si|dr|dra|drs|lc|m\.a|s\.ag|m\.ag)[^,]*/gi, "")
        .replace(/\b(dr|dra|drs|ustadz|kyai|ir)\.?\s+/gi, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
    };

    const findExistingKey = (
      uid?: string,
      email?: string,
      nip?: string,
      name?: string,
      docId?: string
    ): string | undefined => {
      const cleanEmail = email ? email.toLowerCase().trim() : "";
      const cleanN = normalizeName(name || "");
      const cleanNip = (!isDocId(nip) && nip && nip !== "-") ? String(nip).trim() : "";

      for (const [k, existing] of teacherMap.entries()) {
        // 1. Match by UID
        if (uid && (k === uid || existing.uid === uid || existing._firestoreId === uid || existing._allDocIds?.includes(uid))) {
          return k;
        }
        // 2. Match by Firestore docId
        if (docId && (k === docId || existing._firestoreId === docId || existing._allDocIds?.includes(docId))) {
          return k;
        }
        // 3. Match by clean NIP (must be valid, at least 3 chars)
        if (cleanNip && cleanNip.length >= 3) {
          const exNip = (!isDocId(existing.nip) && existing.nip && existing.nip !== "-") ? String(existing.nip).trim() : "";
          const exId = (!isDocId(existing.id) && existing.id && existing.id !== "-") ? String(existing.id).trim() : "";
          if (cleanNip === exNip || cleanNip === exId) {
            return k;
          }
        }
        // 4. Match by Email
        if (cleanEmail && existing.email && cleanEmail === existing.email.toLowerCase().trim()) {
          return k;
        }
        // 5. Match by Normalized Name (if name has at least 3 characters)
        if (cleanN && cleanN.length >= 3) {
          const exNameNorm = normalizeName(existing.name || existing.fullName || "");
          if (cleanN === exNameNorm) {
            return k;
          }
        }
      }
      return undefined;
    };

    // 1. Process items from `teachers` collection
    rawTeachersRef.current.forEach((item) => {
      const cleanNip = (!isDocId(item.nip) && item.nip && item.nip !== "-") ? String(item.nip).trim()
        : (!isDocId(item.id) && item.id && item.id !== "-") ? String(item.id).trim()
        : "";

      const rawPhoto = item.imageUrl || item.photoUrl || "";
      const validPhoto = (typeof rawPhoto === "string" && !rawPhoto.startsWith("blob:")) ? rawPhoto : "";

      const rawSubjectIds = Array.isArray(item.subjectIds) ? item.subjectIds : [];
      const rawSubjects = Array.isArray(item.subjects) ? item.subjects : (item.subject || item.role ? [item.subject || item.role] : []);
      const primarySubject = item.subject || item.role || (rawSubjects.length > 0 ? rawSubjects[0] : "Mata Pelajaran Umum");

      const phone = item.contact || item.phone || "";
      const email = (item.email || "").toLowerCase().trim();
      const itemUid = item.uid || (isDocId(item._firestoreId) ? item._firestoreId : "");
      const itemName = item.name || item.fullName || "Guru Pengajar";

      const existingKey = findExistingKey(itemUid, email, cleanNip, itemName, item._firestoreId);

      if (existingKey) {
        const existing = teacherMap.get(existingKey)!;
        if (item._firestoreId && !existing._allDocIds.includes(item._firestoreId)) {
          existing._allDocIds.push(item._firestoreId);
        }
        if (!existing.uid && itemUid) existing.uid = itemUid;
        if (!existing.email && email) existing.email = email;
        if ((!existing.nip || existing.nip === "-") && cleanNip) {
          existing.nip = cleanNip;
          existing.id = cleanNip;
        }
        if ((!existing.phone || existing.phone === "-") && phone) {
          existing.phone = phone;
          existing.contact = phone;
        }
        if (item.homeroomClass && !existing.homeroomClass) {
          existing.homeroomClass = item.homeroomClass;
        }
        if (validPhoto && !existing.imageUrl) {
          existing.imageUrl = validPhoto;
          existing.photoUrl = validPhoto;
        }
        if (rawSubjectIds.length > 0) {
          existing.subjectIds = Array.from(new Set([...existing.subjectIds, ...rawSubjectIds]));
        }
        if (rawSubjects.length > 0) {
          existing.subjects = Array.from(new Set([...existing.subjects, ...rawSubjects]));
        }
        if (primarySubject && (!existing.subject || existing.subject === "Guru Pengajar" || existing.subject === "Mata Pelajaran Umum")) {
          existing.subject = primarySubject;
          existing.role = primarySubject;
        }
      } else {
        const key = itemUid || (cleanNip && cleanNip.length >= 3 ? cleanNip : "") || email || item._firestoreId;
        teacherMap.set(key, {
          ...item,
          _firestoreId: item._firestoreId,
          _allDocIds: [item._firestoreId],
          uid: itemUid,
          id: cleanNip || item.id || item._firestoreId,
          nip: cleanNip || "-",
          name: itemName,
          fullName: item.fullName || itemName,
          email: email,
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
      }
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
        const uName = u.name || u.fullName || "Guru Pengajar";

        // Find existing record in teacherMap by UID, DocID, Email, NIP, or Name
        const existingKey = findExistingKey(uUid, uEmail, uNip, uName, u._firestoreId);

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
          if (u.subject && (!existing.subject || existing.subject === "Guru Pengajar" || existing.subject === "Mata Pelajaran Umum")) {
            existing.subject = u.subject;
            existing.role = u.subject;
          }
        } else {
          // Add as new unified teacher from users collection
          const newKey = uUid || (uNip && uNip.length >= 3 ? uNip : "") || uEmail || u._firestoreId;
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
            name: uName,
            fullName: u.fullName || uName,
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
