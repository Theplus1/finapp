import {
  // NextRequest,
  NextResponse,
} from "next/server";
import { API_SLASH_HEADERS } from "../common";
const API_URL = process.env.API_URL as string;

export async function GET() {
// request: NextRequest
  try {
    const data = await fetch(
      `${API_URL}/virtual-account`,
      API_SLASH_HEADERS
    ).then((res) => res.json());
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
