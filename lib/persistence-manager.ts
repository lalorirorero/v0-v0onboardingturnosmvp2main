import type { OnboardingFormData } from "./types"
import { sendToZohoFlow, type ZohoPayload } from "./backend"
import * as XLSX from "xlsx"

export interface PersistenceMetadata {
  timestamp: number
  version: string
  currentStep: number
  completedSteps: number[]
  hasToken: boolean
  idZoho: string | null
  source: "onboarding-turnos" // Marca explícita de origen
  tokenHash?: string // Hash del token para asociar borrador
}

export interface PersistedState {
  data: OnboardingFormData
  metadata: PersistenceMetadata
}

const STORAGE_KEY = "onboarding_draft"
const PREFILL_KEY = "onboarding_prefill"
const SCHEMA_VERSION = "2.0"
const SOURCE_MARKER = "onboarding-turnos"

export class PersistenceManager {
  static async generateTokenHash(tokenOrIdZoho: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(tokenOrIdZoho)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    return hashHex.substring(0, 16) // Primeros 16 caracteres
  }

  static async saveDraft(
    data: OnboardingFormData,
    metadata: Omit<PersistenceMetadata, "source" | "tokenHash">,
    tokenOrIdZoho?: string,
  ): Promise<void> {
    try {
      const tokenHash = tokenOrIdZoho ? await this.generateTokenHash(tokenOrIdZoho) : undefined

      const state: PersistedState = {
        data,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          version: SCHEMA_VERSION,
          source: SOURCE_MARKER, // Marca explícita
          tokenHash, // Hash para asociación
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      console.log("[v0] Draft saved:", metadata.currentStep, "tokenHash:", tokenHash?.substring(0, 8))
    } catch (error) {
      console.error("[v0] Error saving draft:", error)
    }
  }

  static async loadDraft(currentTokenOrIdZoho?: string): Promise<PersistedState | null> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        console.log("[v0] No draft found in localStorage")
        return null
      }

      const state: PersistedState = JSON.parse(stored)

      // Validación 1: Marca de origen
      if (state.metadata.source !== SOURCE_MARKER) {
        console.warn("[v0] Draft rejected: no source marker")
        this.clearDraft()
        return null
      }

      // Validación 2: Versión del schema
      if (state.metadata.version !== SCHEMA_VERSION) {
        console.warn("[v0] Draft rejected: schema version mismatch")
        this.clearDraft()
        return null
      }

      // Validación 3: Progreso real (currentStep > 0)
      if (!state.metadata || state.metadata.currentStep === undefined || state.metadata.currentStep === 0) {
        console.warn("[v0] Draft rejected: no progress (currentStep = 0)")
        this.clearDraft()
        return null
      }

      // Validación 4: Datos coherentes (no objeto vacío)
      if (!state.data || Object.keys(state.data).length === 0) {
        console.warn("[v0] Draft rejected: empty data")
        this.clearDraft()
        return null
      }

      // Validación 5: Asociación con token actual (si hay token)
      if (currentTokenOrIdZoho) {
        const currentHash = await this.generateTokenHash(currentTokenOrIdZoho)
        if (state.metadata.tokenHash && state.metadata.tokenHash !== currentHash) {
          console.warn("[v0] Draft rejected: token mismatch", {
            draftTokenHash: state.metadata.tokenHash.substring(0, 8),
            currentTokenHash: currentHash.substring(0, 8),
          })
          return null
        }
      }

      console.log("[v0] Draft validated and loaded:", {
        currentStep: state.metadata.currentStep,
        hasToken: state.metadata.hasToken,
        tokenHash: state.metadata.tokenHash?.substring(0, 8),
      })

