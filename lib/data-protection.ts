/**
 * SISTEMA DE PROTECCIÓN DE DATOS
 * ==============================
 *
 * Este módulo implementa la protección de datos del onboarding:
 *
 * 1. Tracking de datos prellenados vs editados por el usuario
 * 2. Estado de bloqueo/edición para pasos completados
 * 3. Historial de cambios para trazabilidad
 *
 * REGLAS DE PRODUCTO:
 * - Datos prellenados se muestran bloqueados por defecto
 * - El usuario puede desbloquear para editar (acción consciente)
 * - Se rastrea qué campos fueron modificados y cuándo
 * - El envío final distingue datos originales vs editados
 */

// Registro de un campo que fue prellenado o editado
export interface FieldChange {
  fieldName: string
  originalValue: unknown
  currentValue: unknown
  source: "prefilled" | "user_input"
  wasEdited: boolean
  editedAt?: string
}

// Estado de protección para un paso completo
export interface StepProtectionState {
  stepIndex: number
  stepName: string
  isCompleted: boolean
  isLocked: boolean // true = mostrar en modo resumen, false = mostrar formulario
  completedAt?: string
  unlockedForEditAt?: string
}

// Estado completo de protección de datos
export interface DataProtectionState {
  // Campos prellenados desde el sistema maestro (CRM)
  prefilledFields: Record<string, unknown>

  // Registro de cambios por campo
  fieldChanges: Record<string, FieldChange>

  // Estado de cada paso
  stepsProtection: StepProtectionState[]

  // Timestamp de inicialización
  initializedAt: string

  // Última actualización
  lastModifiedAt: string
}

// Nombres de los pasos para referencia
export const STEP_NAMES = [
  "Empresa",
  "Administrador",
  "Trabajadores",
  "Configuración",
  "Turnos",
  "Planificaciones",
  "Asignación",
  "Resumen",
] as const

// Crear estado de protección inicial
export function createInitialProtectionState(prefilledData?: Record<string, unknown>): DataProtectionState {
  const now = new Date().toISOString()

  // Crear estado de protección para cada paso
  const stepsProtection: StepProtectionState[] = STEP_NAMES.map((name, index) => ({
    stepIndex: index,
    stepName: name,
    isCompleted: false,
    isLocked: false,
  }))

  // Registrar campos prellenados
  const prefilledFields: Record<string, unknown> = {}
  const fieldChanges: Record<string, FieldChange> = {}

  if (prefilledData) {
    Object.entries(prefilledData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        prefilledFields[key] = value
        fieldChanges[key] = {
          fieldName: key,
          originalValue: value,
          currentValue: value,
          source: "prefilled",
          wasEdited: false,
        }
      }
    })
  }

  return {
    prefilledFields,
    fieldChanges,
    stepsProtection,
    initializedAt: now,
    lastModifiedAt: now,
  }
}

// Verificar si un campo fue prellenado
export function isFieldPrefilled(state: DataProtectionState, fieldName: string): boolean {
  return fieldName in state.prefilledFields
}

// Verificar si un campo fue editado por el usuario
export function isFieldEdited(state: DataProtectionState, fieldName: string): boolean {
  const change = state.fieldChanges[fieldName]
  return change?.wasEdited === true
}

// Registrar un cambio de campo
export function registerFieldChange(
  state: DataProtectionState,
  fieldName: string,
  newValue: unknown,
  source: "prefilled" | "user_input" = "user_input",
): DataProtectionState {
  const now = new Date().toISOString()
  const existingChange = state.fieldChanges[fieldName]

  const originalValue = existingChange?.originalValue ?? state.prefilledFields[fieldName] ?? null
  const wasPrefilled = fieldName in state.prefilledFields
  const wasEdited = wasPrefilled ? JSON.stringify(newValue) !== JSON.stringify(state.prefilledFields[fieldName]) : true

  return {
    ...state,
    fieldChanges: {
      ...state.fieldChanges,
      [fieldName]: {
        fieldName,
        originalValue,
        currentValue: newValue,
        source: wasPrefilled ? "prefilled" : source,
        wasEdited,
        editedAt: wasEdited ? now : existingChange?.editedAt,
      },
    },
    lastModifiedAt: now,
  }
}

