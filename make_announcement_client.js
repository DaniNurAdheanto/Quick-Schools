const fs = require('fs');
const path = 'app/(protected)/admin/announcements/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file has "use client"; at line 1. But does it export a client component correctly?
// If we change it to dynamically load without SSR, it bypasses the prerender step completely.

const newContent = `"use client";
import dynamic from 'next/dynamic';

const AnnouncementsContent = dynamic(() => Promise.resolve(function AnnouncementsPage() {
  ` + content.substring(content.indexOf('const [crudState, setCrudState]')) + `
}), { ssr: false });

export default function AnnouncementsPage() {
  return <AnnouncementsContent />;
}
`;

// wait, this dynamic wrapper syntax is tricky for the whole component if we just inline it.
// Let's just create a wrapper file.
