/**
 * ARQUITECTURA DE PERSISTENCIA Y SINCRONIZACIÓN
 * =============================================
 *
 * Este módulo implementa una arquitectura clara que separa:
 *
 * 1. PERSISTENCIA (experiencia de usuario)
 *    - localStorage: para no perder datos si recarga o cierra
 *    - Identificador de sesión (onboardingId): derivado del token o generado
 *
 * 2. SINCRONIZACIÓN CON ZOHO FLOW (seguimiento comercial)
 *    - Eventos ligeros de progreso (solo metadata)
 *    - Envío completo solo al finalizar
 *
 * POLÍTICA DE PERSISTENCIA:
 * - Se guarda automáticamente en localStorage cada vez que cambia el estado
 * - La clave de localStorage incluye el onboardingId para permitir múltiples onboardings
 * - Los datos se eliminan de localStorage solo después de completar exitosamente
 *
 * POLÍTICA DE SINCRONIZACIÓN CON ZOHO:
 * - Evento "progress": se envía cuando el usuario avanza de paso (solo metadata)
 * - Evento "complete": se envía solo al hacer clic en "Completar y enviar" (datos completos)
 * - Los eventos de progreso NO bloquean la UI ni requieren éxito para continuar
 *
 * POLÍTICA DE REANUDACIÓN:
 * - Al cargar, se busca primero en localStorage por onboardingId
 * - Si no hay datos locales pero hay token, se desencripta el token
 * - El paso inicial se calcula como el primer paso incompleto
 */

// Tipos para la persistencia
export interface OnboardingData {
  onboardingId: string
  empresa: EmpresaData
  admins: AdminData[]
  trabajadores: TrabajadorData[]
  turnos: TurnoData[]
  planificaciones: PlanificacionData[]
  asignaciones: AsignacionData[]
  configureNow: boolean
  lastStep: number
  lastUpdated: string
  completedSteps: number[] // Pasos que el usuario marcó como completos
}

export interface EmpresaData {
  razonSocial: string
  nombreFantasia: string
  rut: string
  giro: string
  direccion: string
  comuna: string
  emailFacturacion: string
  telefonoContacto: string
  sistema: string[]
  rubro: string
  grupos: GrupoData[]
}

export interface GrupoData {
  id: number
  nombre: string
  descripcion: string
}

export interface AdminData {
  id: number
  nombre: string
  rut: string
  email: string
  telefono: string
  grupo: string
}

export interface TrabajadorData {
  id: string
  nombre: string
  rut: string
  correo: string
  grupoId: number | null
  telefono1: string
  telefono2: string
  telefono3: string
  tipo: string
}

export interface TurnoData {
  id: number
  nombre: string
  horaInicio: string
  horaFin: string
  colacionMinutos: number
  tooltip: string
}

export interface PlanificacionData {
  id: number
  nombre: string
  turnosPorDia: Record<string, number | null>
}

export interface AsignacionData {
  trabajadorId: string
  planificacionId: number | null
  fechaInicio: string
  fechaFin: string
}