// Marcar un paso como completado
export function markStepAsCompleted(state: DataProtectionState, stepIndex: number): DataProtectionState {
  const now = new Date().toISOString()

  return {
    ...state,
    stepsProtection: state.stepsProtection.map((step) =>
      step.stepIndex === stepIndex ? { ...step, isCompleted: true, isLocked: true, completedAt: now } : step,
    ),
    lastModifiedAt: now,
  }
}

// Desbloquear un paso para edición
export function unlockStepForEdit(state: DataProtectionState, stepIndex: number): DataProtectionState {
  const now = new Date().toISOString()

  return {
    ...state,
    stepsProtection: state.stepsProtection.map((step) =>
      step.stepIndex === stepIndex ? { ...step, isLocked: false, unlockedForEditAt: now } : step,
    ),
    lastModifiedAt: now,
  }
}

// Bloquear un paso (después de editar y confirmar)
export function lockStep(state: DataProtectionState, stepIndex: number): DataProtectionState {
  const now = new Date().toISOString()

  return {
    ...state,
    stepsProtection: state.stepsProtection.map((step) =>
      step.stepIndex === stepIndex ? { ...step, isLocked: true } : step,
    ),
    lastModifiedAt: now,
  }
}

// Verificar si un paso está bloqueado
export function isStepLocked(state: DataProtectionState, stepIndex: number): boolean {
  return state.stepsProtection[stepIndex]?.isLocked === true
}

// Verificar si un paso está completado
export function isStepCompleted(state: DataProtectionState, stepIndex: number): boolean {
  return state.stepsProtection[stepIndex]?.isCompleted === true
}

// Obtener resumen de cambios para el envío final
export interface ChangesSummary {
  totalPrefilledFields: number
  totalEditedFields: number
  editedFieldNames: string[]
  changesDetail: Array<{
    field: string
    originalValue: unknown
    newValue: unknown
    editedAt?: string
  }>
}

export function getChangesSummary(state: DataProtectionState): ChangesSummary {
  const editedFields = Object.values(state.fieldChanges).filter((f) => f.wasEdited)

  return {
    totalPrefilledFields: Object.keys(state.prefilledFields).length,
    totalEditedFields: editedFields.length,
    editedFieldNames: editedFields.map((f) => f.fieldName),
    changesDetail: editedFields.map((f) => ({
      field: f.fieldName,
      originalValue: f.originalValue,
      newValue: f.currentValue,
      editedAt: f.editedAt,
    })),
  }
}

// Preparar datos para envío final con distinción de origen
export interface FinalSubmissionData {
  // Datos completos del formulario
  formData: Record<string, unknown>

  // Metadata de protección
  protection: {
    // Campos que venían prellenados y NO fueron modificados
    unchangedPrefilledFields: string[]

    // Campos que venían prellenados y SÍ fueron modificados
    editedPrefilledFields: Array<{
      field: string
      originalValue: unknown
      newValue: unknown
    }>

    // Campos ingresados completamente por el usuario
    userInputFields: string[]
  }
}

export function prepareFinalSubmission(
  formData: Record<string, unknown>,
  state: DataProtectionState,
): FinalSubmissionData {
  const unchangedPrefilledFields: string[] = []
  const editedPrefilledFields: Array<{ field: string; originalValue: unknown; newValue: unknown }> = []
  const userInputFields: string[] = []

  Object.entries(state.fieldChanges).forEach(([fieldName, change]) => {
    if (change.source === "prefilled") {
      if (change.wasEdited) {
        editedPrefilledFields.push({
          field: fieldName,
          originalValue: change.originalValue,
          newValue: change.currentValue,
        })
      } else {
        unchangedPrefilledFields.push(fieldName)
      }
    } else {
      userInputFields.push(fieldName)
    }
  })

  return {
    formData,
    protection: {
      unchangedPrefilledFields,
      editedPrefilledFields,
      userInputFields,
    },
  }
}
