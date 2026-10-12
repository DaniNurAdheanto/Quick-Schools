import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, SessionPayload } from "@/lib/jwt";

export const SESSION_COOKIE_NAME = "qs_session_token";

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifySessionToken(token);
  return payload;
}

export async function getCurrentUserFromDb() {
  const session = await getServerSession();
  if (!session?.id) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        student: {
          include: {
            class: true,
          },
        },
        teacher: {
          include: {
            subjects: {
              include: {
                subject: true,
              },
            },
            homeroomForClass: true,
          },
        },
        parent: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return user;
  } catch (err) {
    console.error("Error fetching current user from DB:", err);
    return null;
  }
}
