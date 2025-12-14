import { type NextRequest, NextResponse } from "next/server"
import { encryptToken } from "@/lib/backend"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.empresa && !body.empresaData) {
      return NextResponse.json(
        {
          success: false,
          error: "Se requiere el campo 'empresa' con los datos de la empresa",
        },
        { status: 400 },
      )
    }

    const dataToEncrypt = body.empresaData || {
      id_zoho: body.id_zoho,
      empresa: body.empresa,
      admins: body.admins,
      trabajadores: body.trabajadores,
    }

    const token = await encryptToken(dataToEncrypt)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const link = `${baseUrl}?token=${encodeURIComponent(token)}`

    return NextResponse.json({
      success: true,
      link,
      token,
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
