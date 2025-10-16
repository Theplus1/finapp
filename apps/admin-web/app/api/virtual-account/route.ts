import { NextRequest, NextResponse } from "next/server";
const API_URL = process.env.API_URL as string;

export async function GET(request: NextRequest) {
  const { headers } = request;
  try {
    const data = await fetch(`${API_URL}/accounts`, {
      headers,
    }).then((res) => res.json());
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get virtual account error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
