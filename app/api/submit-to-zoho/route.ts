import { type NextRequest, NextResponse } from "next/server"
import { sendToZohoFlow } from "@/lib/backend"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await sendToZohoFlow(body)

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