      return state
    } catch (error) {
      console.error("[v0] Error loading draft:", error)
      return null
    }
  }

  // Guardar prefill (datos del token)
  static savePrefill(data: Partial<OnboardingFormData>, idZoho: string): void {
    try {
      const prefill = {
        data,
        idZoho,
        timestamp: Date.now(),
      }
      localStorage.setItem(PREFILL_KEY, JSON.stringify(prefill))
      console.log("[v0] Prefill saved for idZoho:", idZoho)
    } catch (error) {
      console.error("[v0] Error saving prefill:", error)
    }
  }

  // Cargar prefill
  static loadPrefill(): { data: Partial<OnboardingFormData>; idZoho: string } | null {
    try {
      const stored = localStorage.getItem(PREFILL_KEY)
      if (!stored) return null

      return JSON.parse(stored)
    } catch (error) {
      console.error("[v0] Error loading prefill:", error)
      return null
    }
  }

  static mergeData(prefill: Partial<OnboardingFormData>, draft: Partial<OnboardingFormData>): OnboardingFormData {
    const merged: any = { ...prefill }

    const isValidValue = (value: any): boolean => {
      if (value === null || value === undefined) return false
      if (typeof value === "string" && value.trim() === "") return false
      if (Array.isArray(value) && value.length === 0) return false
      if (typeof value === "object" && Object.keys(value).length === 0) return false
      return true
    }

    Object.keys(draft).forEach((key) => {
      const draftValue = (draft as any)[key]
      const prefillValue = (merged as any)[key]

      if (isValidValue(draftValue)) {
        if (typeof draftValue === "object" && !Array.isArray(draftValue) && draftValue !== null) {
          if (typeof prefillValue === "object" && !Array.isArray(prefillValue) && prefillValue !== null) {
            merged[key] = { ...prefillValue }
            Object.keys(draftValue).forEach((subKey) => {
              if (isValidValue(draftValue[subKey])) {
                merged[key][subKey] = draftValue[subKey]
              } else if (!isValidValue(merged[key][subKey]) && isValidValue(prefillValue[subKey])) {
                // Mantener prefill si draft es vacío y prefill es válido
                merged[key][subKey] = prefillValue[subKey]
              }
            })
          } else {
            merged[key] = draftValue
          }
        } else {
          merged[key] = draftValue
        }
      }
      // Si draft no tiene valor válido, mantener prefill (ya está en merged)
    })

    return merged as OnboardingFormData
  }

  // Limpiar borrador
  static clearDraft(): void {
    localStorage.removeItem(STORAGE_KEY)
    console.log("[v0] Draft cleared")
  }

  // Limpiar prefill
  static clearPrefill(): void {
    localStorage.removeItem(PREFILL_KEY)
    console.log("[v0] Prefill cleared")
  }

  // Resetear a estado inicial (mantener prefill)
  static resetToInitial(): PersistedState | null {
    const prefill = this.loadPrefill()
    if (!prefill) {
      this.clearDraft()
      return null
    }

    // Crear estado con solo prefill
    const state: PersistedState = {
      data: prefill.data as OnboardingFormData,
      metadata: {
        timestamp: Date.now(),
        version: SCHEMA_VERSION,
        currentStep: 0,
        completedSteps: [],
        hasToken: true,
        idZoho: prefill.idZoho,
        source: SOURCE_MARKER,
      },
    }

    this.saveDraft(state.data, state.metadata)
    return state
  }

  static async saveComplete(data: OnboardingFormData & { id_zoho?: string | null }): Promise<{
    success: boolean
    error?: string
    data?: any
  }> {
    try {
      console.log("[v0] PersistenceManager.saveComplete: Enviando datos completos a Zoho Flow")

      const excelBase64 = await this.generateExcelBase64(data)

      const payload: ZohoPayload = {
        accion: data.id_zoho ? "actualizar" : "crear",
        fechaHoraEnvio: new Date().toISOString(), // Timestamp del envío
        eventType: "complete",
        id_zoho: data.id_zoho || null,
        formData: data,
        metadata: {
          empresaRut: data.empresa.rut || "",
          empresaNombre: data.empresa.razonSocial || data.empresa.nombreFantasia || "",
          pasoActual: 9,
          totalPasos: 10,
          porcentajeProgreso: 100,
          totalCambios: 0,
          editedFields: [],
        },
        excelFile: excelBase64
          ? {
              filename: `onboarding_${data.empresa.razonSocial || "empresa"}.xlsx`,
              base64: excelBase64,
              mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }
          : null,
      }

      const result = await sendToZohoFlow(payload)

      if (result.success) {
        console.log("[v0] Datos enviados exitosamente a Zoho Flow")
        this.clearDraft()
        this.clearPrefill()
      } else {
        console.error("[v0] Error al enviar datos a Zoho Flow:", result.error)
      }

      return result
    } catch (error) {
      console.error("[v0] Error en saveComplete:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }
    }
  }

  private static async generateExcelBase64(data: OnboardingFormData): Promise<string | null> {
    try {
      // Crear workbook
      const wb = XLSX.utils.book_new()

      // Hoja 1: Empresa
      const empresaData = [
        ["Campo", "Valor"],
        ["Razón Social", data.empresa.razonSocial || ""],
        ["Nombre Fantasía", data.empresa.nombreFantasia || ""],
        ["RUT", data.empresa.rut || ""],
        ["Giro", data.empresa.giro || ""],
        ["Dirección", data.empresa.direccion || ""],
        ["Comuna", data.empresa.comuna || ""],
        ["Email Facturación", data.empresa.emailFacturacion || ""],
        ["Teléfono Contacto", data.empresa.telefonoContacto || ""],
        ["Sistemas", (data.empresa.sistema || []).join(", ")],
        ["Rubro", data.empresa.rubro || ""],
      ]
      const wsEmpresa = XLSX.utils.aoa_to_sheet(empresaData)
      XLSX.utils.book_append_sheet(wb, wsEmpresa, "Empresa")

      // Hoja 2: Administradores
      if (data.admins && data.admins.length > 0) {
        const adminsData = [
          ["Nombre", "Apellido", "RUT", "Email", "Teléfono", "Grupo"],
          ...data.admins.map((admin: any) => [
            admin.nombre || "",
            admin.apellido || "",
            admin.rut || "",
            admin.email || "",
            admin.telefono || "",
            admin.grupo || "",
          ]),
        ]
        const wsAdmins = XLSX.utils.aoa_to_sheet(adminsData)
        XLSX.utils.book_append_sheet(wb, wsAdmins, "Administradores")
      }

      // Hoja 3: Trabajadores
      if (data.trabajadores && data.trabajadores.length > 0) {
        const trabajadoresData = [
          ["Nombre", "RUT", "Email", "Grupo"],
          ...data.trabajadores.map((trab: any) => [
            trab.nombre || "",
            trab.rut || "",
            trab.email || "",
            trab.grupo || "",
          ]),
        ]
        const wsTrabajadores = XLSX.utils.aoa_to_sheet(trabajadoresData)
        XLSX.utils.book_append_sheet(wb, wsTrabajadores, "Trabajadores")
      }

      // Hoja 4: Turnos
      if (data.turnos && data.turnos.length > 0) {
        const turnosData = [
          ["Nombre", "Hora Inicio", "Hora Fin", "Días Semana", "Color"],
          ...data.turnos.map((turno: any) => [
            turno.nombre || "",
            turno.horaInicio || "",
            turno.horaFin || "",
            (turno.diasSemana || []).join(", "),
            turno.color || "",
          ]),
        ]
        const wsTurnos = XLSX.utils.aoa_to_sheet(turnosData)
        XLSX.utils.book_append_sheet(wb, wsTurnos, "Turnos")
      }

      // Hoja 5: Planificaciones
      if (data.planificaciones && data.planificaciones.length > 0) {
        const planificacionesData = [
          ["Nombre", "Fecha Inicio", "Fecha Fin", "Turnos"],
          ...data.planificaciones.map((plan: any) => [
            plan.nombre || "",
            plan.fechaInicio || "",
            plan.fechaFin || "",
            (plan.turnos || []).map((t: any) => `${t.turnoId}: ${(t.dias || []).join(",")}`).join(" | "),
          ]),
        ]
        const wsPlanificaciones = XLSX.utils.aoa_to_sheet(planificacionesData)
        XLSX.utils.book_append_sheet(wb, wsPlanificaciones, "Planificaciones")
      }

      // Hoja 6: Asignaciones
      if (data.asignaciones && data.asignaciones.length > 0) {
        const asignacionesData = [
          ["Trabajador RUT", "Planificación ID"],
          ...data.asignaciones.map((asig: any) => [asig.trabajadorRut || "", asig.planificacionId || ""]),
        ]
        const wsAsignaciones = XLSX.utils.aoa_to_sheet(asignacionesData)
        XLSX.utils.book_append_sheet(wb, wsAsignaciones, "Asignaciones")
      }

      // Convertir a base64
      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" })
      console.log("[v0] Excel generado exitosamente")
      return wbout
    } catch (error) {
      console.error("[v0] Error generando Excel:", error)
      return null
    }
  }
}
