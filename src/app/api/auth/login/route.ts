import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyApiRequest, createSessionCookieValue } from "@/lib/security/api-guard";
import { issueActuationTicket } from "@/lib/security/actuation-ticket";

export async function POST(req: Request) {
  try {
    // Central API guard: checks host, origin, secret presence, session cookie
    const guard = verifyApiRequest(req, { requireAuth: true, requireSession: true });
    if (!guard.authorized) {
      return NextResponse.json(
        { success: false, error: guard.reason },
        { status: guard.status }
      );
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Admin token is required" },
        { status: 400 }
      );
    }

    // Verify the submitted token against STEADYGATE_API_SECRET via timingSafeEqual
    const expectedSecret = process.env.STEADYGATE_API_SECRET || "";
    const tokBuf = Buffer.from(token, "utf8");
    const expBuf = Buffer.from(expectedSecret, "utf8");

    if (tokBuf.length !== expBuf.length || !crypto.timingSafeEqual(tokBuf, expBuf)) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED_ADMIN_TOKEN_MISMATCH" },
        { status: 401 }
      );
    }

    // Generate session cookie value (never includes raw secret)
    const cookieVal = createSessionCookieValue(expectedSecret);

    // Set httpOnly, SameSite=Strict cookie with 8-hour expiry
    const maxAge = 8 * 60 * 60; // 8 hours in seconds

    return NextResponse.json(
      {
        success: true,
        message: "Login successful — httpOnly session cookie set",
      },
      {
        headers: {
          "Set-Cookie": `steadygate_session=${cookieVal}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}; Secure`,
        },
      }
    );
  } catch (error: any) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}

/**
 * Re-export createSessionCookieValue for use in other routes that need
 * to set session cookies programmatically.
 */
export { createSessionCookieValue } from "@/lib/security/api-guard";