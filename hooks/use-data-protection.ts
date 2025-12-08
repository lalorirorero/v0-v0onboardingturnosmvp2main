"use client"

import { useState, useEffect, useCallback } from "react"
import {
  type DataProtectionState,
  type ChangesSummary,
  createInitialProtectionState,
  registerFieldChange,
  markStepAsCompleted,
  unlockStepForEdit,
  lockStep,
  isStepLocked,
  isStepCompleted,
  isFieldPrefilled,
  isFieldEdited,
  getChangesSummary,
  prepareFinalSubmission,
} from "@/lib/data-protection"

interface UseDataProtectionProps {
  prefilledData?: Record<string, unknown>
  onboardingId?: string
}

interface UseDataProtectionReturn {
  // Estado
  protectionState: DataProtectionState

  // Verificaciones de campo
  isFieldPrefilled: (fieldName: string) => boolean
  isFieldEdited: (fieldName: string) => boolean

  // Verificaciones de paso
  isStepLocked: (stepIndex: number) => boolean
  isStepCompleted: (stepIndex: number) => boolean

  // Acciones de campo
  trackFieldChange: (fieldName: string, value: unknown) => void

  // Acciones de paso
  completeStep: (stepIndex: number) => void
  unlockStep: (stepIndex: number) => void
  relockStep: (stepIndex: number) => void

  // Para envío final
  getChangesSummary: () => ChangesSummary
  prepareFinalSubmission: (formData: Record<string, unknown>) => ReturnType<typeof prepareFinalSubmission>
}

const STORAGE_KEY_PREFIX = "data_protection_"

export function useDataProtection({ prefilledData, onboardingId }: UseDataProtectionProps): UseDataProtectionReturn {
  const [protectionState, setProtectionState] = useState<DataProtectionState>(() =>
    createInitialProtectionState(prefilledData),
  )

  // Cargar estado guardado si existe
  useEffect(() => {
    if (!onboardingId) return

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${onboardingId}`)
      if (stored) {
        setProtectionState(JSON.parse(stored))
      } else if (prefilledData) {
        // Inicializar con datos prellenados
        setProtectionState(createInitialProtectionState(prefilledData))
      }
    } catch (error) {
      console.error("[DataProtection] Error loading state:", error)
    }
  }, [onboardingId, prefilledData])

  // Guardar estado cuando cambia
  useEffect(() => {
    if (!onboardingId) return

    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${onboardingId}`, JSON.stringify(protectionState))
    } catch (error) {
      console.error("[DataProtection] Error saving state:", error)
    }
  }, [onboardingId, protectionState])

  // Verificaciones de campo
  const checkFieldPrefilled = useCallback(
    (fieldName: string) => isFieldPrefilled(protectionState, fieldName),
    [protectionState],
  )

  const checkFieldEdited = useCallback(
    (fieldName: string) => isFieldEdited(protectionState, fieldName),
    [protectionState],
  )

  // Verificaciones de paso
  const checkStepLocked = useCallback(
    (stepIndex: number) => isStepLocked(protectionState, stepIndex),
    [protectionState],
  )

  const checkStepCompleted = useCallback(
    (stepIndex: number) => isStepCompleted(protectionState, stepIndex),
    [protectionState],
  )

  // Acciones de campo
  const trackFieldChange = useCallback((fieldName: string, value: unknown) => {
    setProtectionState((prev) => registerFieldChange(prev, fieldName, value))
  }, [])

  // Acciones de paso
  const completeStep = useCallback((stepIndex: number) => {
    setProtectionState((prev) => markStepAsCompleted(prev, stepIndex))
  }, [])

  const unlockStep = useCallback((stepIndex: number) => {
    setProtectionState((prev) => unlockStepForEdit(prev, stepIndex))
  }, [])

  const relockStep = useCallback((stepIndex: number) => {
    setProtectionState((prev) => lockStep(prev, stepIndex))
  }, [])

  // Para envío final
  const getSummary = useCallback(() => getChangesSummary(protectionState), [protectionState])

  const prepareSubmission = useCallback(
    (formData: Record<string, unknown>) => prepareFinalSubmission(formData, protectionState),
    [protectionState],
  )

  return {
    protectionState,
    isFieldPrefilled: checkFieldPrefilled,
    isFieldEdited: checkFieldEdited,
    isStepLocked: checkStepLocked,
    isStepCompleted: checkStepCompleted,
    trackFieldChange,
    completeStep,
    unlockStep,
    relockStep,
    getChangesSummary: getSummary,
    prepareFinalSubmission: prepareSubmission,
  }
}
