import { NextRequest, NextResponse } from "next/server";
import { renderRequestUrl } from "../common";
const API_URL = process.env.API_URL as string;

export async function GET(request: NextRequest) {
  const { headers } = request;
  try {
    const requestUrl = renderRequestUrl(`${API_URL}/transactions`, request);
    const data = await fetch(requestUrl, {
      headers,
    }).then((res) => res.json());
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
