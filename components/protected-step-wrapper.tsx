"use client"

import type React from "react"

import { Edit2, Check } from "lucide-react"

interface ProtectedStepWrapperProps {
  children: React.ReactNode
  stepName: string
  isCompleted: boolean
  isLocked: boolean
  onUnlock: () => void
  onConfirmEdit: () => void
  // Resumen de datos para mostrar en modo bloqueado
  summaryData?: Array<{ label: string; value: string }>
}

export function ProtectedStepWrapper({
  children,
  stepName,
  isCompleted,
  isLocked,
  onUnlock,
  onConfirmEdit,
  summaryData = [],
}: ProtectedStepWrapperProps) {
  // Si el paso está completado y bloqueado, mostrar resumen
  if (isCompleted && isLocked) {
    return (
      <section className="space-y-6">
        <div className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-green-800">
              <Check className="h-5 w-5" />
              {stepName} - Completado
            </h3>
            <button
              type="button"
              onClick={onUnlock}
              className="px-4 py-2 rounded-xl border border-green-300 bg-white hover:bg-green-100 text-green-700 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Editar este paso
            </button>
          </div>

          {summaryData.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 mt-4">
              {summaryData.map((item, idx) => (
                <div key={idx} className="text-sm">
                  <span className="text-green-600 font-medium">{item.label}:</span>{" "}
                  <span className="text-green-800">{item.value || "-"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    )
  }

  // Mostrar formulario normal (con banner si fue desbloqueado para edición)
  return (
    <section className="space-y-6">
      {isCompleted && !isLocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <Edit2 className="h-4 w-4" />
            <span className="text-sm font-medium">
              Editando paso completado - Los cambios se guardarán al continuar
            </span>
          </div>
          <button
            type="button"
            onClick={onConfirmEdit}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors flex items-center gap-1"
          >
            <Check className="h-4 w-4" />
            Confirmar cambios
          </button>
        </div>
      )}
      {children}
    </section>
  )
}
