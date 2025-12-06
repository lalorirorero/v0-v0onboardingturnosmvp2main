import { type NextRequest, NextResponse } from "next/server"
import { encryptData } from "@/lib/crypto"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Headers recibidos:", Object.fromEntries(request.headers.entries()))

    const contentType = request.headers.get("content-type")
    console.log("[v0] Content-Type:", contentType)

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

    let body
    try {
      const clonedRequest = request.clone()
      body = await clonedRequest.json()
      console.log("[v0] Body parseado exitosamente:", JSON.stringify(body))
    } catch (parseError) {
      console.error("[v0] Error parseando JSON:", parseError)

      // Intentar leer como texto para debug
      try {
        const text = await request.text()
        console.log("[v0] Body como texto:", text)
      } catch (e) {
        console.error("[v0] No se pudo leer el body como texto:", e)
      }

      return NextResponse.json(
        {
          success: false,
          error: "JSON inválido o body vacío",
          details: parseError instanceof Error ? parseError.message : "Error al parsear JSON",
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

    console.log("[v0] Datos de empresa recibidos:", JSON.stringify(body.empresaData))

    // Encriptar los datos de la empresa
    const token = await encryptData(body.empresaData)
    console.log("[v0] Token generado exitosamente, longitud:", token.length)

    // Generar el link con el token
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000"
    const link = `${baseUrl}?token=${encodeURIComponent(token)}`

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
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
