import { NextResponse } from "next/server"
import { submitToZoho } from "@/app/actions/submit-to-zoho"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await submitToZoho(body)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
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
