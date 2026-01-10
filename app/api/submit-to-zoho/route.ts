import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendToZohoFlow, type ZohoPayload } from "@/lib/backend"
import ExcelJS from "exceljs"
import * as XLSX from "xlsx"
import path from "path"

const TEMPLATE_PATH = path.join(process.cwd(), "assets", "templates", "PLANTILLA_INGRESO.xlsx")
const STORAGE_BUCKET = "onboarding-excels"
const SIGNED_URL_TTL_SECONDS = 14 * 24 * 60 * 60

const sanitizeRut = (rut?: string) => (rut || "sin-rut").replace(/\./g, "").replace(/-/g, "").trim() || "sin-rut"

const formatTimestamp = () => {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}${pad(now.getSeconds())}`
}

const splitNombre = (nombreCompleto?: string) => {
  const trimmed = (nombreCompleto || "").trim()
  if (!trimmed) return { nombres: "", apellidos: "" }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { nombres: parts[0], apellidos: "" }
  return { nombres: parts.slice(0, -1).join(" "), apellidos: parts.slice(-1).join(" ") }
}

const setExcelCell = (
  sheet: ExcelJS.Worksheet,
  cellAddress: string,
  value: string | number | null | undefined,
) => {
  if (value === undefined || value === null || value === "") return
  sheet.getCell(cellAddress).value = value
}

const buildUsuariosWorkbook = (payload: ZohoPayload) => {
  const headers = [
    "identificador",
    "email",
    "email alternativo comprobantes",
    "nombre",
    "apellido",
    "grupo",
    "fono1",
    "fono2",
    "fono3",
    "identificador razon social",
  ]

  const empresaRut = payload.formData?.empresa?.rut || ""
  const rows = (payload.formData?.trabajadores || []).map((trabajador: any) => {
    const { nombres, apellidos } = splitNombre(trabajador?.nombre)
    return [
      trabajador?.rut || "",
      trabajador?.correo || "",
      "",
      nombres,
      apellidos,
      trabajador?.grupoNombre || trabajador?.grupo || "",
      trabajador?.telefono1 || "",
      trabajador?.telefono2 || "",
      trabajador?.telefono3 || "",
      empresaRut,
    ]
  })

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, "Usuarios")
  return wb
}

const buildPlanificacionWorkbook = async (payload: ZohoPayload) => {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)
  const sheet = wb.getWorksheet("Trabajadores")
  if (!sheet) {
    throw new Error("No se encontro la hoja 'Trabajadores' en la plantilla.")
  }

  const empresa = payload.formData?.empresa || ({} as any)
  const admin = payload.formData?.admins?.[0] || {}

  setExcelCell(sheet, "C7", empresa.rut || "")
  setExcelCell(sheet, "C8", empresa.nombreFantasia || "")
  setExcelCell(sheet, "C9", empresa.rut || "")
  setExcelCell(sheet, "C10", empresa.giro || "")
  setExcelCell(sheet, "C11", empresa.direccion || "")
  setExcelCell(sheet, "C12", empresa.comuna || "")
  setExcelCell(sheet, "C13", empresa.emailFacturacion || "")
  setExcelCell(sheet, "C14", empresa.telefonoContacto || "")
  setExcelCell(
    sheet,
    "C15",
    Array.isArray(empresa.sistema) ? empresa.sistema.join(", ") : empresa.sistema || "",
  )
  setExcelCell(sheet, "C16", empresa.rubro || "")

  const adminNombre = [admin?.nombre, admin?.apellido].filter(Boolean).join(" ")
  setExcelCell(sheet, "C19", adminNombre)
  setExcelCell(sheet, "C20", admin?.rut || "")
  setExcelCell(sheet, "C21", admin?.telefono || "")
  setExcelCell(sheet, "C22", admin?.email || "")

  setExcelCell(sheet, "J25", "Col")
  setExcelCell(sheet, "C22", admin?.email || "")

  const turnos = payload.formData?.turnos || []
  const planificaciones = payload.formData?.planificaciones || []
  const asignaciones = payload.formData?.asignaciones || []
  const trabajadores = payload.formData?.trabajadores || []
  const admins = payload.formData?.admins || []

  const workerHeaderRowIndex = 25
  const workerHeaderRow = sheet.getRow(workerHeaderRowIndex)
  const cloneStyle = (style: ExcelJS.Style | undefined) =>
    style ? (JSON.parse(JSON.stringify(style)) as ExcelJS.Style) : undefined
  const headerStyles = Array.from({ length: 5 }, (_, idx) => cloneStyle(workerHeaderRow.getCell(2 + idx).style))

  const adminRows = admins.length > 0 ? admins : [null]
  const adminTableRows = [
    [null, "Nombre", "RUT", "Email", "Telefono", "Cargo"],
    ...adminRows.map((admin: any) => {
      if (!admin) return [null, "Sin administradores", "", "", "", ""]
      const adminNombre = [admin?.nombre, admin?.apellido].filter(Boolean).join(" ")
      return [null, adminNombre, admin?.rut || "", admin?.email || "", admin?.telefono || "", admin?.cargo || ""]
    }),
    [null],
  ]

  sheet.spliceRows(workerHeaderRowIndex, 0, ...adminTableRows)

  const adminHeaderRow = sheet.getRow(workerHeaderRowIndex)
  headerStyles.forEach((style, index) => {
    if (style) adminHeaderRow.getCell(2 + index).style = style
  })

  const newWorkerHeaderRowIndex = workerHeaderRowIndex + adminTableRows.length
  setExcelCell(sheet, `J${newWorkerHeaderRowIndex}`, "Col")

  const findTurno = (turnoId: string | number | null | undefined) =>
    turnos.find((turno: any) => String(turno.id) === String(turnoId))

  const hasLibre = (turno: any) => {
    const nombre = String(turno?.nombre || "").toLowerCase()
    return nombre.includes("libre") || nombre.includes("descanso")
  }

  const findAsignacion = (trabajadorId: string | number) =>
    asignaciones.find(
      (asig: any) =>
        String(asig.trabajadorId) === String(trabajadorId) &&
        asig.planificacionId &&
        asig.desde &&
        asig.hasta,
    )

  const startRow = newWorkerHeaderRowIndex + 1
  trabajadores.forEach((trabajador: any, index: number) => {
    const rowIndex = startRow + index
    const { nombres, apellidos } = splitNombre(trabajador?.nombre)
    const grupo = trabajador?.grupoNombre || trabajador?.grupo || ""

    const asignacion = findAsignacion(trabajador?.id)
    const plan = planificaciones.find((p: any) => String(p.id) === String(asignacion?.planificacionId))
    const fechaInicio = asignacion?.desde || ""
    const fechaFin = asignacion?.hasta === "permanente" ? "PERMANENTE" : asignacion?.hasta || ""

    const rowValues: (string | number)[] = [
      trabajador?.rut || "",
      trabajador?.correo || "",
      nombres,
      apellidos,
      grupo,
      fechaInicio,
      fechaFin,
    ]

    const diasTurnos = Array.isArray(plan?.diasTurnos) ? plan.diasTurnos : Array(7).fill(null)

    diasTurnos.forEach((turnoId: any) => {
      const turno = findTurno(turnoId)
      if (!turno || hasLibre(turno)) {
        rowValues.push("", "", "")
        return
      }
      rowValues.push(turno.horaInicio || "", turno.colacionMinutos || "", turno.horaFin || "")
    })

    const row = sheet.getRow(rowIndex)
    rowValues.forEach((value, valueIndex) => {
      if (value === undefined || value === null || value === "") return
      row.getCell(2 + valueIndex).value = value
    })
  })

  return wb
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ===== /api/submit-to-zoho: INICIO =====")

    const payload: ZohoPayload = await request.json()
    const formData = payload.formData ?? ({} as ZohoPayload["formData"])
    const safeFormData = {
      ...formData,
      empresa: formData.empresa ?? ({} as ZohoPayload["formData"]["empresa"]),
      admins: Array.isArray(formData.admins) ? formData.admins : [],
      trabajadores: Array.isArray(formData.trabajadores) ? formData.trabajadores : [],
      turnos: Array.isArray(formData.turnos) ? formData.turnos : [],
      planificaciones: Array.isArray(formData.planificaciones) ? formData.planificaciones : [],
      asignaciones: Array.isArray(formData.asignaciones) ? formData.asignaciones : [],
      configureNow: Boolean(formData.configureNow),
    }
    payload.formData = safeFormData

    console.log("[v0] /api/submit-to-zoho: Payload recibido")
    console.log("[v0] /api/submit-to-zoho: id_zoho:", payload.id_zoho)
    console.log("[v0] /api/submit-to-zoho: eventType:", payload.eventType)
    console.log("[v0] /api/submit-to-zoho: accion:", payload.accion)
    console.log("[v0] /api/submit-to-zoho: empresa:", safeFormData.empresa?.razonSocial)
    // </CHANGE>

    if (
      payload.eventType === "complete" &&
      safeFormData.empresa &&
      safeFormData.empresa.razonSocial &&
      safeFormData.empresa.razonSocial.trim() !== ""
    ) {
      console.log("[v0] /api/submit-to-zoho: Generando archivos Excel...")

      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("[v0] /api/submit-to-zoho: Faltan credenciales de Supabase.")
      } else {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false },
          })
          const rutKey = sanitizeRut(safeFormData.empresa.rut)
          const timestamp = formatTimestamp()
          const usuariosFilename = `usuarios-${rutKey}-${timestamp}.xlsx`
          const planificacionesFilename = `planificaciones-${rutKey}-${timestamp}.xlsx`
          const usuariosPath = `onboarding/${rutKey}/${usuariosFilename}`
          const planificacionesPath = `onboarding/${rutKey}/${planificacionesFilename}`

          const usuariosWorkbook = buildUsuariosWorkbook(payload)
          const planificacionesWorkbook = await buildPlanificacionWorkbook(payload)

          const usuariosBuffer = XLSX.write(usuariosWorkbook, { type: "buffer", bookType: "xlsx" })
          const planificacionesBuffer = Buffer.from(await planificacionesWorkbook.xlsx.writeBuffer())

          const uploadOptions = {
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            upsert: true,
          }

          const { error: usuariosUploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(usuariosPath, usuariosBuffer, uploadOptions)
          if (usuariosUploadError) throw usuariosUploadError

          const { error: planificacionesUploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(planificacionesPath, planificacionesBuffer, uploadOptions)
          if (planificacionesUploadError) throw planificacionesUploadError

          const { data: usuariosSigned, error: usuariosSignedError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(usuariosPath, SIGNED_URL_TTL_SECONDS)
          if (usuariosSignedError) throw usuariosSignedError

          const { data: planificacionesSigned, error: planificacionesSignedError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(planificacionesPath, SIGNED_URL_TTL_SECONDS)
          if (planificacionesSignedError) throw planificacionesSignedError

          payload.excelUrls = {
            usuarios: { filename: usuariosFilename, url: usuariosSigned?.signedUrl || "" },
            planificaciones: { filename: planificacionesFilename, url: planificacionesSigned?.signedUrl || "" },
          }
          payload.excelUrlUsuarios = usuariosSigned?.signedUrl || ""
          payload.excelUrlPlanificaciones = planificacionesSigned?.signedUrl || ""
          payload.excelFile = null

          console.log(
            "[v0] /api/submit-to-zoho: Excel subidos:",
            payload.excelUrlUsuarios,
            payload.excelUrlPlanificaciones,
          )
        } catch (uploadError) {
          console.error("[v0] /api/submit-to-zoho: Error subiendo Excel:", uploadError)
        }
      }
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
      status: 200,
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
