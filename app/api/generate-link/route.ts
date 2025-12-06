import { type NextRequest, NextResponse } from "next/server"
import { encryptData } from "@/lib/crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
    console.log("[v0] Headers recibidos:", JSON.stringify(headers, null, 2))

    const contentType = request.headers.get("content-type")
    console.log("[v0] Content-Type:", contentType)

    let body
    try {
      body = await request.json()
      console.log("[v0] Body parseado exitosamente con request.json():", JSON.stringify(body, null, 2))
    } catch (jsonError) {
      console.error("[v0] Error con request.json():", jsonError)

      try {
        const bodyText = await request.text()
        console.log("[v0] Body como texto:", bodyText)
        console.log("[v0] Body length:", bodyText.length)

        if (!bodyText || bodyText.trim().length === 0) {
          console.error("[v0] El body está completamente vacío")
          return NextResponse.json(
            {
              success: false,
              error: "El body de la solicitud está vacío",
              hint: "Asegúrate de que en Postman: 1) Body está en 'raw', 2) Formato es 'JSON', 3) Content-Type header es 'application/json'",
              receivedHeaders: headers,
            },
            { status: 400 },
          )
        }

        // Intentar parsear manualmente
        body = JSON.parse(bodyText)
        console.log("[v0] Body parseado exitosamente desde texto:", JSON.stringify(body, null, 2))
      } catch (textError) {
        console.error("[v0] Error leyendo como texto:", textError)
        return NextResponse.json(
          {
            success: false,
            error: "No se pudo leer el body de la solicitud",
            details: textError instanceof Error ? textError.message : "Error desconocido",
            jsonError: jsonError instanceof Error ? jsonError.message : "Error JSON",
            receivedHeaders: headers,
          },
          { status: 400 },
        )
      }
    }

    // Validar que tenemos los datos de la empresa
    if (!body || !body.empresaData) {
      console.error("[v0] empresaData no encontrado en body")
      return NextResponse.json(
        {
          success: false,
          error: "Se requieren los datos de la empresa",
          hint: 'El body debe tener la estructura: { "empresaData": { "razonSocial": "...", "rut": "...", ... } }',
          receivedBody: body,
        },
        { status: 400 },
      )
    }

    console.log("[v0] Datos de empresa validados:", JSON.stringify(body.empresaData, null, 2))

    // Encriptar los datos de la empresa
    console.log("[v0] Iniciando encriptación...")
    const token = await encryptData(body.empresaData)
    console.log("[v0] Token generado, longitud:", token.length)
    console.log("[v0] Token (primeros 50 chars):", token.substring(0, 50))

    // Generar el link con el token
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000"
    const link = `${baseUrl}?token=${encodeURIComponent(token)}`

    console.log("[v0] Link completo generado")
    console.log("[v0] === FIN DE REQUEST (SUCCESS) ===")

    return NextResponse.json({
      success: true,
      link: link,
      token: token,
      message:
        "Link generado exitosamente. Copia este link y ábrelo en tu navegador para ver el formulario prellenado.",
    })
  } catch (error) {
    console.error("[v0] === ERROR FATAL ===")
    console.error("[v0] Error completo:", error)
    console.error("[v0] Stack trace:", error instanceof Error ? error.stack : "No stack")
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
