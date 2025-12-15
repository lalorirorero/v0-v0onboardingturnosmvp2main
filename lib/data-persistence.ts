/**
 * Sistema de persistencia robusto con jerarquía de fuentes de datos
 *
 * Jerarquía (menor a mayor prioridad):
 * 1. Valores por defecto (empty state)
 * 2. Prefill desde token (datos del sistema)
 * 3. Ediciones del usuario (draft)
 *
 * Reglas invariantes:
 * - Nunca sobrescribir con valores vacíos si existe prefill
 * - Ediciones del usuario siempre tienen prioridad sobre prefill
 * - Merge es idempotente (aplicar múltiples veces da mismo resultado)
 */

import type { FormData } from "./types"

export interface DataSource {
  prefill: Partial<FormData> | null // Datos desde token
  userEdits: Partial<FormData> | null // Ediciones del usuario
  metadata: {
    prefilledFields: string[] // Qué campos vienen del token
    editedFields: string[] // Qué campos editó el usuario
    lastSaved: string // ISO timestamp
    schemaVersion: string
  }
}

export interface DraftState extends DataSource {
  currentStep: number
  completedSteps: number[]
}

const STORAGE_KEY = "onboarding_draft_v1"
const DEBOUNCE_MS = 1000

/**
 * Merge inteligente que respeta jerarquía de fuentes
 * Regla: solo sobrescribir si el valor nuevo es válido (no vacío/null/undefined)
 */
export function mergeSources<T extends Record<string, any>>(
  base: Partial<T>,
  override: Partial<T>,
  prefilledFields: string[] = [],
): T {
  const result = { ...base } as T

  for (const key in override) {
    const overrideValue = override[key]
    const baseValue = base[key]

    // Si el override es válido (no vacío), usar override
    if (isValidValue(overrideValue)) {
      result[key] = overrideValue
    }
    // Si el override es vacío pero hay prefill, mantener prefill
    else if (prefilledFields.includes(key) && isValidValue(baseValue)) {
      result[key] = baseValue
    }
    // Si ambos son vacíos, usar override (puede ser intencional)
    else {
      result[key] = overrideValue
    }
  }

  return result
}

/**
 * Verifica si un valor es válido (no vacío/null/undefined)
 */
function isValidValue(value: any): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string" && value.trim() === "") return false
  if (Array.isArray(value) && value.length === 0) return false
  if (typeof value === "object" && Object.keys(value).length === 0) return false
  return true
}

/**
 * Guarda borrador en localStorage
 */
export function saveDraft(draft: DraftState): void {
  try {
    const serialized = JSON.stringify(draft)
    localStorage.setItem(STORAGE_KEY, serialized)
    console.log("[v0] Draft saved:", draft.metadata.lastSaved)
  } catch (error) {
    console.error("[v0] Error saving draft:", error)
  }
}

/**
 * Carga borrador desde localStorage
 */
export function loadDraft(): DraftState | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY)
    if (!serialized) return null

    const draft = JSON.parse(serialized) as DraftState
    console.log("[v0] Draft loaded:", draft.metadata.lastSaved)
    return draft
  } catch (error) {
    console.error("[v0] Error loading draft:", error)
    return null
  }
}

/**
 * Elimina borrador de localStorage
 */
export function clearDraft(): void {
  localStorage.removeItem(STORAGE_KEY)
  console.log("[v0] Draft cleared")
}

/**
 * Debouncer para guardado automático
 */
let saveTimeout: NodeJS.Timeout | null = null

export function debouncedSave(draft: DraftState): void {
  if (saveTimeout) clearTimeout(saveTimeout)

  saveTimeout = setTimeout(() => {
    saveDraft(draft)
  }, DEBOUNCE_MS)
}

/**
 * Resetea a estado inicial respetando prefill
 */
export function resetToInitialState(prefill: Partial<FormData> | null, prefilledFields: string[]): FormData {
  // Retorna estado vacío pero con prefill restaurado
  const emptyState = getEmptyFormData()

  if (!prefill) return emptyState

  return mergeSources(emptyState, prefill, prefilledFields)
}

/**
 * Estado vacío base
 */
function getEmptyFormData(): FormData {
  return {
    empresa: {
      razonSocial: "",
      nombreFantasia: "",
      rut: "",
      giro: "",
      direccion: "",
      comuna: "",
      emailFacturacion: "",
      telefonoContacto: "",
      sistema: [],
      rubro: "",
      grupos: [],
    },
    admins: [],
    trabajadores: [],
    turnos: [],
    planificaciones: [],
    asignaciones: [],
    configureNow: false,
  }
}

/**
 * Detecta campos editados comparando con prefill
 */
export function detectEditedFields(current: Partial<FormData>, prefill: Partial<FormData> | null): string[] {
  if (!prefill) return []

  const edited: string[] = []

  // Comparar campos nivel empresa
  if (current.empresa && prefill.empresa) {
    for (const key in current.empresa) {
      if (JSON.stringify(current.empresa[key]) !== JSON.stringify(prefill.empresa[key])) {
        edited.push(`empresa.${key}`)
      }
    }
  }

  // Comparar arrays (admins, trabajadores, etc)
  const arrayFields: (keyof FormData)[] = ["admins", "trabajadores", "turnos", "planificaciones", "asignaciones"]

  for (const field of arrayFields) {
    const currentArray = current[field] as any[]
    const prefillArray = prefill[field] as any[]

    if (JSON.stringify(currentArray) !== JSON.stringify(prefillArray)) {
      edited.push(field)
    }
  }

  return edited
}

/**
 * Escucha cambios en otras pestañas
 */
export function listenToStorageChanges(callback: (draft: DraftState | null) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      const draft = e.newValue ? (JSON.parse(e.newValue) as DraftState) : null
      callback(draft)
    }
  }

  window.addEventListener("storage", handler)

  return () => window.removeEventListener("storage", handler)
}
