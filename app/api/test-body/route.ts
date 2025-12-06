import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  console.log("[v0 TEST] === PRUEBA DE BODY ===")

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  const result: any = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    headers: headers,
  }

  try {
    const body = await request.json()
    result.success = true
    result.bodyReceived = body
    result.bodyType = typeof body
    result.bodyKeys = body ? Object.keys(body) : []
    console.log("[v0 TEST] Body recibido exitosamente:", body)
  } catch (error) {
    result.success = false
    result.error = error instanceof Error ? error.message : "Error desconocido"
    console.error("[v0 TEST] Error leyendo body:", error)
  }

  console.log("[v0 TEST] Resultado:", result)
  return NextResponse.json(result)
}
