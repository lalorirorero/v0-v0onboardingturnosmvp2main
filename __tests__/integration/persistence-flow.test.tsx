import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OnboardingTurnosCliente } from "@/components/onboarding-turnos"

describe("Flujo de Persistencia", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("debe mostrar diálogo de borrador al refrescar con progreso guardado", async () => {
    // Simular progreso guardado
    const draftData = {
      data: {
        empresa: { razonSocial: "Test", rut: "12345678-9" },
        // ... más datos
      },
      metadata: {
        currentStep: 3,
        completedSteps: [0, 1, 2],
        timestamp: Date.now(),
        version: "2.0",
        hasToken: false,
        idZoho: null,
      },
    }
    localStorage.setItem("onboarding_draft", JSON.stringify(draftData))

    render(<OnboardingTurnosCliente />)

    await waitFor(() => {
      expect(screen.getByText(/Tienes un borrador guardado/i)).toBeInTheDocument()
    })
  })

  it("debe restaurar datos al seleccionar continuar", async () => {
    const draftData = {
      data: {
        empresa: { razonSocial: "Test Restaurado", rut: "12345678-9" },
      },
      metadata: {
        currentStep: 2,
        completedSteps: [0, 1],
        timestamp: Date.now(),
        version: "2.0",
        hasToken: false,
        idZoho: null,
      },
    }
    localStorage.setItem("onboarding_draft", JSON.stringify(draftData))

    render(<OnboardingTurnosCliente />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText(/Continuar donde lo dejé/i)).toBeInTheDocument()
    })

    await user.click(screen.getByText(/Continuar donde lo dejé/i))

    // Verificar que los datos se restauraron
    await waitFor(() => {
      const input = screen.getByDisplayValue("Test Restaurado")
      expect(input).toBeInTheDocument()
    })
  })

  it("no debe borrar prefill al hacer reset", async () => {
    // TODO: Implementar test completo
    expect(true).toBe(true)
  })
})