// Genera un ID único para el onboarding basado en el token o aleatorio
export function generateOnboardingId(token?: string): string {
  if (token) {
    // Usar primeros 16 caracteres del token como ID (suficiente para ser único)
    return `onb_${token.substring(0, 16)}`
  }
  // Generar ID aleatorio si no hay token
  return `onb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Clave de localStorage para un onboarding específico
function getStorageKey(onboardingId: string): string {
  return `onboarding_data_${onboardingId}`
}

// Guardar datos en localStorage
export function saveToLocalStorage(data: OnboardingData): void {
  try {
    const key = getStorageKey(data.onboardingId)
    const dataToSave = {
      ...data,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(dataToSave))
  } catch (error) {
    console.error("[Persistencia] Error guardando en localStorage:", error)
  }
}

// Cargar datos desde localStorage
export function loadFromLocalStorage(onboardingId: string): OnboardingData | null {
  try {
    const key = getStorageKey(onboardingId)
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored) as OnboardingData
    }
  } catch (error) {
    console.error("[Persistencia] Error cargando desde localStorage:", error)
  }
  return null
}

// Eliminar datos de localStorage (después de completar)
export function clearLocalStorage(onboardingId: string): void {
  try {
    const key = getStorageKey(onboardingId)
    localStorage.removeItem(key)
  } catch (error) {
    console.error("[Persistencia] Error eliminando de localStorage:", error)
  }
}

// Calcular el primer paso incompleto basándose en los datos
export function calculateFirstIncompleteStep(data: Partial<OnboardingData>, configureNow: boolean): number {
  // Paso 0: Empresa - requiere al menos razón social y RUT
  if (!data.empresa?.razonSocial || !data.empresa?.rut) {
    return 0
  }

  // Paso 1: Admin - requiere al menos un administrador con nombre, RUT y email
  if (
    !data.admins ||
    data.admins.length === 0 ||
    !data.admins[0]?.nombre ||
    !data.admins[0]?.rut ||
    !data.admins[0]?.email
  ) {
    return 1
  }

  // Paso 2: Trabajadores - requiere al menos un trabajador
  const trabajadoresNoAdmin = data.trabajadores?.filter((t) => t.tipo !== "administrador") || []
  if (trabajadoresNoAdmin.length === 0) {
    return 2
  }

  // Paso 3: Configuración - decisión de configurar ahora o después
  // Este paso siempre se muestra para que el usuario decida
  if (data.completedSteps && !data.completedSteps.includes(3)) {
    return 3
  }

  // Si eligió configurar después, ir directo al resumen
  if (!configureNow) {
    return 7 // Resumen
  }

  // Paso 4: Turnos - requiere al menos un turno personalizado (además de los por defecto)
  // Los turnos por defecto son suficientes, así que verificamos si ya pasó por este paso
  if (data.completedSteps && !data.completedSteps.includes(4)) {
    return 4
  }

  // Paso 5: Planificaciones - requiere al menos una planificación
  if (!data.planificaciones || data.planificaciones.length === 0) {
    return 5
  }

  // Paso 6: Asignación - requiere asignaciones para trabajadores
  if (data.completedSteps && !data.completedSteps.includes(6)) {
    return 6
  }

  // Paso 7: Resumen
  return 7
}

// Tipos de eventos para Zoho Flow
export type ZohoEventType = "started" | "progress" | "stalled" | "complete"

export interface ZohoTrackingEvent {
  eventType: ZohoEventType
  onboardingId: string
  timestamp: string
  // Metadata ligera para seguimiento (sin datos sensibles)
  metadata: {
    empresaRut?: string
    empresaNombre?: string
    currentStep: number
    currentStepName: string
    totalSteps: number
    progressPercent: number
    configureNow?: boolean
    // Solo en evento complete
    totalTrabajadores?: number
    totalTurnos?: number
    totalPlanificaciones?: number
  }
}

// Crear evento de tracking para Zoho (solo metadata)
export function createTrackingEvent(
  eventType: ZohoEventType,
  onboardingId: string,
  currentStep: number,
  stepName: string,
  empresa?: Partial<EmpresaData>,
  extras?: {
    configureNow?: boolean
    totalTrabajadores?: number
    totalTurnos?: number
    totalPlanificaciones?: number
  },
): ZohoTrackingEvent {
  const totalSteps = 8
  const progressPercent = Math.round((currentStep / (totalSteps - 1)) * 100)

  return {
    eventType,
    onboardingId,
    timestamp: new Date().toISOString(),
    metadata: {
      empresaRut: empresa?.rut,
      empresaNombre: empresa?.razonSocial,
      currentStep,
      currentStepName: stepName,
      totalSteps,
      progressPercent,
      ...extras,
    },
  }
}
