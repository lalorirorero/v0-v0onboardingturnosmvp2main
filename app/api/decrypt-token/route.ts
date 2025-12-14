import { type NextRequest, NextResponse } from "next/server"
import { decryptToken } from "@/lib/backend"

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ success: false, error: "JSON inválido en el cuerpo de la solicitud" }, { status: 400 })
    }

    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json(
        { success: false, error: "Token requerido y debe ser una cadena de texto" },
        { status: 400 },
      )
    }

    // Limpiar el token de posibles espacios o caracteres extra
    const cleanToken = body.token.trim()

    if (cleanToken.length === 0) {
      return NextResponse.json({ success: false, error: "Token vacío" }, { status: 400 })
    }

    console.log("[v0] decrypt-token API: Llamando a decryptToken...")

    const empresaData = await decryptToken(cleanToken)

    if (!empresaData) {
      console.log("[v0] decrypt-token API: Token inválido o expirado")
      return NextResponse.json({ success: false, error: "Token inválido o expirado" }, { status: 400 })
    }

    console.log("[v0] decrypt-token API: Token desencriptado exitosamente:", {
      id_zoho: empresaData.id_zoho,
      razonSocial: empresaData.razonSocial,
    })

    return NextResponse.json({
      success: true,
      empresaData,
    })
  } catch (error) {
    console.error("[v0] decrypt-token API: Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido en el servidor",
      },
      { status: 500 },
    )
  }
}
