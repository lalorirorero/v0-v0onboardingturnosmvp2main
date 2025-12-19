import { type NextRequest, NextResponse } from "next/server"
import { encryptToken } from "@/lib/backend"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.empresa && !body.empresaData) {
      return NextResponse.json(
        {
          success: false,
          error: "Se requiere el campo 'empresa' con los datos de la empresa",
        },
        { status: 400 },
      )
    }

    const id_zoho = body.id_zoho ? String(body.id_zoho) : null

    const dataToEncrypt = body.empresaData || {
      id_zoho: id_zoho,
      razonSocial: body.empresa?.razonSocial || "",
      nombreFantasia: body.empresa?.nombreFantasia || "",
      rut: body.empresa?.rut || "",
      giro: body.empresa?.giro || "",
      direccion: body.empresa?.direccion || "",
      comuna: body.empresa?.comuna || "",
      emailFacturacion: body.empresa?.emailFacturacion || "",
      telefonoContacto: body.empresa?.telefonoContacto || "",
      sistema: body.empresa?.sistema || [],
      rubro: body.empresa?.rubro || "",
      admins: body.admins || [],
      trabajadores: body.trabajadores || [],
      turnos: body.turnos || [],
      planificaciones: body.planificaciones || [],
      asignaciones: body.asignaciones || [],
    }

    console.log("[v0] generate-link: Datos a encriptar:", {
      id_zoho: dataToEncrypt.id_zoho,
      id_zoho_type: typeof dataToEncrypt.id_zoho,
      razonSocial: dataToEncrypt.razonSocial,
      rut: dataToEncrypt.rut,
      hasAdmins: Array.isArray(dataToEncrypt.admins) && dataToEncrypt.admins.length > 0,
      hasTrabajadores: Array.isArray(dataToEncrypt.trabajadores) && dataToEncrypt.trabajadores.length > 0,
    })

    const token = await encryptToken(dataToEncrypt)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const link = `${baseUrl}?token=${encodeURIComponent(token)}`

    console.log("[v0] generate-link: Token generado exitosamente")

    return NextResponse.json({
      success: true,
      link,
      token,
    })
  } catch (error) {
    console.error("[v0] generate-link: Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
