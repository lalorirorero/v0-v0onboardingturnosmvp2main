import { type NextRequest, NextResponse } from "next/server"
import { encryptData } from "@/lib/crypto"

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        {
          success: false,
          error: "Content-Type debe ser application/json",
        },
        { status: 400 },
      )
    }

    let body
    try {
      const text = await request.text()
      console.log("[v0] Request body recibido:", text)

      if (!text || text.trim() === "") {
        return NextResponse.json(
          {
            success: false,
            error: "El body de la solicitud está vacío",
          },
          { status: 400 },
        )
      }

      body = JSON.parse(text)
    } catch (parseError) {
      console.error("[v0] Error parseando JSON:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "JSON inválido en el body de la solicitud",
          details: parseError instanceof Error ? parseError.message : "Error al parsear JSON",
        },
        { status: 400 },
      )
    }

    // Validar que tenemos los datos de la empresa
    if (!body.empresaData) {
      return NextResponse.json(
        {
          success: false,
          error: "Se requieren los datos de la empresa",
          hint: 'El body debe tener la estructura: { "empresaData": { ... } }',
        },
        { status: 400 },
      )
    }

    console.log("[v0] Datos de empresa recibidos:", JSON.stringify(body.empresaData))

    // Encriptar los datos de la empresa
    const token = await encryptData(body.empresaData)
    console.log("[v0] Token generado exitosamente")

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
    console.error("[v0] Error generando link:", error)
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
