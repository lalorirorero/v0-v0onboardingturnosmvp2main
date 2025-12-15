import { describe, it, expect, beforeEach, vi } from "vitest"
import { PersistenceManager } from "@/lib/persistence-manager"
import type { OnboardingFormData } from "@/lib/types"

describe("PersistenceManager", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe("saveDraft y loadDraft", () => {
    it("debe guardar y cargar un borrador correctamente", () => {
      const data: OnboardingFormData = {
        empresa: {
          razonSocial: "Test SA",
          rut: "12345678-9",
          // ... otros campos
        },
        admins: [],
        trabajadores: [],
        turnos: [],
        planificaciones: [],
        asignaciones: [],
        configureNow: true,
      }

      const metadata = {
        timestamp: Date.now(),
        version: "2.0",
        currentStep: 3,
        completedSteps: [0, 1, 2],
        hasToken: false,
        idZoho: null,
      }

      PersistenceManager.saveDraft(data, metadata)
      const loaded = PersistenceManager.loadDraft()

      expect(loaded).not.toBeNull()
      expect(loaded?.data.empresa.razonSocial).toBe("Test SA")
      expect(loaded?.metadata.currentStep).toBe(3)
    })

    it("debe retornar null si no existe borrador", () => {
      const loaded = PersistenceManager.loadDraft()
      expect(loaded).toBeNull()
    })
  })

  describe("mergeData - regla anti-vacíos", () => {
    it("no debe sobreescribir con valores vacíos", () => {
      const prefill: Partial<OnboardingFormData> = {
        empresa: {
          razonSocial: "Empresa Prellenada",
          rut: "11111111-1",
          rubro: "Tecnología",
        },
      }

      const draft: Partial<OnboardingFormData> = {
        empresa: {
          razonSocial: "", // Vacío
          rut: "11111111-1",
          rubro: "Construcción", // Cambio válido
        },
      }

      const merged = PersistenceManager.mergeData(prefill, draft)

      expect(merged.empresa.razonSocial).toBe("Empresa Prellenada") // No debe sobreescribir con vacío
      expect(merged.empresa.rubro).toBe("Construcción") // Debe respetar cambio válido
    })

    it("debe usar valor del draft si es válido", () => {
      const prefill: Partial<OnboardingFormData> = {
        empresa: { razonSocial: "Original" },
      }

      const draft: Partial<OnboardingFormData> = {
        empresa: { razonSocial: "Editado por usuario" },
      }

      const merged = PersistenceManager.mergeData(prefill, draft)
      expect(merged.empresa.razonSocial).toBe("Editado por usuario")
    })
  })

  describe("resetToInitial", () => {
    it("debe resetear al estado inicial preservando prefill", () => {
      // Guardar prefill
      const prefillData: Partial<OnboardingFormData> = {
        empresa: { razonSocial: "Empresa Prefill", rut: "99999999-9" },
      }
      PersistenceManager.savePrefill(prefillData, "zoho123")

      // Guardar borrador con cambios
      const draftData: OnboardingFormData = {
        empresa: { razonSocial: "Empresa Modificada", rut: "99999999-9" },
        admins: [{ nombre: "Admin 1" }],
        // ... más campos
      }
      PersistenceManager.saveDraft(draftData, {
        timestamp: Date.now(),
        version: "2.0",
        currentStep: 5,
        completedSteps: [0, 1, 2, 3, 4],
        hasToken: true,
        idZoho: "zoho123",
      })

      // Reset
      const reset = PersistenceManager.resetToInitial()

      expect(reset).not.toBeNull()
      expect(reset?.data.empresa.razonSocial).toBe("Empresa Prefill") // Debe volver al prefill
      expect(reset?.metadata.currentStep).toBe(0) // Debe volver al inicio
    })
  })
})
