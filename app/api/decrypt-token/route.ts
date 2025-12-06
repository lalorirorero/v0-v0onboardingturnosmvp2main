import { type NextRequest, NextResponse } from "next/server"
import { decryptData } from "@/lib/crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.token) {
      return NextResponse.json({ error: "Se requiere un token" }, { status: 400 })
    }

    // Desencriptar el token
    const empresaData = await decryptData(body.token)

    if (!empresaData) {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      empresaData: empresaData,
    })
  } catch (error) {
    console.error("Error desencriptando token:", error)
    return NextResponse.json({ error: "Error al desencriptar el token" }, { status: 500 })
  }
}
