import { type NextRequest, NextResponse } from "next/server"
import { sendToZohoFlow, type ZohoPayload } from "@/lib/backend"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const payload: ZohoPayload = await request.json()

    if (payload.eventType === "complete" && payload.formData && payload.formData.empresa.razonSocial) {
      const workbook = XLSX.utils.book_new()

      // Hoja 1: Empresa
      const empresaSheet = XLSX.utils.json_to_sheet([payload.formData.empresa])
      XLSX.utils.book_append_sheet(workbook, empresaSheet, "Empresa")

      // Hoja 2: Administradores
      const adminsSheet = XLSX.utils.json_to_sheet(
        payload.formData.admins.length > 0 ? payload.formData.admins : [{ mensaje: "Sin administradores" }],
      )
      XLSX.utils.book_append_sheet(workbook, adminsSheet, "Administradores")

      // Hoja 3: Trabajadores
      const trabajadoresSheet = XLSX.utils.json_to_sheet(
        payload.formData.trabajadores.length > 0 ? payload.formData.trabajadores : [{ mensaje: "Sin trabajadores" }],
      )
      XLSX.utils.book_append_sheet(workbook, trabajadoresSheet, "Trabajadores")

      // Hoja 4: Turnos
      const turnosSheet = XLSX.utils.json_to_sheet(
        payload.formData.turnos.length > 0 ? payload.formData.turnos : [{ mensaje: "Sin turnos" }],
      )
      XLSX.utils.book_append_sheet(workbook, turnosSheet, "Turnos")

      // Hoja 5: Planificaciones
      const planificacionesSheet = XLSX.utils.json_to_sheet(
        payload.formData.planificaciones.length > 0
          ? payload.formData.planificaciones
          : [{ mensaje: "Sin planificaciones" }],
      )
      XLSX.utils.book_append_sheet(workbook, planificacionesSheet, "Planificaciones")

      // Hoja 6: Asignaciones
      const asignacionesSheet = XLSX.utils.json_to_sheet(
        payload.formData.asignaciones.length > 0 ? payload.formData.asignaciones : [{ mensaje: "Sin asignaciones" }],
      )
      XLSX.utils.book_append_sheet(workbook, asignacionesSheet, "Asignaciones")

      // Generar archivo Excel en base64
      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
      const base64 = Buffer.from(excelBuffer).toString("base64")

      payload.excelFile = {
        filename: `onboarding-${payload.formData.empresa.rut.replace(/\./g, "").replace(/-/g, "")}.xlsx`,
        base64: base64,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    }

    const result = await sendToZohoFlow(payload)

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    console.error("[v0] API submit-to-zoho: ERROR", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
