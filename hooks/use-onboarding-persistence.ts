"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  type OnboardingData,
  type EmpresaData,
  type AdminData,
  type TrabajadorData,
  type TurnoData,
  type PlanificacionData,
  type AsignacionData,
  generateOnboardingId,
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  calculateFirstIncompleteStep,
  createTrackingEvent,
} from "@/lib/onboarding-persistence"
import { sendTrackingEvent } from "@/lib/zoho-tracking"

interface UseOnboardingPersistenceProps {
  token?: string | null
  tokenData?: Partial<EmpresaData> | null
}

interface UseOnboardingPersistenceReturn {
  // Estado
  isLoading: boolean
  onboardingId: string

  // Datos del formulario
  empresa: EmpresaData
  admins: AdminData[]
  trabajadores: TrabajadorData[]
  turnos: TurnoData[]
  planificaciones: PlanificacionData[]
  asignaciones: AsignacionData[]
  configureNow: boolean
  currentStep: number
  completedSteps: number[]

  // Setters
  setEmpresa: (empresa: EmpresaData | ((prev: EmpresaData) => EmpresaData)) => void
  setAdmins: (admins: AdminData[] | ((prev: AdminData[]) => AdminData[])) => void
  setTrabajadores: (trabajadores: TrabajadorData[] | ((prev: TrabajadorData[]) => TrabajadorData[])) => void
  setTurnos: (turnos: TurnoData[] | ((prev: TurnoData[]) => TurnoData[])) => void
  setPlanificaciones: (
    planificaciones: PlanificacionData[] | ((prev: PlanificacionData[]) => PlanificacionData[]),
  ) => void
  setAsignaciones: (asignaciones: AsignacionData[] | ((prev: AsignacionData[]) => AsignacionData[])) => void
  setConfigureNow: (value: boolean) => void
  setCurrentStep: (step: number) => void

  // Acciones
  markStepComplete: (step: number) => void
  goToNextStep: () => void
  goToPrevStep: () => void
  clearAllData: () => void

  // Tracking
  trackProgress: (stepName: string) => void
}

const DEFAULT_EMPRESA: EmpresaData = {
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
}

const DEFAULT_TURNOS: TurnoData[] = [
  { id: 1, nombre: "Descanso", horaInicio: "", horaFin: "", colacionMinutos: 0, tooltip: "Fin de Semana o Feriado" },
  { id: 2, nombre: "Libre", horaInicio: "", horaFin: "", colacionMinutos: 0, tooltip: "No marca o Artículo 22" },
  { id: 3, nombre: "Presencial", horaInicio: "", horaFin: "", colacionMinutos: 0, tooltip: "Sin planificación" },
]

