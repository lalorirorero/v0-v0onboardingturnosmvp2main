const DRAFT_KEY_PREFIX = "onboarding-draft"
const DRAFT_EXPIRY_DAYS = 14

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

export function saveDraft(data: Omit<DraftData, "timestamp" | "expiresAt">, token?: string): void {
  try {
    const now = Date.now()
    const expiresAt = now + DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    const draftData: DraftData = {
      ...data,
      timestamp: now,
      expiresAt,
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
