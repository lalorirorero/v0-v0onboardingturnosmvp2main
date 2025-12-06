import { type NextRequest, NextResponse } from "next/server"
import { encryptData } from "@/lib/crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar que tenemos los datos de la empresa
    if (!body.empresaData) {
      return NextResponse.json({ error: "Se requieren los datos de la empresa" }, { status: 400 })
    }

    // Encriptar los datos de la empresa
    const token = await encryptData(body.empresaData)

    // Generar el link con el token
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000"
    const link = `${baseUrl}?token=${token}`

    return NextResponse.json({
      success: true,
      link: link,
      token: token,
      message: "Link generado exitosamente. El token contiene los datos encriptados de forma segura.",
    })
  } catch (error) {
    console.error("Error generando link:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al generar el link",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
