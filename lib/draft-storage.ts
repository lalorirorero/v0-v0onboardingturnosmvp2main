const DRAFT_KEY_PREFIX = "onboarding-draft"
const DRAFT_EXPIRY_DAYS = 14
const FORM_VERSION = "2.0.0" // Incrementar cuando cambien los pasos

export interface DraftData {
  currentStep: number
  empresa: any
  admins: any[]
  trabajadores: any[]
  turnos: any[]
  planificaciones: any[]
  asignaciones: any[]
  configureNow: boolean
  timestamp: number
  expiresAt: number
  version?: string
}

export function getDraftKey(token?: string): string {
  if (token) {
    return `${DRAFT_KEY_PREFIX}-${token}`
  }

  let localId = localStorage.getItem(`${DRAFT_KEY_PREFIX}-local-id`)
  if (!localId) {
    localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(`${DRAFT_KEY_PREFIX}-local-id`, localId)
  }

  return `${DRAFT_KEY_PREFIX}-${localId}`
}

export function saveDraft(data: Omit<DraftData, "timestamp" | "expiresAt" | "version">, token?: string): void {
  try {
    const now = Date.now()
    const expiresAt = now + DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    const draftData: DraftData = {
      ...data,
      timestamp: now,
      expiresAt,
      version: FORM_VERSION,
    }

    const key = getDraftKey(token)
    localStorage.setItem(key, JSON.stringify(draftData))
  } catch (error) {
    console.error("[v0] Error saving draft:", error)
  }
}

export function loadDraft(token?: string): DraftData | null {
  try {
    const key = getDraftKey(token)
    const stored = localStorage.getItem(key)

    if (!stored) return null

    const draft: DraftData = JSON.parse(stored)

    // Verificar si el borrador ha expirado
    if (Date.now() > draft.expiresAt) {
      deleteDraft(token)
      return null
    }

    return draft
  } catch (error) {
    console.error("[v0] Error loading draft:", error)
    return null
  }
}

export function deleteDraft(token?: string): void {
  try {
    const key = getDraftKey(token)
    localStorage.removeItem(key)
  } catch (error) {
    console.error("[v0] Error deleting draft:", error)
  }
}

export function isDraftCompatible(draft: DraftData): boolean {
  return draft.version === FORM_VERSION
}

export function calculateValidStep(draft: DraftData, maxSteps: number): number {
  const { currentStep, empresa, admins, trabajadores, turnos, planificaciones, asignaciones } = draft

  // Si el paso guardado está fuera de rango, calcular basado en datos
  if (currentStep < 0 || currentStep >= maxSteps) {
    return calculateLastCompletedStep(draft)
  }

  // Si el paso es válido, usarlo
  return currentStep
}

function calculateLastCompletedStep(draft: DraftData): number {
  const { empresa, admins, trabajadores, turnos, planificaciones, asignaciones, configureNow } = draft

  // Paso 9: Resumen (todos los datos completos)
  if (asignaciones && asignaciones.length > 0) return 9

  // Paso 8: Asignaciones (tiene planificaciones)
  if (planificaciones && planificaciones.length > 0) return 8

  // Paso 7: Planificaciones (tiene turnos)
  if (turnos && turnos.length > 0) return 7

  // Paso 6: Turnos (decidió configurar)
  if (configureNow !== undefined) return 6

  // Paso 5: Configuración (tiene trabajadores)
  if (trabajadores && trabajadores.length > 0) return 5

  // Paso 4: Trabajadores (tiene admins)
  if (admins && admins.length > 0) return 4

  // Paso 3: Admin (tiene datos de empresa completos)
  if (empresa && empresa.razon_social && empresa.rut && empresa.direccion && empresa.rubro) return 3

  // Paso 2: Empresa (tiene algún dato de empresa)
  if (empresa && (empresa.razon_social || empresa.rut)) return 2

  // Por defecto, ir al paso 1 (Antes de comenzar) si hay cualquier dato
  return 1
}

export function getDraftAge(draft: DraftData): string {
  const now = Date.now()
  const diff = now - draft.timestamp

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0) return `hace ${days} día${days > 1 ? "s" : ""}`
  if (hours > 0) return `hace ${hours} hora${hours > 1 ? "s" : ""}`
  if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? "s" : ""}`
  return "hace un momento"
}