export function useOnboardingPersistence({
  token,
  tokenData,
}: UseOnboardingPersistenceProps): UseOnboardingPersistenceReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [onboardingId, setOnboardingId] = useState("")
  const [hasTrackedStart, setHasTrackedStart] = useState(false)

  // Estado del formulario
  const [empresa, setEmpresaState] = useState<EmpresaData>(DEFAULT_EMPRESA)
  const [admins, setAdminsState] = useState<AdminData[]>([])
  const [trabajadores, setTrabajadoresState] = useState<TrabajadorData[]>([])
  const [turnos, setTurnosState] = useState<TurnoData[]>(DEFAULT_TURNOS)
  const [planificaciones, setPlanificacionesState] = useState<PlanificacionData[]>([])
  const [asignaciones, setAsignacionesState] = useState<AsignacionData[]>([])
  const [configureNow, setConfigureNowState] = useState(true)
  const [currentStep, setCurrentStepState] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  // Ref para evitar guardados innecesarios durante la carga inicial
  const isInitializing = useRef(true)

  // Inicialización: cargar datos existentes o crear nuevo onboarding
  useEffect(() => {
    const initializeOnboarding = async () => {
      setIsLoading(true)

      // Generar ID basado en token (o aleatorio si no hay token)
      const id = generateOnboardingId(token || undefined)
      setOnboardingId(id)

      // Intentar cargar datos existentes de localStorage
      const savedData = loadFromLocalStorage(id)

      if (savedData) {
        // Hay datos guardados - restaurar estado
        setEmpresaState(savedData.empresa)
        setAdminsState(savedData.admins)
        setTrabajadoresState(savedData.trabajadores)
        setTurnosState(savedData.turnos.length > 0 ? savedData.turnos : DEFAULT_TURNOS)
        setPlanificacionesState(savedData.planificaciones)
        setAsignacionesState(savedData.asignaciones)
        setConfigureNowState(savedData.configureNow)
        setCompletedSteps(savedData.completedSteps || [])

        // Calcular paso inicial basándose en datos existentes
        const firstIncomplete = calculateFirstIncompleteStep(savedData, savedData.configureNow)
        setCurrentStepState(firstIncomplete)

        setHasTrackedStart(true) // Ya se inició antes, no enviar evento
      } else if (tokenData) {
        // No hay datos guardados pero hay datos del token - prellenar
        setEmpresaState((prev) => ({
          ...prev,
          ...tokenData,
          grupos: Array.isArray(tokenData.grupos) ? tokenData.grupos : [],
        }))
        setCurrentStepState(0) // Empezar desde el principio
      }

      isInitializing.current = false
      setIsLoading(false)
    }

    initializeOnboarding()
  }, [token, tokenData])

  // Guardar en localStorage cada vez que cambia el estado (después de inicialización)
  useEffect(() => {
    if (isInitializing.current || !onboardingId) return

    const dataToSave: OnboardingData = {
      onboardingId,
      empresa,
      admins,
      trabajadores,
      turnos,
      planificaciones,
      asignaciones,
      configureNow,
      lastStep: currentStep,
      lastUpdated: new Date().toISOString(),
      completedSteps,
    }

    saveToLocalStorage(dataToSave)
  }, [
    onboardingId,
    empresa,
    admins,
    trabajadores,
    turnos,
    planificaciones,
    asignaciones,
    configureNow,
    currentStep,
    completedSteps,
  ])

  // Enviar evento "started" la primera vez (si no se ha enviado antes)
  useEffect(() => {
    if (!hasTrackedStart && !isLoading && onboardingId && empresa.rut) {
      const event = createTrackingEvent("started", onboardingId, currentStep, "Inicio", empresa)
      sendTrackingEvent(event)
      setHasTrackedStart(true)
    }
  }, [hasTrackedStart, isLoading, onboardingId, empresa, currentStep])

  // Wrappers para los setters que manejan funciones o valores directos
  const setEmpresa = useCallback((value: EmpresaData | ((prev: EmpresaData) => EmpresaData)) => {
    setEmpresaState((prev) => (typeof value === "function" ? value(prev) : value))
  }, [])

  const setAdmins = useCallback((value: AdminData[] | ((prev: AdminData[]) => AdminData[])) => {
    setAdminsState((prev) => (typeof value === "function" ? value(prev) : value))
  }, [])

  const setTrabajadores = useCallback((value: TrabajadorData[] | ((prev: TrabajadorData[]) => TrabajadorData[])) => {
    setTrabajadoresState((prev) => (typeof value === "function" ? value(prev) : value))
  }, [])

  const setTurnos = useCallback((value: TurnoData[] | ((prev: TurnoData[]) => TurnoData[])) => {
    setTurnosState((prev) => (typeof value === "function" ? value(prev) : value))
  }, [])

  const setPlanificaciones = useCallback(
    (value: PlanificacionData[] | ((prev: PlanificacionData[]) => PlanificacionData[])) => {
      setPlanificacionesState((prev) => (typeof value === "function" ? value(prev) : value))
    },
    [],
  )

  const setAsignaciones = useCallback((value: AsignacionData[] | ((prev: AsignacionData[]) => AsignacionData[])) => {
    setAsignacionesState((prev) => (typeof value === "function" ? value(prev) : value))
  }, [])

  const setConfigureNow = useCallback((value: boolean) => {
    setConfigureNowState(value)
  }, [])

  const setCurrentStep = useCallback((step: number) => {
    setCurrentStepState(step)
  }, [])

  // Marcar un paso como completo
  const markStepComplete = useCallback((step: number) => {
    setCompletedSteps((prev) => {
      if (prev.includes(step)) return prev
      return [...prev, step]
    })
  }, [])

  // Navegar al siguiente paso
  const goToNextStep = useCallback(() => {
    setCurrentStepState((prev) => prev + 1)
  }, [])

  // Navegar al paso anterior
  const goToPrevStep = useCallback(() => {
    setCurrentStepState((prev) => Math.max(0, prev - 1))
  }, [])

  // Limpiar todos los datos (después de completar exitosamente)
  const clearAllData = useCallback(() => {
    if (onboardingId) {
      clearLocalStorage(onboardingId)
    }
  }, [onboardingId])

  // Enviar evento de progreso a Zoho
  const trackProgress = useCallback(
    (stepName: string) => {
      if (!onboardingId) return

      const event = createTrackingEvent("progress", onboardingId, currentStep, stepName, empresa, { configureNow })
      sendTrackingEvent(event)
    },
    [onboardingId, currentStep, empresa, configureNow],
  )

  return {
    isLoading,
    onboardingId,
    empresa,
    admins,
    trabajadores,
    turnos,
    planificaciones,
    asignaciones,
    configureNow,
    currentStep,
    completedSteps,
    setEmpresa,
    setAdmins,
    setTrabajadores,
    setTurnos,
    setPlanificaciones,
    setAsignaciones,
    setConfigureNow,
    setCurrentStep,
    markStepComplete,
    goToNextStep,
    goToPrevStep,
    clearAllData,
    trackProgress,
  }
}
