"use client"

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"

// Mock component for testing navigation
const MockStepper = ({ currentStep, onNext, onPrev }: any) => {
  const steps = ["Bienvenida", "Antes de comenzar", "Empresa", "Admin", "Trabajadores"]

  return (
    <div>
      <div>Paso actual: {currentStep}</div>
      <div>Nombre del paso: {steps[currentStep]}</div>
      <button onClick={onPrev} disabled={currentStep === 0}>
        Atrás
      </button>
      <button onClick={onNext} disabled={currentStep === steps.length - 1}>
        Siguiente
      </button>
    </div>
  )
}

describe("Navegación del Stepper", () => {
  it("comienza en el primer paso", () => {
    const onNext = vi.fn()
    const onPrev = vi.fn()

    render(<MockStepper currentStep={0} onNext={onNext} onPrev={onPrev} />)

    expect(screen.getByText("Paso actual: 0")).toBeInTheDocument()
    expect(screen.getByText("Nombre del paso: Bienvenida")).toBeInTheDocument()
  })

  it("no permite retroceder desde el primer paso", () => {
    const onNext = vi.fn()
    const onPrev = vi.fn()

    render(<MockStepper currentStep={0} onNext={onNext} onPrev={onPrev} />)

    const prevButton = screen.getByText("Atrás")
    expect(prevButton).toBeDisabled()
  })

  it("permite avanzar al siguiente paso", () => {
    const onNext = vi.fn()
    const onPrev = vi.fn()

    render(<MockStepper currentStep={0} onNext={onNext} onPrev={onPrev} />)

    const nextButton = screen.getByText("Siguiente")
    fireEvent.click(nextButton)

    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it("permite retroceder desde pasos intermedios", () => {
    const onNext = vi.fn()
    const onPrev = vi.fn()

    render(<MockStepper currentStep={2} onNext={onNext} onPrev={onPrev} />)

    const prevButton = screen.getByText("Atrás")
    expect(prevButton).not.toBeDisabled()
    fireEvent.click(prevButton)

    expect(onPrev).toHaveBeenCalledTimes(1)
  })
})
