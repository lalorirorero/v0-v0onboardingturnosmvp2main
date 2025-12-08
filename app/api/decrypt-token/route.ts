import { type NextRequest, NextResponse } from "next/server"
import { decryptToken } from "@/lib/backend"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.token) {
      return NextResponse.json({ success: false, error: "token requerido" }, { status: 400 })
    }

    const empresaData = await decryptToken(body.token)

    if (!empresaData) {
      return NextResponse.json({ success: false, error: "Token inválido o expirado" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      empresaData,
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
