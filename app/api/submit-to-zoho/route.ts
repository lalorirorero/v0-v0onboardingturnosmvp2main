import { type NextRequest, NextResponse } from "next/server"
import { sendToZohoFlow, type ZohoPayload } from "@/lib/backend"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ===== /api/submit-to-zoho: INICIO =====")

    const payload: ZohoPayload = await request.json()

    console.log("[v0] /api/submit-to-zoho: Payload recibido")
    console.log("[v0] /api/submit-to-zoho: id_zoho:", payload.id_zoho)
    console.log("[v0] /api/submit-to-zoho: eventType:", payload.eventType)
    console.log("[v0] /api/submit-to-zoho: accion:", payload.accion)
    console.log("[v0] /api/submit-to-zoho: empresa:", payload.formData?.empresa?.razonSocial)
    // </CHANGE>

    if (
      payload.eventType === "complete" &&
      payload.formData &&
      payload.formData.empresa &&
      payload.formData.empresa.razonSocial &&
      payload.formData.empresa.razonSocial.trim() !== ""
    ) {
      console.log("[v0] /api/submit-to-zoho: Generando archivo Excel...")

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

      console.log("[v0] /api/submit-to-zoho: ✅ Excel generado:", payload.excelFile.filename)
    }

    console.log("[v0] /api/submit-to-zoho: Llamando a sendToZohoFlow()...")
    const result = await sendToZohoFlow(payload)
    console.log("[v0] /api/submit-to-zoho: Respuesta de sendToZohoFlow():", result)

    if (result.success) {
      console.log("[v0] /api/submit-to-zoho: ✅ ÉXITO - Datos enviados a Zoho Flow")
    } else {
      console.error("[v0] /api/submit-to-zoho: ❌ ERROR - No se pudo enviar a Zoho Flow:", result.error)
    }
    // </CHANGE>

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    console.error("[v0] /api/submit-to-zoho: ❌ ERROR CRÍTICO:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
