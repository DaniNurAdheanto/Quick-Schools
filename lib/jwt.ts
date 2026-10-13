import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "quick-schools-super-secret-key-2026-production"
);

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  onboardingCompleted?: boolean;
  [key: string]: any;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  // Strip any properties that would inflate the JWT cookie beyond browser RFC 6265 limits (4KB)
  const sanitizedPayload: SessionPayload = { ...payload };
  if (
    typeof sanitizedPayload.avatarUrl === "string" &&
    (sanitizedPayload.avatarUrl.startsWith("data:") || sanitizedPayload.avatarUrl.length > 512)
  ) {
    sanitizedPayload.avatarUrl = null;
  }

  // Defensively strip any other property exceeding 1024 characters
  for (const key of Object.keys(sanitizedPayload)) {
    if (typeof sanitizedPayload[key] === "string" && sanitizedPayload[key].length > 1024) {
      delete sanitizedPayload[key];
    }
  }

  return new SignJWT(sanitizedPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch (err) {
    return null;
  }
}
