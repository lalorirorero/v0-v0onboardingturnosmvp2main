/**
 * Sistema centralizado de gestión de datos del onboarding
 * Maneja: token, prellenado, borradores y webhooks
 */

// Tipos de datos
export interface OnboardingData {
  empresa: {
    razonSocial: string
    nombreFantasia?: string
    rut: string
    giro?: string
    direccion?: string
    comuna?: string
    emailFacturacion?: string
    telefonoContacto?: string
    sistema?: string[]
    rubro?: string
  }
  admins: Array<{
    nombre: string
    apellido: string
    email: string
    telefono?: string
    cargo?: string
  }>
  trabajadores: Array<{
    nombre: string
    rut: string
    email: string
    grupo: string
  }>
  turnos: Array<{
    nombre: string
    horaInicio: string
    horaFin: string
    dias: string[]
    color: string
  }>
  planificaciones: Array<{
    nombre: string
    tipo: string
    descripcion?: string
    turnos: string[]
  }>
  asignaciones: Array<{
    trabajador: string
    planificacion: string
    fechaInicio: string
    fechaFin?: string
  }>
  configureNow: boolean
}

export interface SessionData {
  id_zoho?: string
  prefilledData?: OnboardingData
  currentStep: number
  formData: OnboardingData
  hasToken: boolean
  hasDraft: boolean // Añadido para indicar si hay borrador
}

// Constantes
const DRAFT_VERSION = 2
const DRAFT_EXPIRY_DAYS = 14
const DEBOUNCE_DELAY = 1000

/**
 * Clase principal para manejar toda la lógica de datos
 */
export class DataManager {
  private static instance: DataManager
  private sessionData: SessionData
  private saveTimeout: NodeJS.Timeout | null = null

  private constructor() {
    this.sessionData = {
      hasToken: false,
      currentStep: 0,
      formData: this.getEmptyFormData(),
      hasDraft: false, // Añadido para indicar si hay borrador
    }
  }

  static getInstance(): DataManager {
    if (!this.instance) {
      this.instance = new DataManager()
    }
    return this.instance
  }

  // Inicializar desde URL o borrador
  async initialize(): Promise<SessionData> {
    console.log("[DataManager] Inicializando...")

    // 1. Buscar token en URL
    const token = this.getTokenFromURL()

    if (token) {
      console.log("[DataManager] Token encontrado, desencriptando...")
      const decrypted = await this.decryptToken(token)

      if (decrypted) {
        this.sessionData = {
          id_zoho: decrypted.id_zoho,
          prefilledData: decrypted.data,
          currentStep: 0,
          formData: { ...decrypted.data },
          hasToken: true,
          hasDraft: false, // No hay borrador cuando hay token
        }
        console.log("[DataManager] Datos prellenados cargados", {
          id_zoho: decrypted.id_zoho,
          empresa: decrypted.data.empresa.razonSocial,
        })
        return this.sessionData
      }
    }

    // 2. No hay token, buscar borrador local
    console.log("[DataManager] No hay token, buscando borrador local...")
    const draft = this.loadDraft()

    if (draft) {
      this.sessionData = {
        hasToken: false,
        hasDraft: true, // Indicar que hay borrador
        currentStep: draft.currentStep,
        formData: draft.formData,
      }
      console.log("[DataManager] Borrador local encontrado", {
        step: draft.currentStep,
        version: draft.version,
      })
    } else {
      this.sessionData = {
        hasToken: false,
        hasDraft: false,
        currentStep: 0,
        formData: this.getEmptyFormData(),
      }
      console.log("[DataManager] Sin token ni borrador, empezando desde cero")
    }

    return this.sessionData
  }

  // Obtener token de la URL
  private getTokenFromURL(): string | null {
    if (typeof window === "undefined") return null
    const params = new URLSearchParams(window.location.search)
    return params.get("token")
  }

