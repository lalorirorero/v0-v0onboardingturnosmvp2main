"use client"

import { useState } from "react"
import { Lock, Edit2, X, Info } from "lucide-react"

interface ProtectedFieldProps {
  // Valor actual del campo
  value: string | string[]
  // Si el campo fue prellenado desde el sistema maestro
  isPrefilled: boolean
  // Si el campo fue editado por el usuario
  wasEdited: boolean
  // Label del campo
  label: string
  // Placeholder
  placeholder?: string
  // Tipo de input
  type?: "text" | "email" | "tel" | "select" | "checkbox-group"
  // Nombre del campo
  name: string
  // Callback cuando cambia el valor
  onChange: (name: string, value: string | string[]) => void
  // Tooltip informativo
  tooltip?: string
  // Opciones para select o checkbox-group
  options?: string[]
  // Si está en modo solo lectura (paso completado)
  readOnly?: boolean
  // Callback cuando se desbloquea para editar
  onUnlock?: () => void
}

export function ProtectedField({
  value,
  isPrefilled,
  wasEdited,
  label,
  placeholder,
  type = "text",
  name,
  onChange,
  tooltip,
  options = [],
  readOnly = false,
  onUnlock,
}: ProtectedFieldProps) {
  const [isEditing, setIsEditing] = useState(!isPrefilled || wasEdited)
  const [tempValue, setTempValue] = useState(value)

  // Si el campo es de solo lectura (paso completado y bloqueado)
  if (readOnly) {
    const displayValue = Array.isArray(value) ? value.join(", ") : value

    return (
      <div className="space-y-1 text-sm">
        <label className="font-medium flex items-center gap-2">
          {label}
          <Lock className="h-3 w-3 text-slate-400" />
          {wasEdited && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Editado</span>}
        </label>
        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {displayValue || <span className="text-slate-400 italic">Sin valor</span>}
        </div>
      </div>
    )
  }

  // Campo prellenado en modo bloqueado
  if (isPrefilled && !isEditing) {
    const displayValue = Array.isArray(value) ? value.join(", ") : value

    return (
      <div className="space-y-1 text-sm">
        <label className="font-medium flex items-center gap-2">
          {label}
          <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Dato de sistema
          </span>
          {tooltip && (
            <span className="group relative">
              <Info className="h-3 w-3 text-slate-400 cursor-help" />
              <span className="absolute hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded -top-8 left-0 whitespace-nowrap z-10">
                {tooltip}
              </span>
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-slate-700">
            {displayValue || <span className="text-slate-400 italic">Sin valor</span>}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditing(true)
              setTempValue(value)
              onUnlock?.()
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1 text-sm transition-colors"
            title="Editar este campo"
          >
            <Edit2 className="h-4 w-4" />
            Editar
          </button>
        </div>
      </div>
    )
  }

  // Modo edición normal
  const handleChange = (newValue: string | string[]) => {
    setTempValue(newValue)
    onChange(name, newValue)
  }

  const handleCancel = () => {
    if (isPrefilled) {
      setIsEditing(false)
      setTempValue(value)
    }
  }

  // Renderizar input según tipo
  const renderInput = () => {
    if (type === "select") {
      return (
        <select
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          name={name}
          value={tempValue as string}
          onChange={(e) => handleChange(e.target.value)}
        >
          <option value="">Seleccionar...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
    }

    if (type === "checkbox-group") {
      const selectedValues = Array.isArray(tempValue) ? tempValue : []

      return (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(opt)}
                onChange={() => {
                  const newValues = selectedValues.includes(opt)
                    ? selectedValues.filter((v) => v !== opt)
                    : [...selectedValues, opt]
                  handleChange(newValues)
                }}
                className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )
    }

    return (
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        type={type}
        name={name}
        value={tempValue as string}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
      />
    )
  }

  return (
    <div className="space-y-1 text-sm">
      <label className="font-medium flex items-center gap-2">
        {label}
        {isPrefilled && wasEdited && (
          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Editado</span>
        )}
        {tooltip && (
          <span className="group relative">
            <Info className="h-3 w-3 text-slate-400 cursor-help" />
            <span className="absolute hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded -top-8 left-0 whitespace-nowrap z-10">
              {tooltip}
            </span>
          </span>
        )}
      </label>
      <div className="flex gap-2">
        <div className="flex-1">{renderInput()}</div>
        {isPrefilled && isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1 text-sm transition-colors"
            title="Cancelar edición"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
