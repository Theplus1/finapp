import { NextRequest, NextResponse } from "next/server";
const API_URL = process.env.API_URL as string;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { headers } = request;
  const { id } = await params;
  try {
    const data = await fetch(`${API_URL}/card-group/${id}`, {
      headers,
    }).then((res) => res.json());
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get card group error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
