import { NextRequest, NextResponse } from "next/server";
import { renderRequestUrl } from "../../common";
const API_URL = process.env.API_URL as string;

export async function POST(request: NextRequest) {
  const { headers } = request;
  try {
    const requestUrl = renderRequestUrl(`${API_URL}/auth/login`, request);
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Username and password are required",
        },
        { status: 400 }
      );
    }

    const data = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }).then((res) => res.json());
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