  // Desencriptar token
  private async decryptToken(token: string): Promise<{
    id_zoho?: string
    data: OnboardingData
  } | null> {
    try {
      console.log("[v0] DataManager: Llamando a /api/decrypt-token con token:", token.substring(0, 20) + "...")

      const response = await fetch("/api/decrypt-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      console.log("[v0] DataManager: Respuesta status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] DataManager: Error en respuesta:", errorText)
        return null
      }

      const result = await response.json()
      console.log("[v0] DataManager: Resultado JSON:", result)

      if (!result.success || !result.empresaData) {
        console.error("[v0] DataManager: Respuesta no exitosa o sin empresaData")
        return null
      }

      // Extraer id_zoho y construir OnboardingData
      const empresaData = result.empresaData
      console.log("[v0] DataManager: empresaData recibido:", {
        id_zoho: empresaData.id_zoho,
        razonSocial: empresaData.razonSocial,
        rut: empresaData.rut,
        hasAdmins: !!empresaData.admins,
        hasTrabajadores: !!empresaData.trabajadores,
      })

      const onboardingData: OnboardingData = {
        empresa: {
          razonSocial: empresaData.razonSocial || "",
          nombreFantasia: empresaData.nombreFantasia || "",
          rut: empresaData.rut || "",
          giro: empresaData.giro || "",
          direccion: empresaData.direccion || "",
          comuna: empresaData.comuna || "",
          emailFacturacion: empresaData.emailFacturacion || "",
          telefonoContacto: empresaData.telefonoContacto || "",
          sistema: empresaData.sistema || [],
          rubro: empresaData.rubro || "",
        },
        admins: empresaData.admins || [],
        trabajadores: empresaData.trabajadores || [],
        turnos: empresaData.turnos || [],
        planificaciones: empresaData.planificaciones || [],
        asignaciones: empresaData.asignaciones || [],
        configureNow: true,
      }

      console.log("[v0] DataManager: OnboardingData construido:", {
        empresa: onboardingData.empresa.razonSocial,
        adminsCount: onboardingData.admins.length,
        trabajadoresCount: onboardingData.trabajadores.length,
      })

      return {
        id_zoho: empresaData.id_zoho,
        data: onboardingData,
      }
    } catch (error) {
      console.error("[v0] DataManager: Error desencriptando token:", error)
      return null
    }
  }

  // Cargar borrador de localStorage
  private loadDraft(): { currentStep: number; formData: OnboardingData } | null {
    if (typeof window === "undefined") return null

    try {
      const key = "onboarding_draft_local"
      const stored = localStorage.getItem(key)

      if (!stored) return null

      const draft = JSON.parse(stored)

      // Verificar expiración
      const expiryDate = new Date(draft.timestamp)
      expiryDate.setDate(expiryDate.getDate() + DRAFT_EXPIRY_DAYS)

      if (new Date() > expiryDate) {
        localStorage.removeItem(key)
        return null
      }

      // Verificar versión
      if (draft.version !== DRAFT_VERSION) {
        const validStep = this.calculateValidStep(draft.formData)
        return {
          currentStep: validStep,
          formData: draft.formData,
        }
      }

      return {
        currentStep: draft.currentStep,
        formData: draft.formData,
      }
    } catch (error) {
      console.error("[DataManager] Error cargando borrador:", error)
      return null
    }
  }

  // Guardar borrador (solo si NO hay token)
  saveDraft(step: number, data: OnboardingData) {
    // NO guardar borrador si hay token (datos de Zoho tienen prioridad)
    if (this.sessionData.hasToken) {
      console.log("[DataManager] NO se guarda borrador (hay token de Zoho)")
      return
    }

    // Debounce para no saturar localStorage
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = setTimeout(() => {
      try {
        const draft = {
          version: DRAFT_VERSION,
          currentStep: step,
          formData: data,
          timestamp: new Date().toISOString(),
        }

        localStorage.setItem("onboarding_draft_local", JSON.stringify(draft))
        console.log("[DataManager] Borrador guardado", { step })
      } catch (error) {
        console.error("[DataManager] Error guardando borrador:", error)
      }
    }, DEBOUNCE_DELAY)
  }

  // Eliminar borrador
  deleteDraft() {
    const key = this.getDraftKey()
    if (typeof window !== "undefined") {
      localStorage.removeItem(key)
      console.log("[DataManager] Borrador eliminado")
    }
  }

  // Calcular último paso válido según datos
  private calculateValidStep(data: OnboardingData): number {
    if (data.asignaciones?.length > 0) return 9
    if (data.planificaciones?.length > 0) return 8
    if (data.turnos?.length > 0) return 7
    if (data.trabajadores?.length > 0) return 5
    if (data.admins?.length > 0) return 4
    if (data.empresa?.rut) return 3
    return 2 // Siempre volver al paso 2 como mínimo si hay datos
  }

  // Enviar webhook de progreso a Zoho Flow
  async sendProgressWebhook(step: number, stepName: string) {
    // Solo enviar si hay id_zoho
    if (!this.sessionData.id_zoho) {
      console.log("[v0] DataManager: No se envía progreso (no hay id_zoho)")
      return
    }

    const totalSteps = 10
    const percentage = Math.round((step / totalSteps) * 100)

    const payload = {
      accion: "actualizar",
      eventType: "progress",
      id_zoho: this.sessionData.id_zoho,
      metadata: {
        pasoActual: step,
        pasoNombre: stepName,
        totalPasos: totalSteps,
        porcentajeProgreso: percentage,
        empresaRut: this.sessionData.formData.empresa.rut,
        empresaNombre: this.sessionData.formData.empresa.razonSocial,
      },
    }

    console.log("[v0] DataManager: Enviando progreso a Zoho Flow:", payload)

    try {
      const response = await fetch("/api/submit-to-zoho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`)
      }

      console.log("[v0] DataManager: Progreso enviado exitosamente a Zoho Flow")
    } catch (error) {
      console.error("[v0] DataManager: Error enviando progreso:", error)
      // No lanzar error para no interrumpir el flujo del usuario
    }
  }

  // Enviar datos completos a Zoho Flow
  async sendCompleteWebhook(data: OnboardingData, excelBase64?: string) {
    const payload: any = {
      accion: this.sessionData.id_zoho ? "actualizar" : "crear",
      eventType: "complete",
      formData: data,
      metadata: {
        empresaRut: data.empresa.rut,
        empresaNombre: data.empresa.razonSocial,
        totalCambios: this.calculateChanges(),
        editedFields: this.getEditedFields(),
      },
    }

    // Agregar id_zoho si existe
    if (this.sessionData.id_zoho) {
      payload.id_zoho = this.sessionData.id_zoho
    }

    // Agregar Excel si existe
    if (excelBase64) {
      payload.excelFile = {
        filename: `onboarding_${data.empresa.razonSocial.replace(/\s+/g, "_")}.xlsx`,
        base64: excelBase64,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    }

    try {
      const response = await fetch("/api/submit-to-zoho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Error en envío a Zoho")

      console.log("[DataManager] Datos completos enviados a Zoho Flow")

      // Limpiar borrador después de enviar exitosamente
      this.deleteDraft()

      return true
    } catch (error) {
      console.error("[DataManager] Error enviando datos completos:", error)
      throw error
    }
  }

  // Calcular cambios (si hay datos prellenados)
  private calculateChanges(): number {
    if (!this.sessionData.prefilledData) return 0

    const changes = this.getEditedFields()
    return changes.length
  }

  // Obtener campos editados
  private getEditedFields(): Array<{
    field: string
    originalValue: any
    currentValue: any
  }> {
    if (!this.sessionData.prefilledData) return []

    const changes: Array<{ field: string; originalValue: any; currentValue: any }> = []
    const original = this.sessionData.prefilledData
    const current = this.sessionData.formData

    // Comparar empresa
    Object.keys(current.empresa).forEach((key) => {
      const originalVal = (original.empresa as any)[key]
      const currentVal = (current.empresa as any)[key]

      if (JSON.stringify(originalVal) !== JSON.stringify(currentVal)) {
        changes.push({
          field: `empresa.${key}`,
          originalValue: originalVal,
          currentValue: currentVal,
        })
      }
    })

    // Comparar arrays
    if (original.admins.length !== current.admins.length) {
      changes.push({
        field: "admins",
        originalValue: original.admins.length,
        currentValue: current.admins.length,
      })
    }

    if (original.trabajadores.length !== current.trabajadores.length) {
      changes.push({
        field: "trabajadores",
        originalValue: original.trabajadores.length,
        currentValue: current.trabajadores.length,
      })
    }

    return changes
  }

  // Obtener datos vacíos iniciales
  private getEmptyFormData(): OnboardingData {
    return {
      empresa: {
        razonSocial: "",
        rut: "",
      },
      admins: [],
      trabajadores: [],
      turnos: [],
      planificaciones: [],
      asignaciones: [],
      configureNow: true,
    }
  }

  // Getters
  getSessionData(): SessionData {
    return this.sessionData
  }

  hasToken(): boolean {
    return this.sessionData.hasToken
  }

  hasIdZoho(): boolean {
    return !!this.sessionData.id_zoho
  }

  getIdZoho(): string | undefined {
    return this.sessionData.id_zoho
  }

  updateFormData(data: OnboardingData) {
    this.sessionData.formData = data
    console.log("[v0] DataManager: formData actualizado")
  }

  updateCurrentStep(step: number) {
    this.sessionData.currentStep = step
  }

  private getDraftKey(): string {
    return "onboarding_draft_local"
  }
}
