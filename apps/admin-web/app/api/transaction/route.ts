import { NextRequest, NextResponse } from "next/server";
import { API_SLASH_HEADERS, renderRequestUrl } from "../common";
const API_URL = process.env.API_URL as string;

export async function GET(request: NextRequest) {
  const requestUrl = renderRequestUrl(`${API_URL}/transaction`, request);
  try {
    const data = await fetch(requestUrl, API_SLASH_HEADERS).then((res) =>
      res.json()
    );
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get transaction error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
