import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const threadId = uuidv4();
  const response = NextResponse.json({ threadId });
  
  // Set cookie with the thread ID
  response.cookies.set("copilot_thread_id", threadId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return response;
} 