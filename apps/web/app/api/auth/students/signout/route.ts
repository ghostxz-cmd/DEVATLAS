import { NextResponse } from "next/server";
import { getStudentSessionCookieName } from "@/lib/student-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: getStudentSessionCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
