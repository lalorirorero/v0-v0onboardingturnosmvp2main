import { type NextRequest, NextResponse } from "next/server"
import { encryptData } from "@/lib/crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Custom-Host",
  "Access-Control-Max-Age": "86400",
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: true,
      message: "API de generación de links funcionando",
      usage: "Envía un POST con { empresaData: { ... } } en el body",
      example: {
        empresaData: {
          razonSocial: "EMPRESA EJEMPLO LTDA",
          nombreFantasia: "Ejemplo",
          rut: "12345678-9",
          giro: "Servicios",
          direccion: "Calle 123",
          comuna: "Santiago",
          emailFacturacion: "email@ejemplo.cl",
          telefonoContacto: "56912345678",
          sistema: ["1.- GeoVictoria BOX"],
          rubro: "1.- SERVICIOS",
        },
      },
    },
    { headers: corsHeaders },
  ) // Agregando headers CORS
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] === INICIO DE REQUEST ===")
    console.log("[v0] Method:", request.method)
    console.log("[v0] URL:", request.url)
    console.log("[v0] Content-Type:", request.headers.get("content-type"))
    console.log("[v0] Content-Length:", request.headers.get("content-length"))

    console.log("[v0] Todos los headers:")
    request.headers.forEach((value, key) => {
      console.log(`[v0]   ${key}: ${value}`)
    })

    let bodyText = ""
    let body = null

    try {
      // Método 1: request.text()
      bodyText = await request.text()
      console.log("[v0] Método request.text() exitoso - Length:", bodyText.length)
      console.log("[v0] Body preview:", bodyText.substring(0, 100))
    } catch (e) {
      console.log("[v0] request.text() falló, intentando método alternativo")

      try {
        // Método 2: request.json() directo
        body = await request.json()
        console.log("[v0] Método request.json() exitoso")
        bodyText = JSON.stringify(body)
      } catch (e2) {
        console.error("[v0] Todos los métodos de lectura fallaron")
        return NextResponse.json(
          {
            success: false,
            error: "No se pudo leer el body de la solicitud",
            hint: "Verifica la configuración de Postman: Body → raw → JSON",
          },
          { status: 400, headers: corsHeaders }, // Agregando headers CORS
        )
      }
    }

    // Validar que el body no esté vacío
    if (!bodyText || bodyText.trim().length === 0) {
      console.error("[v0] El body está vacío")
      return NextResponse.json(
        {
          success: false,
          error: "El body de la solicitud está vacío",
          hint: "En Postman: 1) Selecciona 'Body' tab, 2) Marca 'raw', 3) Selecciona 'JSON' en el dropdown, 4) Pega el JSON",
          debug: {
            contentType: request.headers.get("content-type"),
            contentLength: request.headers.get("content-length"),
            hasBody: !!bodyText,
          },
        },
        { status: 400, headers: corsHeaders }, // Agregando headers CORS
      )
    }

    // Parsear JSON si aún no lo hemos hecho
    if (!body) {
      try {
        body = JSON.parse(bodyText)
        console.log("[v0] Body parseado exitosamente")
      } catch (parseError) {
        console.error("[v0] Error parseando JSON:", parseError)
        return NextResponse.json(
          {
            success: false,
            error: "JSON inválido",
            details: parseError instanceof Error ? parseError.message : "Error al parsear JSON",
            receivedText: bodyText.substring(0, 200),
            hint: "Verifica que el JSON esté bien formado (usa comillas dobles)",
          },
          { status: 400, headers: corsHeaders }, // Agregando headers CORS
        )
      }
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
        { status: 400, headers: corsHeaders }, // Agregando headers CORS
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

    return NextResponse.json(
      {
        success: true,
        link: link,
        token: token,
        message: "Link generado exitosamente. Copia este link para prellenar el formulario.",
      },
      { headers: corsHeaders },
    ) // Agregando headers CORS
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
      { status: 500, headers: corsHeaders }, // Agregando headers CORS
    )
  }
}
