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
          receivedContentType: contentType,
        },
        { status: 400 },
      )
    }

    // Leer directamente como JSON sin clonar
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: "JSON inválido o body vacío",
          details: parseError instanceof Error ? parseError.message : "Error al parsear JSON",
          hint: "Verifica que el body esté en formato JSON válido y que Content-Type sea application/json",
        },
        { status: 400 },
      )
    }

    // Validar que tenemos los datos de la empresa
    if (!body || !body.empresaData) {
      return NextResponse.json(
        {
          success: false,
          error: "Se requieren los datos de la empresa",
          hint: 'El body debe tener la estructura: { "empresaData": { ... } }',
          receivedBody: body,
        },
        { status: 400 },
      )
    }

    // Encriptar los datos de la empresa
    const token = await encryptData(body.empresaData)

    // Generar el link con el token
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000"
    const link = `${baseUrl}?token=${encodeURIComponent(token)}`

    return NextResponse.json({
      success: true,
      link: link,
      token: token,
      message: "Link generado exitosamente",
    })
  } catch (error) {
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
