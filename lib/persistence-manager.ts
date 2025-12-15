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
}

export interface PersistedState {
  data: OnboardingFormData
  metadata: PersistenceMetadata
}

const STORAGE_KEY = "onboarding_draft"
const PREFILL_KEY = "onboarding_prefill"
const SCHEMA_VERSION = "2.0"

export class PersistenceManager {
  // Guardar borrador
  static saveDraft(data: OnboardingFormData, metadata: PersistenceMetadata): void {
    try {
      const state: PersistedState = {
        data,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          version: SCHEMA_VERSION,
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      console.log("[v0] Draft saved:", metadata.currentStep)
    } catch (error) {
      console.error("[v0] Error saving draft:", error)
    }
  }

  // Cargar borrador
  static loadDraft(): PersistedState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const state: PersistedState = JSON.parse(stored)

      // Validar versión del schema
      if (state.metadata.version !== SCHEMA_VERSION) {
        console.warn("[v0] Schema version mismatch, clearing draft")
        this.clearDraft()
        return null
      }

      console.log("[v0] Draft loaded:", state.metadata.currentStep)
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

  // Merge con reglas: nunca sobreescribir con vacíos
  static mergeData(prefill: Partial<OnboardingFormData>, draft: Partial<OnboardingFormData>): OnboardingFormData {
    const merged: any = { ...prefill }

    // Función para determinar si un valor es válido (no vacío)
    const isValidValue = (value: any): boolean => {
      if (value === null || value === undefined) return false
      if (typeof value === "string" && value.trim() === "") return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    }

    // Mergear cada sección respetando las reglas
    Object.keys(draft).forEach((key) => {
      const draftValue = (draft as any)[key]
      const prefillValue = (merged as any)[key]

      // Si el draft tiene valor válido, usar draft
      if (isValidValue(draftValue)) {
        // Para objetos, mergear recursivamente
        if (typeof draftValue === "object" && !Array.isArray(draftValue) && draftValue !== null) {
          if (typeof prefillValue === "object" && !Array.isArray(prefillValue) && prefillValue !== null) {
            merged[key] = { ...prefillValue, ...draftValue }
            // Limpiar propiedades vacías del merge
            Object.keys(merged[key]).forEach((subKey) => {
              if (!isValidValue(merged[key][subKey]) && isValidValue(prefillValue[subKey])) {
                merged[key][subKey] = prefillValue[subKey]
              }
            })
          } else {
            merged[key] = draftValue
          }
        } else {
          // Para valores primitivos y arrays, usar draft directamente
          merged[key] = draftValue
        }
      }
      // Si draft no tiene valor válido pero prefill sí, mantener prefill (ya está en merged)
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

      // Generar Excel en base64
      const excelBase64 = await this.generateExcelBase64(data)

      const payload: ZohoPayload = {
        accion: data.id_zoho ? "actualizar" : "crear",
        timestamp: new Date().toISOString(),
        eventType: "complete",
        id_zoho: data.id_zoho || undefined,
        formData: data,
        metadata: {
          empresaRut: data.empresa.rut || "",
          empresaNombre: data.empresa.razonSocial || data.empresa.nombreFantasia || "",
          pasoActual: 9,
          totalPasos: 10,
          porcentajeProgreso: 100,
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
