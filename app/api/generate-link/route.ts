import { type NextRequest, NextResponse } from "next/server"
import { encryptData } from "@/lib/crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] === INICIO DE REQUEST ===")
    console.log("[v0] Method:", request.method)
    console.log("[v0] URL:", request.url)

    // Log de headers importantes
    const contentType = request.headers.get("content-type")
    console.log("[v0] Content-Type:", contentType)

    const bodyText = await request.text()
    console.log("[v0] Body recibido (length):", bodyText.length)
    console.log("[v0] Body content:", bodyText)

    // Validar que el body no esté vacío
    if (!bodyText || bodyText.trim().length === 0) {
      console.error("[v0] El body está vacío")
      return NextResponse.json(
        {
          success: false,
          error: "El body de la solicitud está vacío",
          hint: "En Postman: 1) Selecciona 'Body' tab, 2) Marca 'raw', 3) Selecciona 'JSON' en el dropdown, 4) Pega el JSON",
        },
        { status: 400 },
      )
    }

    let body
    try {
      body = JSON.parse(bodyText)
      console.log("[v0] Body parseado exitosamente:", JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error("[v0] Error parseando JSON:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "JSON inválido",
          details: parseError instanceof Error ? parseError.message : "Error al parsear JSON",
          receivedText: bodyText.substring(0, 200),
          hint: "Verifica que el JSON esté bien formado (usa comillas dobles, no simples)",
        },
        { status: 400 },
      )
    }

    // Validar estructura de los datos
    if (!body || !body.empresaData) {
      console.error("[v0] empresaData no encontrado")
      return NextResponse.json(
        {
          success: false,
          error: "Se requieren los datos de la empresa",
          hint: 'El body debe tener: { "empresaData": { "razonSocial": "...", ... } }',
          receivedBody: body,
        },
        { status: 400 },
      )
    }

    console.log("[v0] Datos validados correctamente")

    // Encriptar los datos
    console.log("[v0] Encriptando datos...")
    const token = await encryptData(body.empresaData)
    console.log("[v0] Token generado (length):", token.length)

    // Generar el link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000"
    const link = `${baseUrl}?token=${encodeURIComponent(token)}`

    console.log("[v0] Link generado exitosamente")
    console.log("[v0] === FIN REQUEST (SUCCESS) ===")

    return NextResponse.json({
      success: true,
      link: link,
      token: token,
      message: "Link generado exitosamente. Copia este link para prellenar el formulario.",
    })
  } catch (error) {
    console.error("[v0] === ERROR FATAL ===")
    console.error("[v0] Error:", error)
    console.error("[v0] Stack:", error instanceof Error ? error.stack : "No stack")

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
