import { type NextRequest, NextResponse } from "next/server"
import { sendToZohoFlow, type ZohoPayload } from "@/lib/backend"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const payload: ZohoPayload = await request.json()

    console.log("[v0] API submit-to-zoho: Payload recibido", {
      eventType: payload.eventType,
      accion: payload.accion,
      hasFormData: !!payload.formData,
      empresaRazonSocial: payload.formData?.empresa?.razonSocial || "vacío",
    })

    if (
      payload.eventType === "complete" &&
      payload.formData &&
      payload.formData.empresa &&
      payload.formData.empresa.razonSocial &&
      payload.formData.empresa.razonSocial.trim() !== ""
    ) {
      console.log("[v0] API submit-to-zoho: Generando Excel...")

      const workbook = XLSX.utils.book_new()

      const empresaSheet = XLSX.utils.json_to_sheet([payload.formData.empresa])
      XLSX.utils.book_append_sheet(workbook, empresaSheet, "Empresa")

      const adminsSheet = XLSX.utils.json_to_sheet(
        payload.formData.admins.length > 0 ? payload.formData.admins : [{ mensaje: "Sin administradores" }],
      )
      XLSX.utils.book_append_sheet(workbook, adminsSheet, "Administradores")

      const trabajadoresSheet = XLSX.utils.json_to_sheet(
        payload.formData.trabajadores.length > 0 ? payload.formData.trabajadores : [{ mensaje: "Sin trabajadores" }],
      )
      XLSX.utils.book_append_sheet(workbook, trabajadoresSheet, "Trabajadores")

      const turnosSheet = XLSX.utils.json_to_sheet(
        payload.formData.turnos.length > 0 ? payload.formData.turnos : [{ mensaje: "Sin turnos" }],
      )
      XLSX.utils.book_append_sheet(workbook, turnosSheet, "Turnos")

      const planificacionesSheet = XLSX.utils.json_to_sheet(
        payload.formData.planificaciones.length > 0
          ? payload.formData.planificaciones
          : [{ mensaje: "Sin planificaciones" }],
      )
      XLSX.utils.book_append_sheet(workbook, planificacionesSheet, "Planificaciones")

      const asignacionesSheet = XLSX.utils.json_to_sheet(
        payload.formData.asignaciones.length > 0 ? payload.formData.asignaciones : [{ mensaje: "Sin asignaciones" }],
      )
      XLSX.utils.book_append_sheet(workbook, asignacionesSheet, "Asignaciones")

      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
      const base64 = Buffer.from(excelBuffer).toString("base64")

      payload.excelFile = {
        filename: `onboarding-${payload.formData.empresa.rut.replace(/\./g, "").replace(/-/g, "")}.xlsx`,
        base64: base64,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }

      console.log("[v0] API submit-to-zoho: Excel generado exitosamente")
    } else {
      console.log("[v0] API submit-to-zoho: No se genera Excel (evento progreso o datos vacíos)")
    }

    const result = await sendToZohoFlow(payload)

    console.log("[v0] API submit-to-zoho: Respuesta de Zoho Flow", {
      success: result.success,
      error: result.error,
    })

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    console.error("[v0] API submit-to-zoho: ERROR CRÍTICO", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido al procesar webhook",
      },
      { status: 500 },
    )
  }
}
