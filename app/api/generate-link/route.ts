import { type NextRequest, NextResponse } from "next/server"
import { encryptData } from "@/lib/crypto"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] === INICIO DE REQUEST ===")
    console.log("[v0] Method:", request.method)
    console.log("[v0] URL:", request.url)

    // Log de todos los headers
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    console.log("[v0] Headers:", JSON.stringify(headers, null, 2))

    const contentType = request.headers.get("content-type")
    console.log("[v0] Content-Type:", contentType)

    let bodyText = ""
    try {
      bodyText = await request.text()
      console.log("[v0] Body as text:", bodyText)
      console.log("[v0] Body length:", bodyText.length)
    } catch (textError) {
      console.error("[v0] Error reading body as text:", textError)
      return NextResponse.json(
        {
          success: false,
          error: "No se pudo leer el body de la solicitud",
          details: textError instanceof Error ? textError.message : "Error desconocido",
        },
        { status: 400 },
      )
    }

    // Verificar si el body está vacío
    if (!bodyText || bodyText.trim().length === 0) {
      console.error("[v0] Body está vacío!")
      return NextResponse.json(
        {
          success: false,
          error: "El body de la solicitud está vacío",
          hint: "Asegúrate de enviar un JSON en el body con formato: { 'empresaData': { ... } }",
          receivedHeaders: headers,
        },
        { status: 400 },
      )
    }

    let body
    try {
      body = JSON.parse(bodyText)
      console.log("[v0] Body parsed successfully:", JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error("[v0] Error parsing JSON:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "JSON inválido",
          details: parseError instanceof Error ? parseError.message : "Error al parsear JSON",
          receivedText: bodyText.substring(0, 200), // Primeros 200 caracteres
        },
        { status: 400 },
      )
    }

    // Validar que tenemos los datos de la empresa
    if (!body || !body.empresaData) {
      console.error("[v0] empresaData no encontrado en body")
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

    console.log("[v0] Datos de empresa recibidos:", JSON.stringify(body.empresaData, null, 2))

    // Encriptar los datos de la empresa
    console.log("[v0] Iniciando encriptación...")
    const token = await encryptData(body.empresaData)
    console.log("[v0] Token generado (primeros 50 chars):", token.substring(0, 50))

    // Generar el link con el token
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000"
    const link = `${baseUrl}?token=${encodeURIComponent(token)}`

    console.log("[v0] Link generado:", link)
    console.log("[v0] === FIN DE REQUEST (SUCCESS) ===")

    return NextResponse.json({
      success: true,
      link: link,
      token: token,
      message: "Link generado exitosamente",
    })
  } catch (error) {
    console.error("[v0] === ERROR FATAL ===")
    console.error("[v0] Error:", error)
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
