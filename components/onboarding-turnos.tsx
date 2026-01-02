"use client"

import React from "react"

import { useState, useEffect, useRef, useCallback } from "react" // Import useRef and useCallback
import {
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Shield,
  Rocket,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Award,
  Heart,
  Zap,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button" // Import added
import { useSearchParams } from "next/navigation" // Added for token handling
import { useToast } from "@/components/ui/use-toast" // Added for toast notifications

// REMOVED: PersistenceManager and persistence types
// quita // <-- This line was removed as it was identified as an undeclared variable in the updates.
const steps = [
  { id: 0, label: "Bienvenida", description: "Comienza aquí" },
  { id: 1, label: "Antes de comenzar", description: "Información del proceso" },
  { id: 2, label: "Empresa", description: "Datos base de la empresa" },
  { id: 3, label: "Admin", description: "Encargado de la plataforma" },
  { id: 4, label: "Decisión", description: "¿Cargar trabajadores?" }, // Actualizar array de steps
  { id: 5, label: "Trabajadores", description: "Listado inicial" },
  { id: 6, label: "Configuración", description: "Decidir qué configurar" },
  { id: 7, label: "Turnos", description: "Definición de turnos" },
  { id: 8, label: "Planificaciones", description: "Tipos de planificación semanal" },
  { id: 9, label: "Asignaciones", description: "Asignar planificaciones a trabajadores" },
  { id: 10, label: "Resumen", description: "Revisión final" },
  { id: 11, label: "Agradecimiento", description: "¡Completado!" }, // Agregar paso de agradecimiento
]

const PRIMER_PASO = 0

// Días de la semana
const DIAS = ["L", "M", "X", "J", "V", "S", "D"]

const TOOLTIP_GRUPO =
  '"Grupo" corresponde a una forma de clasificar a los colaboradores según características que tengan en común, como por ejemplo el lugar de trabajo, tipo de turno, área/departamento al que pertenece.'

const TOOLTIP_PERIODO_PLAN =
  "Estas fechas indican el periodo de vigencia de la planificación asignada a cada trabajador (por ejemplo, del 01-10 al 31-10)."

// Helpers de validación
const normalizeRut = (rut) => {
  if (!rut) return ""
  return rut.replace(/\./g, "").replace(/-/g, "").toUpperCase()
}

const isValidRut = (rut) => {
  const clean = normalizeRut(rut)
  if (!clean) return false
  if (!/^[0-9]+[0-9K]$/.test(clean)) return false

  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  let sum = 0
  let multiplier = 2

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number.parseInt(body[i], 10) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const mod = 11 - (sum % 11)
  let expected
  if (mod === 11) expected = "0"
  else if (mod === 10) expected = "K"
  else expected = String(mod)

  return dv === expected
}

const isValidEmail = (email) => {
  if (!email) return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email.trim())
}

const validateEmpresaFields = (empresa: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!empresa.razonSocial?.trim()) errors.push("Razón Social")
  if (!empresa.nombreFantasia?.trim()) errors.push("Nombre de fantasía")
  if (!empresa.rut?.trim()) errors.push("RUT")
  if (!empresa.giro?.trim()) errors.push("Giro")
  if (!empresa.direccion?.trim()) errors.push("Dirección")
  if (!empresa.comuna?.trim()) errors.push("Comuna")
  if (!empresa.emailFacturacion?.trim()) errors.push("Email de facturación")
  if (!empresa.telefonoContacto?.trim()) errors.push("Teléfono de contacto")
  if (!empresa.rubro?.trim()) errors.push("Rubro")
  if (!empresa.sistema || empresa.sistema.length === 0) errors.push("Sistema")

  // Validación de email
  if (empresa.emailFacturacion?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(empresa.emailFacturacion)) {
      errors.push("Email de facturación (formato inválido)")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

const validateAdminsFields = (admins: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!admins || admins.length === 0) {
    errors.push("Debe agregar al menos un administrador")
    return { isValid: false, errors }
  }

  admins.forEach((admin, index) => {
    const adminNum = index + 1
    if (!admin.nombre?.trim()) errors.push(`Administrador ${adminNum}: Nombre`)
    if (!admin.email?.trim()) errors.push(`Administrador ${adminNum}: Email`)
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(admin.email)) {
        errors.push(`Administrador ${adminNum}: Email (formato inválido)`)
      }
    }
    if (!admin.telefono?.trim()) errors.push(`Administrador ${adminNum}: Teléfono`)
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

const Stepper = ({ currentStep }) => {
  return (
    <div className="w-full overflow-hidden">
      <ol className="flex justify-between gap-1">
        {steps.map((step, index) => {
          const status = index < currentStep ? "completed" : index === currentStep ? "current" : "pending"

          const base = "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm bg-white min-w-0"
          const stateClass =
            status === "current"
              ? "border-primary bg-primary/10"
              : status === "completed"
                ? "border-success bg-success/10"
                : "border-muted"

          return (
            <li key={step.id} className={`${base} ${stateClass}`}>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold flex-shrink-0
              ${status === "current" ? "bg-primary text-primary-foreground" : ""}
              ${status === "completed" ? "bg-success text-success-foreground" : ""}
              ${status === "pending" ? "bg-muted text-muted-foreground" : ""}`}
              >
                {status === "completed" ? "✓" : index + 1}
              </div>
              <div className="flex flex-col min-w-0 overflow-hidden">
                <div className="font-medium text-foreground text-[11px] truncate">{step.label}</div>
                <div className="text-muted-foreground text-[9px] truncate hidden lg:block">{step.description}</div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

const AdminStep = ({ admins, setAdmins, grupos, ensureGrupoByName, onRemoveAdmin, isEditMode }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    rut: "",
    email: "",
    telefono: "",
    grupo: "",
  })

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})

  const handleFormChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      if (fieldErrors[field]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }
    },
    [fieldErrors],
  )

  const validateAdminForm = useCallback(() => {
    const errors: { [key: string]: string } = {}

    if (!formData.nombre.trim()) {
      errors.nombre = "El nombre es obligatorio"
    }

    if (!formData.apellido.trim()) {
      errors.apellido = "El apellido es obligatorio"
    }

    if (!formData.rut.trim()) {
      errors.rut = "El RUT es obligatorio"
    } else {
      // Validar formato de RUT chileno
      const rutRegex = /^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$/
      if (!rutRegex.test(formData.rut)) {
        errors.rut = "Formato inválido (ej: 12.345.678-9)"
      }
    }

    if (!formData.email.trim()) {
      errors.email = "El correo es obligatorio"
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        errors.email = "Formato de correo inválido (ej: correo@empresa.cl)"
      }
    }

    if (!formData.telefono.trim()) {
      errors.telefono = "El teléfono es obligatorio"
    } else {
      // Validar formato de teléfono (debe empezar con + y tener al menos 8 dígitos)
      const phoneRegex = /^\+?[0-9]{8,15}$/
      if (!phoneRegex.test(formData.telefono.replace(/\s/g, ""))) {
        errors.telefono = "Formato inválido (ej: +56912345678)"
      }
    }

    return errors
  }, [formData])

  const handleAddAdminClick = useCallback(() => {
    console.log("[v0] ===== BOTÓN AGREGAR ADMIN CLICKEADO (desde AdminStep) =====")

    const errors = validateAdminForm()

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // Crear el grupo si es nuevo
    let grupoId = ""
    if (formData.grupo.trim()) {
      grupoId = ensureGrupoByName(formData.grupo.trim())
    }

    const newAdmin = {
      id: Date.now(),
      nombre: `${formData.nombre.trim()} ${formData.apellido.trim()}`,
      apellido: formData.apellido.trim(),
      rut: formData.rut,
      email: formData.email,
      telefono: formData.telefono,
      grupoId: grupoId,
      grupoNombre: formData.grupo,
    }

    setAdmins([...admins, newAdmin])

    setFormData({
      nombre: "",
      apellido: "",
      rut: "",
      email: "",
      telefono: "",
      grupo: "",
    })
    setFieldErrors({})
  }, [formData, admins, setAdmins, ensureGrupoByName, validateAdminForm])

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Administrador de la plataforma</h2>
        <p className="mt-1 text-sm text-slate-600">
          El administrador es la persona que tendrá acceso completo a GeoVictoria para gestionar la asistencia,
          configurar turnos, administrar trabajadores y generar reportes de tu empresa.
        </p>
        <p className="text-sm text-slate-500">
          Puede ser el encargado de RRHH, jefe de operaciones o quien será responsable del control de asistencia.
        </p>
      </header>

      {/* Formulario de nuevo administrador */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-medium text-slate-700">
          Datos del administrador <span className="text-destructive">*</span>
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Nombre <span className="text-destructive">*</span>
            </label>
            <input
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                fieldErrors.nombre
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-200 bg-white focus:border-sky-500 focus:ring-sky-500"
              }`}
              type="text"
              value={formData.nombre}
              onChange={(e) => handleFormChange("nombre", e.target.value)}
              placeholder="Ej: María"
            />
            {fieldErrors.nombre && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <span>⚠</span>
                {fieldErrors.nombre}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Apellido <span className="text-destructive">*</span>
            </label>
            <input
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                fieldErrors.apellido
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-200 bg-white focus:border-sky-500 focus:ring-sky-500"
              }`}
              type="text"
              value={formData.apellido}
              onChange={(e) => handleFormChange("apellido", e.target.value)}
              placeholder="Ej: González"
            />
            {fieldErrors.apellido && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <span>⚠</span>
                {fieldErrors.apellido}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              <span>
                RUT <span className="text-destructive">*</span>
              </span>
              <span className="ml-1 cursor-help text-slate-400" title="Ingresa el RUT sin puntos y con guión">
                ⓘ
              </span>
            </label>
            <input
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                fieldErrors.rut
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-200 bg-white focus:border-sky-500 focus:ring-sky-500"
              }`}
              type="text"
              value={formData.rut}
              onChange={(e) => handleFormChange("rut", e.target.value)}
              placeholder="12.345.678-9"
            />
            {fieldErrors.rut && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <span>⚠</span>
                {fieldErrors.rut}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              <span>
                Correo <span className="text-destructive">*</span>
              </span>
              <span className="ml-1 cursor-help text-slate-400" title="Será usado para inicio de sesión">
                ⓘ
              </span>
            </label>
            <input
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                fieldErrors.email
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-200 bg-white focus:border-sky-500 focus:ring-sky-500"
              }`}
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              placeholder=" correo@empresa.cl"
            />
            {fieldErrors.email && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <span>⚠</span>
                {fieldErrors.email}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              <span>
                Teléfono <span className="text-destructive">*</span>
              </span>
              <span className="ml-1 cursor-help text-slate-400" title="Con código de país">
                ⓘ
              </span>
            </label>
            <input
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                fieldErrors.telefono
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-200 bg-white focus:border-sky-500 focus:ring-sky-500"
              }`}
              type="tel"
              value={formData.telefono}
              onChange={(e) => handleFormChange("telefono", e.target.value)}
              placeholder="+56912345678"
            />
            {fieldErrors.telefono && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <span>⚠</span>
                {fieldErrors.telefono}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              <span>Grupo</span>
              <span className="ml-1 cursor-help text-slate-400" title="Grupo o departamento al que pertenece">
                ⓘ
              </span>
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              value={formData.grupo}
              onChange={(e) => handleFormChange("grupo", e.target.value)}
              placeholder="Ej: Recursos Humanos, Operaciones, etc."
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddAdminClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          <span>+</span>
          Agregar administrador
        </button>
      </div>

      {/* Listado de administradores */}
      {admins.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Administradores agregados ({admins.length})</h3>
          <div className="space-y-2">
            {admins.map((admin, index) => (
              <div
                key={admin.id || index}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{admin.nombre}</span>
                    {admin.grupoNombre && (
                      <span className="rounded-full bg-info-muted px-2 py-0.5 text-[10px] font-medium text-info-foreground">
                        {admin.grupoNombre}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {admin.rut && <span>RUT: {admin.rut}</span>}
                    {admin.email && <span>{admin.email}</span>}
                    {admin.telefono && <span>{admin.telefono}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveAdmin(index)}
                  className="ml-2 text-xs text-destructive hover:text-error-foreground focus:outline-none"
                  title="Eliminar administrador"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {admins.length === 0 && (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center">
          <p className="text-sm font-medium text-amber-800">Debes agregar al menos un administrador</p>
          <p className="text-xs text-amber-600 mt-1">
            Completa el formulario arriba con todos los campos obligatorios (*)
          </p>
        </div>
      )}
    </section>
  )
}

// START CHANGE: Modificar ProtectedInput para mostrar errores
const ProtectedInput = React.memo<{
  name: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
  error?: string // Nueva prop para mostrar error
}>(({ name, label, value, onChange, type = "text", placeholder, error }) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-lg border ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-slate-300 focus:border-sky-500 focus:ring-sky-500"
        } px-4 py-2.5 focus:outline-none focus:ring-1`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
})

ProtectedInput.displayName = "ProtectedInput"

// START CHANGE: Definiendo EmpresaStep FUERA del componente principal para evitar re-creación
const EmpresaStep = React.memo<{
  empresa: Empresa
  setEmpresa: (updater: Empresa | ((prev: Empresa) => Empresa)) => void
  prefilledFields: Set<string>
  isFieldPrefilled: (fieldKey: string) => boolean
  isFieldEdited: (fieldKey: string) => boolean
  trackFieldChange: (fieldKey: string, newValue: any) => void
  fieldErrors?: Record<string, string> // Nueva prop
}>(({ empresa, setEmpresa, prefilledFields, isFieldPrefilled, isFieldEdited, trackFieldChange, fieldErrors = {} }) => {
  const SISTEMAS = ["GeoVictoria BOX", "GeoVictoria CALL", "GeoVictoria APP", "GeoVictoria USB", "GeoVictoria WEB"]

  const SISTEMAS_INFO = {
    "GeoVictoria BOX": {
      imagen: "/images/box.png",
      titulo: "Relojes Biométricos",
      descripcion:
        "Dispositivos físicos con huella digital o reconocimiento facial. Ideal para oficinas, plantas y lugares con acceso fijo.",
    },
    "GeoVictoria CALL": {
      imagen: "/images/call.png",
      titulo: "Marcaje por Llamada",
      descripcion:
        "El trabajador marca llamando a un número gratuito. Ideal para personal en terreno sin smartphone o con baja conectividad.",
    },
    "GeoVictoria APP": {
      imagen: "/images/app.png",
      titulo: "Aplicación Móvil",
      descripcion:
        "App para smartphone con geolocalización y foto. Ideal para equipos en terreno, vendedores y personal móvil.",
    },
    "GeoVictoria USB": {
      imagen: "/images/usb.png",
      titulo: "Lector USB Biométrico",
      descripcion:
        "Lector de huella conectado a computador. Ideal para recepciones, escritorios compartidos o puestos de trabajo fijos.",
    },
    "GeoVictoria WEB": {
      imagen: "/images/web.png",
      titulo: "Portal Web",
      descripcion:
        "Marcaje desde el navegador con credenciales. Ideal para personal administrativo, teletrabajo y oficinas.",
    },
  }

  const RUBROS = [
    "1. Agrícola",
    "2. Condominio",
    "3. Construcción",
    "4. Inmobiliaria",
    "5. Consultoria",
    "6. Banca y Finanzas",
    "7. Educación",
    "8. Municipio",
    "9. Gobierno",
    "10. Mineria",
    "11. Naviera",
    "12. Outsourcing Seguridad",
    "13. Outsourcing General",
    "14. Outsourcing Retail",
    "15. Planta Productiva",
    "16. Logistica",
    "17. Retail Enterprise",
    "18. Retail SMB",
    "19. Salud",
    "20. Servicios",
    "21. Transporte",
    "22. Turismo, Hotelería y Gastronomía",
  ]

  const handleEmpresaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target
      setEmpresa((prev) => ({ ...prev, [name]: value }))
      if (isFieldPrefilled(`empresa.${name}`)) {
        trackFieldChange(`empresa.${name}`, value)
      }
    },
    [setEmpresa, isFieldPrefilled, trackFieldChange],
  )

  const handleSistemaChange = useCallback(
    (sistemaValue: string) => {
      setEmpresa((prev) => {
        const currentSistemas = prev.sistema || []
        const isSelected = currentSistemas.includes(sistemaValue)

        const newSistemas = isSelected
          ? currentSistemas.filter((s) => s !== sistemaValue)
          : [...currentSistemas, sistemaValue]

        if (isFieldPrefilled("empresa.sistema")) {
          trackFieldChange("empresa.sistema", newSistemas)
        }

        return { ...prev, sistema: newSistemas }
      })
    },
    [setEmpresa, isFieldPrefilled, trackFieldChange],
  )

  return (
    <section className="space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Building2 className="h-5 w-5 text-sky-500" />
          Datos de la empresa
        </h2>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <ProtectedInput
          name="razonSocial"
          label="Razón Social"
          placeholder="Ej: Tech Solutions S.A."
          value={empresa.razonSocial || ""}
          onChange={handleEmpresaChange}
          error={fieldErrors["empresa.razonSocial"]}
        />
        <ProtectedInput
          name="nombreFantasia"
          label="Nombre de fantasía"
          placeholder="Ej: TechSol"
          value={empresa.nombreFantasia || ""}
          onChange={handleEmpresaChange}
          error={fieldErrors["empresa.nombreFantasia"]}
        />
        <ProtectedInput
          name="rut"
          label="RUT"
          placeholder="Ej: 12.345.678-9"
          value={empresa.rut || ""}
          onChange={handleEmpresaChange}
          error={fieldErrors["empresa.rut"]}
        />
        <ProtectedInput
          name="giro"
          label="Giro"
          placeholder="Ej: Servicios de Tecnología"
          value={empresa.giro || ""}
          onChange={handleEmpresaChange}
          error={fieldErrors["empresa.giro"]}
        />
        <ProtectedInput
          name="direccion"
          label="Dirección"
          placeholder="Ej: Av. Principal 123"
          value={empresa.direccion || ""}
          onChange={handleEmpresaChange}
          error={fieldErrors["empresa.direccion"]}
        />
        <ProtectedInput
          name="comuna"
          label="Comuna"
          placeholder="Ej: Santiago"
          value={empresa.comuna || ""}
          onChange={handleEmpresaChange}
          error={fieldErrors["empresa.comuna"]}
        />
        <ProtectedInput
          name="emailFacturacion"
          label="Email de facturación"
          type="email"
          placeholder="facturacion@empresa.com"
          value={empresa.emailFacturacion || ""}
          onChange={handleEmpresaChange}
          error={fieldErrors["empresa.emailFacturacion"] || fieldErrors["empresa.emailFacturacion (formato inválido)"]}
        />
        <ProtectedInput
          name="telefonoContacto"
          label="Teléfono de contacto"
          type="tel"
          placeholder="+56912345678"
          value={empresa.telefonoContacto || ""}
          onChange={handleEmpresaChange}
          error={fieldErrors["empresa.telefonoContacto"]}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Sistema de marcaje</label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SISTEMAS.map((sistema) => {
            const info = SISTEMAS_INFO[sistema]
            const isSelected = empresa.sistema?.includes(sistema)

            return (
              <button
                key={sistema}
                type="button"
                onClick={() => handleSistemaChange(sistema)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected ? "border-sky-500 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-sm">{info.titulo}</h3>
                    <p className="mt-1 text-xs text-slate-600">{info.descripcion}</p>
                  </div>
                  <div
                    className={`ml-3 flex h-5 w-5 items-center justify-center rounded border-2 ${
                      isSelected ? "border-sky-500 bg-sky-500" : "border-slate-300"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="rubro" className="block text-sm font-medium text-slate-700 mb-2">
          Rubro
        </label>
        <select
          id="rubro"
          name="rubro"
          value={empresa.rubro || ""}
          onChange={handleEmpresaChange}
          className={`w-full rounded-lg border ${
            fieldErrors["empresa.rubro"] ? "border-red-500" : "border-slate-300"
          } px-4 py-2.5 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500`}
        >
          <option value="">Selecciona un rubro</option>
          {RUBROS.map((rubro) => (
            <option key={rubro} value={rubro}>
              {rubro}
            </option>
          ))}
        </select>
        {fieldErrors["empresa.rubro"] && <p className="mt-1 text-sm text-red-600">{fieldErrors["empresa.rubro"]}</p>}
      </div>

      {fieldErrors["empresa.sistema"] && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            {fieldErrors["empresa.sistema"]}
          </p>
        </div>
      )}
    </section>
  )
})

EmpresaStep.displayName = "EmpresaStep"

const TrabajadoresStep = ({
  trabajadores,
  setTrabajadores,
  grupos,
  setGrupos,
  errorGlobal,
  ensureGrupoByName, // Agregado prop ensureGrupoByName
}) => {
  const [bulkText, setBulkText] = useState("")
  const [showVideoModal, setShowVideoModal] = useState(false) // Renamed from showExcelVideo
  const [bulkStatus, setBulkStatus] = useState({ total: 0, added: 0, error: "" })
  const MAX_ROWS = 500
  const [errors, setErrors] = useState({ byId: {}, global: [] }) // Declare errors here

  useEffect(() => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length === 0) return

    if (lines.length > MAX_ROWS) {
      setBulkStatus({
        total: lines.length,
        added: 0,
        error: `Límite excedido. Máximo ${MAX_ROWS} filas por lote. Detectadas ${lines.length} filas.`,
      })
      return
    }

    const nombreToId = new Map()

    const nuevos = lines.map((line, index) => {
      const cols = line.split(/\t|;|,/)
      const rutCompleto = (cols[0] || "").trim()
      const correoPersonal = (cols[1] || "").trim()
      const nombres = (cols[2] || "").trim()
      const apellidos = (cols[3] || "").trim()
      const grupoNombre = (cols[4] || "").trim()
      const telefono1 = (cols[5] || "").trim()
      const telefono2 = (cols[6] || "").trim()
      const telefono3 = (cols[7] || "").trim()

      const nombreCompleto = `${nombres} ${apellidos}`.trim()

      let grupoId = ""
      if (grupoNombre) {
        const key = grupoNombre.trim().toLowerCase()
        if (nombreToId.has(key)) {
          grupoId = nombreToId.get(key)
        } else {
          const idObtenido = ensureGrupoByName(grupoNombre)
          grupoId = idObtenido
          nombreToId.set(key, idObtenido)
        }
      }

      return {
        id: Date.now() + index,
        nombre: nombreCompleto,
        rut: rutCompleto,
        correo: correoPersonal,
        grupoId,
        telefono1,
        telefono2,
        telefono3,
        tipo: "usuario",
      }
    })

    setTrabajadores([...trabajadores, ...nuevos])
    setBulkStatus({
      total: lines.length,
      added: lines.length,
      error: "",
    })
    setBulkText("")
    setErrors({ byId: {}, global: [] }) // setErrors is undeclared, this needs to be fixed.
  }, [bulkText, setBulkText, trabajadores, setTrabajadores, ensureGrupoByName]) // Added ensureGrupoByName to dependency array

  const updateTrabajador = (id, field, value) => {
    const updated = trabajadores.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    setTrabajadores(updated)

    if (errors?.byId?.[id]?.[field]) {
      // errors is undeclared, this needs to be fixed.
      const newById = { ...(errors.byId || {}) }
      const row = { ...(newById[id] || {}) }
      delete row[field]
      if (Object.keys(row).length === 0) {
        delete newById[id]
      } else {
        newById[id] = row
      }
      setErrors({ ...(errors || { byId: {}, global: [] }), byId: newById }) // setErrors is undeclared, this needs to be fixed.
    }
  }

  const addTrabajador = () => {
    setTrabajadores([
      ...trabajadores,
      {
        id: Date.now(),
        nombre: "",
        rut: "",
        correo: "",
        grupoId: "",
        telefono1: "",
        telefono2: "",
        telefono3: "",
        tipo: "usuario",
      },
    ])
  }

  const removeTrabajador = (id) => {
    const trabajador = trabajadores.find((t) => t.id === id)
    if (trabajador?.tipo === "administrador") {
      alert("No se puede eliminar un administrador desde aquí. Elimínalo desde el paso de Administradores.")
      return
    }
    setTrabajadores(trabajadores.filter((t) => t.id !== id))
    if (errors?.byId?.[id]) {
      // errors is undeclared, this needs to be fixed.
      const newById = { ...(errors.byId || {}) }
      delete newById[id]
      setErrors({ ...(errors || { byId: {}, global: [] }), byId: newById }) // setErrors is undeclared, this needs to be fixed.
    }
  }

  const globalErrors = errors?.global || []

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Trabajadores</h2>
        <p className="text-xs text-slate-500">
          Lista completa de trabajadores incluyendo administradores. Los usuarios se pueden agregar manualmente o
          mediante carga masiva.
        </p>
      </header>

      {globalErrors.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-[11px] text-red-800">
          <ul className="list-disc pl-4">
            {globalErrors.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">Pegado masivo desde Excel</p>
            <p className="text-[11px] text-slate-500">
              Copia celdas desde Excel con las columnas en este orden:
              <span className="font-medium">
                {" "}
                Rut Completo, Correo Personal, Nombres, Apellidos, Grupo, Teléfono 1, Teléfono 2, Teléfono 3
              </span>
              . Se procesa automáticamente.
            </p>
            <p className="text-[11px] text-amber-600 font-medium mt-1">
              Límite: {MAX_ROWS} filas por lote. Puedes pegar múltiples lotes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowVideoModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.841z" />
            </svg>
            Ver tutorial
          </button>
        </div>

        {bulkStatus.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-2.5">
            <div className="flex items-start gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-xs text-red-700">{bulkStatus.error}</p>
            </div>
          </div>
        )}

        {bulkStatus.added > 0 && !bulkStatus.error && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-2.5">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-green-500"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-xs text-green-700 font-medium">
                ✓ {bulkStatus.added} trabajador{bulkStatus.added !== 1 ? "es" : ""} agregado
                {bulkStatus.added !== 1 ? "s" : ""} correctamente
              </p>
            </div>
          </div>
        )}

        <textarea
          className="mt-2 h-28 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder={`Ejemplo de fila pegada:\n18371911-4\t correo@ejemplo.cl\tVICTOR MANUEL ALEJANDRO\tFLORES ESPEJO\tGTS\t+5691234567\t+5691234568\t+5691234569`}
          value={bulkText}
          onChange={(e) => {
            setBulkText(e.target.value)
            if (bulkStatus.error || bulkStatus.added > 0) {
              setBulkStatus({ total: 0, added: 0, error: "" })
            }
          }}
        />

        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
          <p className="text-[11px] text-slate-600">
            Total de trabajadores: <span className="font-semibold text-slate-800">{trabajadores.length}</span>
          </p>
        </div>
      </div>

      {showVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="relative w-full max-w-[1700px] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Cómo pegar datos desde Excel</h3>
                <p className="text-xs text-slate-500 mt-1">Tutorial paso a paso para importar trabajadores</p>
              </div>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="rounded-full p-2 hover:bg-slate-100 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 text-slate-600"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-xs space-y-2">
                <p className="font-semibold text-sky-900">Pasos para pegar desde Excel:</p>
                <ol className="list-decimal pl-5 space-y-1 text-sky-800">
                  <li>Selecciona las celdas en Excel con los datos de tus trabajadores</li>
                  <li>
                    Asegúrate de que las columnas estén en el orden correcto:{" "}
                    <span className="font-medium">
                      Rut Completo, Correo Personal, Nombres, Apellidos, Grupo, Teléfono 1, Teléfono 2, Teléfono 3
                    </span>
                  </li>
                  <li>Copia las celdas seleccionadas (Ctrl+C o Cmd+C)</li>
                  <li>Pega en el área de texto de arriba (Ctrl+V o Cmd+V)</li>
                  <li>Los trabajadores se agregarán automáticamente a la tabla</li>
                </ol>
                <p className="text-sky-700 italic mt-2">
                  Nota: Las columnas de teléfono son opcionales. Puedes dejarlas vacías si no tienes esa información.
                </p>
              </div>

              <div className="rounded-lg overflow-hidden bg-slate-900">
                <video controls className="w-full" src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/screen-capture%20%2845%29%20%28online-video-cutter.com%29%20%281%29-hWp1VhI7B4vhR7uue5IXg43PVpD92D.mp4">
                  Tu navegador no soporta la reproducción de videos.
                </video>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Nombre</th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">RUT</th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Correo</th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">
                <span className="inline-flex items-center gap-1">
                  Grupo
                  <span
                    className="cursor-help rounded-full border border-slate-300 px-1 text-[10px] text-slate-600"
                    title={TOOLTIP_GRUPO}
                  >
                    ?
                  </span>
                </span>
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Teléfono 1</th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Teléfono 2</th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Teléfono 3</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {trabajadores.map((t) => {
              const rowErrors = (errors && errors.byId && errors.byId[t.id]) || {}
              const isAdmin = t.tipo === "administrador"
              return (
                <tr key={t.id} className={`border-t border-slate-100 ${isAdmin ? "bg-blue-50" : ""}`}>
                  <td className="px-3 py-1.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isAdmin ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {isAdmin ? "Admin" : "Usuario"}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className={`w-full rounded-lg border px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        rowErrors.nombre ? "border-red-400" : "border-slate-200"
                      } ${isAdmin ? "bg-blue-50" : ""}`}
                      type="text"
                      value={t.nombre}
                      onChange={(e) => updateTrabajador(t.id, "nombre", e.target.value)}
                      placeholder="Ej: Pedro Soto"
                      disabled={isAdmin}
                    />
                    {rowErrors.nombre && <p className="mt-0.5 text-[10px] text-red-600">{rowErrors.nombre}</p>}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className={`w-full rounded-lg border px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        rowErrors.rut ? "border-red-400" : "border-slate-200"
                      } ${isAdmin ? "bg-blue-50" : ""}`}
                      type="text"
                      value={t.rut}
                      onChange={(e) => updateTrabajador(t.id, "rut", e.target.value)}
                      placeholder="ID interno / RUT"
                      disabled={isAdmin}
                    />
                    {rowErrors.rut && <p className="mt-0.5 text-[10px] text-red-600">{rowErrors.rut}</p>}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className={`w-full rounded-lg border px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        rowErrors.correo ? "border-red-400" : "border-slate-200"
                      } ${isAdmin ? "bg-blue-50" : ""}`}
                      type="email"
                      value={t.correo}
                      onChange={(e) => updateTrabajador(t.id, "correo", e.target.value)}
                      placeholder=" correo@empresa.cl"
                      disabled={isAdmin}
                    />
                    {rowErrors.correo && <p className="mt-0.5 text-[10px] text-red-600">{rowErrors.correo}</p>}
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      className={`w-full rounded-lg border px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        rowErrors.grupoId ? "border-red-400" : "border-slate-200"
                      } ${isAdmin ? "bg-blue-50" : ""}`}
                      value={t.grupoId}
                      onChange={(e) => updateTrabajador(t.id, "grupoId", e.target.value ? Number(e.target.value) : "")}
                      disabled={isAdmin}
                    >
                      <option value="">Sin asignar</option>
                      {grupos.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nombre}
                        </option>
                      ))}
                    </select>
                    {rowErrors.grupoId && <p className="mt-0.5 text-[10px] text-red-600">{rowErrors.grupoId}</p>}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className={`w-full rounded-lg border px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        rowErrors.telefono1 ? "border-red-400" : "border-slate-200"
                      } ${isAdmin ? "bg-blue-50" : ""}`}
                      type="tel"
                      value={t.telefono1 || ""}
                      onChange={(e) => updateTrabajador(t.id, "telefono1", e.target.value)}
                      placeholder="+5691234567"
                      disabled={isAdmin}
                    />
                    {rowErrors.telefono1 && <p className="mt-0.5 text-[10px] text-red-600">{rowErrors.telefono1}</p>}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className={`w-full rounded-lg border px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        rowErrors.telefono2 ? "border-red-400" : "border-slate-200"
                      } ${isAdmin ? "bg-blue-50" : ""}`}
                      type="tel"
                      value={t.telefono2 || ""}
                      onChange={(e) => updateTrabajador(t.id, "telefono2", e.target.value)}
                      placeholder="+5691234567"
                      disabled={isAdmin}
                    />
                    {rowErrors.telefono2 && <p className="mt-0.5 text-[10px] text-red-600">{rowErrors.telefono2}</p>}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className={`w-full rounded-lg border px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        rowErrors.telefono3 ? "border-red-400" : "border-slate-200"
                      } ${isAdmin ? "bg-blue-50" : ""}`}
                      type="tel"
                      value={t.telefono3 || ""}
                      onChange={(e) => updateTrabajador(t.id, "telefono3", e.target.value)}
                      placeholder="+5691234567"
                      disabled={isAdmin}
                    />
                    {rowErrors.telefono3 && <p className="mt-0.5 text-[10px] text-red-600">{rowErrors.telefono3}</p>}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeTrabajador(t.id)}
                      className={`text-xs ${
                        isAdmin ? "cursor-not-allowed text-slate-300" : "text-slate-500 hover:text-red-500"
                      }`}
                      disabled={isAdmin}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addTrabajador}
        className="mt-2 inline-flex items-center rounded-full border border-sky-500 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
      >
        + Agregar trabajador
      </button>
    </section>
  )
}

const TurnosStep = ({ turnos, setTurnos }) => {
  const [formTurno, setFormTurno] = React.useState({
    nombre: "",
    horaInicio: "",
    horaFin: "",
    tipoColacion: "sin", // "sin", "libre", "fija"
    colacionMinutos: "", // Cambiado de 0 a "" para permitir borrar
    colacionInicio: "",
    colacionFin: "",
    tooltip: "",
  })

  const handleAddTurno = () => {
    // Validación básica
    if (!formTurno.nombre.trim()) {
      alert("Por favor ingresa el nombre del turno")
      return
    }

    // Agregar el nuevo turno
    setTurnos([
      ...turnos,
      {
        id: Date.now(),
        ...formTurno,
        colacionMinutos: formTurno.colacionMinutos === "" ? 0 : Number(formTurno.colacionMinutos),
      },
    ])

    // Limpiar el formulario
    setFormTurno({
      nombre: "",
      horaInicio: "",
      horaFin: "",
      tipoColacion: "sin",
      colacionMinutos: "", // Cambiado de 0 a ""
      colacionInicio: "",
      colacionFin: "",
      tooltip: "",
    })
  }

  const removeTurno = (id) => {
    setTurnos(turnos.filter((t) => t.id !== id))
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Turnos</h2>
        <div className="mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-medium text-blue-900">¿Qué es un turno?</p>
          <p className="text-xs text-blue-800 leading-relaxed">
            Un <strong>turno</strong> es un bloque de horario laboral con hora de inicio, hora de término y tiempo de
            colación. Por ejemplo: "Turno Oficina" de 09:00 a 18:00 con 60 minutos de colación, o "Turno Noche" de 22:00
            a 06:00 con 30 minutos de colación.
          </p>
          <p className="text-xs text-blue-800 leading-relaxed">
            Los turnos son las <strong>piezas básicas</strong> que luego usarás para crear planificaciones semanales.
            También puedes crear un turno llamado "Libre" para indicar días de descanso.
          </p>
        </div>
      </header>

      <div className="space-y-3 rounded-xl border-2 border-sky-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Agregar nuevo turno</h3>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1 text-sm">
            <label className="font-medium">Nombre del turno</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              value={formTurno.nombre}
              onChange={(e) => setFormTurno({ ...formTurno, nombre: e.target.value })}
              placeholder="Ej: Turno Oficina, Turno Noche"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="font-medium">Hora inicio</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="time"
              value={formTurno.horaInicio}
              onChange={(e) => setFormTurno({ ...formTurno, horaInicio: e.target.value })}
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="font-medium">Hora fin</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="time"
              value={formTurno.horaFin}
              onChange={(e) => setFormTurno({ ...formTurno, horaFin: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="text-sm font-medium">Tipo de colación</label>
          <div className="grid gap-2 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setFormTurno({ ...formTurno, tipoColacion: "sin", colacionMinutos: "" })}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                formTurno.tipoColacion === "sin"
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Sin Colación
            </button>
            <button
              type="button"
              onClick={() => setFormTurno({ ...formTurno, tipoColacion: "libre", colacionMinutos: "" })}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                formTurno.tipoColacion === "libre"
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Colación Libre
            </button>
            <button
              type="button"
              onClick={() => setFormTurno({ ...formTurno, tipoColacion: "fija", colacionMinutos: "" })}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                formTurno.tipoColacion === "fija"
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Colación Fija
            </button>
          </div>

          {formTurno.tipoColacion === "libre" && (
            <div className="space-y-1 text-sm">
              <label className="font-medium">Tiempo de colación (minutos)</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                type="number"
                value={formTurno.colacionMinutos}
                onChange={(e) => setFormTurno({ ...formTurno, colacionMinutos: e.target.value })}
                placeholder="Ej: 30, 60"
                min="0"
              />
            </div>
          )}

          {formTurno.tipoColacion === "fija" && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="font-medium">Inicio colación</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  type="time"
                  value={formTurno.colacionInicio}
                  onChange={(e) => setFormTurno({ ...formTurno, colacionInicio: e.target.value })}
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="font-medium">Término colación</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  type="time"
                  value={formTurno.colacionFin}
                  onChange={(e) => setFormTurno({ ...formTurno, colacionFin: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1 text-sm">
          <label className="font-medium">Descripción (opcional)</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            type="text"
            value={formTurno.tooltip}
            onChange={(e) => setFormTurno({ ...formTurno, tooltip: e.target.value })}
            placeholder="Ej: Fin de Semana o Feriado"
          />
        </div>

        <button
          type="button"
          onClick={handleAddTurno}
          className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          Agregar turno
        </button>
      </div>

      {turnos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Turnos creados ({turnos.length})</h3>
          <div className="space-y-2">
            {turnos.map((turno) => (
              <div
                key={turno.id}
                className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{turno.nombre}</h4>
                    {turno.tooltip && <span className="text-xs text-slate-500">({turno.tooltip})</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    {turno.horaInicio && turno.horaFin && (
                      <span>
                        <strong>Horario:</strong> {turno.horaInicio} - {turno.horaFin}
                      </span>
                    )}
                    {turno.tipoColacion === "sin" && (
                      <span>
                        <strong>Colación:</strong> Sin colación
                      </span>
                    )}
                    {turno.tipoColacion === "libre" && turno.colacionMinutos > 0 && (
                      <span>
                        <strong>Colación libre:</strong> {turno.colacionMinutos} min
                      </span>
                    )}
                    {turno.tipoColacion === "fija" && turno.colacionInicio && turno.colacionFin && (
                      <span>
                        <strong>Colación fija:</strong> {turno.colacionInicio} - {turno.colacionFin}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeTurno(turno.id)}
                  className="text-xs text-slate-500 hover:text-red-500"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

const GruposStep = ({ grupos, setGrupos }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
  })

  const handleFormChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    [setFormData],
  ) // Added setFormData to dependencies

  const addGrupo = () => {
    if (!formData.nombre.trim()) {
      alert("Por favor ingresa el nombre del grupo")
      return
    }

    setGrupos([
      ...grupos,
      {
        id: Date.now(),
        nombre: formData.nombre,
        descripcion: formData.descripcion,
      },
    ])

    // Limpiar el formulario
    setFormData({
      nombre: "",
      descripcion: "",
    })
  }

  const removeGrupo = (id) => {
    setGrupos(grupos.filter((g) => g.id !== id))
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Grupos</h2>
        <p className="text-xs text-slate-500">
          Organiza a tus trabajadores en grupos por equipos, sucursales o departamentos.
        </p>
      </header>

      {/* Formulario único */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Agregar Grupo</h3>
        <div className="space-y-3">
          <div className="space-y-1 text-sm">
            <label className="font-medium">Nombre del grupo</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              value={formData.nombre}
              onChange={(e) => handleFormChange("nombre", e.target.value)}
              placeholder="Ej: Ventas, Bodega, Sucursal Centro"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium">Descripción (opcional)</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={formData.descripcion}
              onChange={(e) => handleFormChange("descripcion", e.target.value)}
              placeholder="Ej: Equipo de ventas de la región metropolitana"
              rows={2}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={addGrupo}
          className="mt-4 w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          + Agregar grupo
        </button>
      </div>

      {/* Listado de grupos */}
      {grupos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Grupos creados ({grupos.length})</h3>
          <div className="space-y-2">
            {grupos.map((grupo) => (
              <div
                key={grupo.id}
                className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{grupo.nombre}</div>
                  {grupo.descripcion && <div className="mt-1 text-xs text-slate-500">{grupo.descripcion}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => removeGrupo(grupo.id)}
                  className="ml-2 text-xs text-red-500 hover:text-red-700 focus:outline-none"
                  title="Eliminar grupo"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {grupos.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-500">No hay grupos creados aún</p>
          <p className="text-xs text-slate-400 mt-1">Completa el formulario arriba para agregar el primer grupo</p>
        </div>
      )}
    </section>
  )
}

const PlanificacionesStep = ({ planificaciones, setPlanificaciones, turnos }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    diasTurnos: Array(7).fill(null),
  })

  const handleFormChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    [setFormData],
  )

  const updateDiaTurno = useCallback(
    (dayIndex, turnoId) => {
      setFormData((prev) => {
        const nuevosDias = [...prev.diasTurnos]
        nuevosDias[dayIndex] = turnoId
        return { ...prev, diasTurnos: nuevosDias }
      })
    },
    [setFormData, setFormData],
  ) // Added setFormData to dependencies

  const addPlanificacion = useCallback(() => {
    if (!formData.nombre.trim()) {
      alert("Por favor ingresa el nombre de la planificación")
      return
    }

    const esCompleta = formData.diasTurnos.every((turnoId) => turnoId !== null && turnoId !== "")
    if (!esCompleta) {
      alert("Por favor asigna un turno a todos los días de la semana")
      return
    }

    setPlanificaciones([
      ...planificaciones,
      {
        id: Date.now(),
        nombre: formData.nombre,
        diasTurnos: formData.diasTurnos,
      },
    ])

    // Limpiar el formulario
    const defaultTurno =
      turnos.find((t) => t.nombre.toLowerCase() === "libre" || t.nombre.toLowerCase() === "descanso") || turnos[0]
    const defaultTurnoId = defaultTurno ? defaultTurno.id : null

    setFormData({
      nombre: "",
      diasTurnos: Array(7).fill(defaultTurnoId),
    })
  }, [formData, planificaciones, setPlanificaciones, turnos])

  const removePlanificacion = useCallback(
    (id) => {
      setPlanificaciones((prev) => prev.filter((p) => p.id !== id))
    },
    [setPlanificaciones],
  )

  const verificarPlanificacionCompleta = useCallback((diasTurnos) => {
    return diasTurnos.every((turnoId) => turnoId !== null && turnoId !== "")
  }, [])

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Planificaciones</h2>
        <div className="mt-2 space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
          <p className="text-sm font-medium text-purple-900">¿Qué es una planificación?</p>
          <p className="text-xs text-purple-800 leading-relaxed">
            Una <strong>planificación</strong> es un patrón semanal que combina los turnos que creaste en el paso
            anterior. Define qué turno se trabaja cada día de la semana (Lunes a Domingo).
          </p>
          <p className="text-xs text-purple-800 leading-relaxed">
            <strong>Ejemplo:</strong> Puedes crear una planificación llamada "Oficina 5x2" donde de Lunes a Viernes
            asignas "Turno Oficina" y Sábado y Domingo asignas "Libre". O una planificación "Rotativo" con diferentes
            turnos cada día.
          </p>
          <p className="text-xs text-purple-800 leading-relaxed">
            <strong>Relación con turnos:</strong> Cada día de la planificación usa uno de los turnos que definiste
            anteriormente. Las planificaciones te permiten crear patrones semanales reutilizables que luego asignarás a
            tus trabajadores.
          </p>
        </div>
      </header>

      {turnos.length === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Primero debes crear al menos un turno en el paso anterior.
        </div>
      )}

      {/* Formulario único */}
      {turnos.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Agregar Planificación</h3>
          <div className="space-y-3">
            <div className="space-y-1 text-sm">
              <label className="font-medium">Nombre de la planificación</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                type="text"
                value={formData.nombre}
                onChange={(e) => handleFormChange("nombre", e.target.value)}
                placeholder="Ej: Lunes a Viernes Oficina, Fin de semana Libre"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Asignación semanal (L, M, X, J, V, S, D)</p>
              <div className="grid gap-2 sm:grid-cols-7">
                {DIAS.map((dia, dayIndex) => {
                  const turnoAsignado = formData.diasTurnos[dayIndex]
                  return (
                    <div key={dayIndex} className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">{dia}</label>
                      <select
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        value={turnoAsignado ?? ""}
                        onChange={(e) => updateDiaTurno(dayIndex, e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Seleccionar</option>
                        {turnos.map((turno) => (
                          <option key={turno.id} value={turno.id}>
                            {turno.nombre || "Sin nombre"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="text-xs">
              {verificarPlanificacionCompleta(formData.diasTurnos) ? (
                <span className="text-emerald-700 font-medium">✓ Planificación completa</span>
              ) : (
                <span className="text-amber-700 font-medium">⚠ Todos los días deben tener un turno asignado</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={addPlanificacion}
            className="mt-4 w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          >
            + Agregar planificación
          </button>
        </div>
      )}

      {/* Listado de planificaciones */}
      {planificaciones.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Planificaciones creadas ({planificaciones.length})</h3>
          <div className="space-y-3">
            {planificaciones.map((plan) => {
              const esCompleta = verificarPlanificacionCompleta(plan.diasTurnos)
              return (
                <div key={plan.id} className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">{plan.nombre}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {esCompleta ? (
                          <span className="text-emerald-700 font-medium">✓ Completa</span>
                        ) : (
                          <span className="text-amber-700 font-medium">⚠ Incompleta</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePlanificacion(plan.id)}
                      className="text-xs text-red-500 hover:text-red-700 focus:outline-none"
                      title="Eliminar planificación"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-[10px]">
                    {DIAS.map((dia, dayIndex) => {
                      const turnoId = plan.diasTurnos[dayIndex]
                      const turno = turnos.find((t) => t.id === turnoId)
                      return (
                        <div key={dayIndex} className="text-center">
                          <div className="font-medium text-slate-600 mb-0.5">{dia}</div>
                          <div className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">{turno?.nombre || "-"}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {planificaciones.length === 0 && turnos.length > 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-500">No hay planificaciones creadas aún</p>
          <p className="text-xs text-slate-400 mt-1">
            Completa el formulario arriba para agregar la primera planificación
          </p>
        </div>
      )}
    </section>
  )
}

const AsignacionStep = ({ asignaciones, setAsignaciones, trabajadores, planificaciones, grupos, errorGlobal }) => {
  const [selectedGrupoId, setSelectedGrupoId] = useState("")
  const [selectedTrabajadoresIds, setSelectedTrabajadoresIds] = useState([])
  const [bulkPlanificacionId, setBulkPlanificacionId] = useState("")
  const [bulkDesde, setBulkDesde] = useState("")
  const [bulkHasta, setBulkHasta] = useState("")
  const [bulkError, setBulkError] = useState("")

  const updateAsignacion = useCallback(
    (id, field, value) => {
      setAsignaciones((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
    },
    [setAsignaciones],
  )

  const addAsignacion = useCallback(() => {
    setAsignaciones((prev) => [
      ...prev,
      { id: Date.now(), trabajadorId: "", planificacionId: "", desde: "", hasta: "" },
    ])
  }, [setAsignaciones])

  const removeAsignacion = useCallback(
    (id) => {
      if (asignaciones.length === 1) return
      setAsignaciones((prev) => prev.filter((a) => a.id !== id))
    },
    [asignaciones, setAsignaciones],
  )

  const trabajadoresFiltrados = selectedGrupoId
    ? trabajadores.filter((t) => {
        const tieneAsignacionValida = asignaciones.some(
          (a) => a.trabajadorId === t.id && a.planificacionId && a.desde && a.hasta,
        )
        return t.grupoId === selectedGrupoId && !tieneAsignacionValida
      })
    : trabajadores.filter((t) => {
        const tieneAsignacionValida = asignaciones.some(
          (a) => a.trabajadorId === t.id && a.planificacionId && a.desde && a.hasta,
        )
        return !tieneAsignacionValida
      })

  const toggleTrabajadorSeleccionado = useCallback(
    (id) => {
      setSelectedTrabajadoresIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    },
    [setSelectedTrabajadoresIds],
  )

  const seleccionarTodos = useCallback(() => {
    const ids = trabajadoresFiltrados.map((t) => t.id)
    setSelectedTrabajadoresIds(ids)
  }, [trabajadoresFiltrados, setSelectedTrabajadoresIds])

  const limpiarSeleccion = useCallback(() => {
    setSelectedTrabajadoresIds([])
  }, [setSelectedTrabajadoresIds])

  const crearAsignacionesMasivas = useCallback(() => {
    setBulkError("")

    if (!bulkPlanificacionId) {
      setBulkError("Selecciona una planificación para asignar.")
      return
    }
    if (!bulkDesde || !bulkHasta || (bulkHasta !== "permanente" && bulkHasta === "fecha")) {
      setBulkError("Debes indicar el periodo Desde y Hasta.")
      return
    }
    if (selectedTrabajadoresIds.length === 0) {
      setBulkError("Selecciona al menos un trabajador.")
      return
    }

    const nuevas = selectedTrabajadoresIds.map((trabId, idx) => ({
      id: Date.now() + idx,
      trabajadorId: trabId,
      planificacionId: bulkPlanificacionId,
      desde: bulkDesde,
      hasta: bulkHasta,
    }))

    setAsignaciones((prev) => [...prev, ...nuevas])
    setBulkError("")
    setSelectedTrabajadoresIds([])
  }, [
    selectedTrabajadoresIds,
    bulkPlanificacionId,
    bulkDesde,
    bulkHasta,
    setAsignaciones,
    setBulkError,
    setSelectedTrabajadoresIds,
  ])

  const getPlanificacionLabelForTrabajador = useCallback(
    (trabajadorId) => {
      const asignacionValida = asignaciones.find(
        (a) => a.trabajadorId === trabajadorId && a.planificacionId && a.desde && a.hasta,
      )
      if (!asignacionValida) return null
      const plan = planificaciones.find((p) => p.id === asignacionValida.planificacionId)
      return plan ? plan.nombre || "Sin nombre" : null
    },
    [asignaciones, planificaciones],
  )

  const totalTrabajadores = trabajadores.length
  const trabajadoresSinPlan = trabajadores.filter((t) => !getPlanificacionLabelForTrabajador(t.id)).length

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Asignación de planificaciones</h2>
        <div className="mt-2 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-900">¿Qué es una asignación?</p>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Una <strong>asignación</strong> es vincular a un trabajador específico con una planificación semanal durante
            un período determinado. Define <strong>quién</strong> trabaja <strong>qué patrón semanal</strong> y{" "}
            <strong>desde cuándo hasta cuándo</strong>.
          </p>
          <p className="text-xs text-emerald-800 leading-relaxed">
            <strong>Ejemplo:</strong> Puedes asignar a "Juan Pérez" la planificación "Oficina 5x2" desde el 01/01/2025
            hasta el 31/12/2025. Así Juan trabajará ese patrón semanal durante todo el año.
          </p>
          <p className="text-xs text-emerald-800 leading-relaxed">
            <strong>Relación con planificaciones:</strong> Las asignaciones toman las planificaciones que creaste (que a
            su vez usan los turnos) y las aplican a trabajadores reales. Puedes asignar la misma planificación a
            múltiples trabajadores o crear asignaciones individuales.
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-700">
          Total de trabajadores: <span className="font-semibold text-slate-800">{totalTrabajadores}</span>
        </p>
        <p className="text-[11px] text-slate-700">
          Trabajadores sin planificar:{" "}
          <span className={trabajadoresSinPlan > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-700"}>
            {trabajadoresSinPlan}
          </span>
        </p>
      </div>

      {errorGlobal && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-[11px] text-red-800">{errorGlobal}</div>
      )}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
        <div className="grid gap-3 md:grid-cols-4 md:items-end">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-700">Filtrar por grupo</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={selectedGrupoId}
              onChange={(e) => setSelectedGrupoId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Todos los grupos</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre || "Sin nombre"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-700">Planificación a asignar</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={bulkPlanificacionId}
              onChange={(e) => setBulkPlanificacionId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Seleccionar…</option>
              {planificaciones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre || "Sin nombre"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
              Desde
              <span
                className="cursor-help rounded-full border border-slate-300 px-1 text-[9px] text-slate-600"
                title={TOOLTIP_PERIODO_PLAN}
              >
                ?
              </span>
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={bulkDesde}
              onChange={(e) => setBulkDesde(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
              Hasta
              <span
                className="cursor-help rounded-full border border-slate-300 px-1 text-[9px] text-slate-600"
                title={TOOLTIP_PERIODO_PLAN}
              >
                ?
              </span>
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={bulkHasta === "permanente" ? "permanente" : "fecha"}
                onChange={(e) => {
                  if (e.target.value === "permanente") {
                    setBulkHasta("permanente")
                  } else {
                    setBulkHasta("")
                  }
                }}
              >
                <option value="fecha">Fecha específica</option>
                <option value="permanente">Permanente</option>
              </select>
              {bulkHasta !== "permanente" && (
                <input
                  type="date"
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={bulkHasta}
                  onChange={(e) => setBulkHasta(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-2">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-slate-700">Trabajadores filtrados</p>
            <p className="text-[11px] text-slate-500">
              Selecciona los trabajadores a los que aplicarás la planificación.
            </p>
          </div>
          <div className="flex gap-2 text-[11px]">
            <button
              type="button"
              onClick={seleccionarTodos}
              className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
            >
              Seleccionar todos
            </button>
            <button
              type="button"
              onClick={limpiarSeleccion}
              className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
            >
              Limpiar selección
            </button>
          </div>
        </div>

        <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-1 text-left font-medium text-slate-700">Sel.</th>
                <th className="px-3 py-1 text-left font-medium text-slate-700">Nombre</th>
                <th className="px-3 py-1 text-left font-medium text-slate-700">Grupo</th>
              </tr>
            </thead>
            <tbody>
              {trabajadoresFiltrados.map((t) => {
                const isSelected = selectedTrabajadoresIds.includes(t.id)
                const grupo = grupos.find((g) => g.id === t.grupoId)
                return (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-3 py-1 text-center">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleTrabajadorSeleccionado(t.id)} />
                    </td>
                    <td className="px-3 py-1">
                      {t.nombre || "Sin nombre"}
                      {t.rut ? <span className="text-[10px] text-slate-500"> – {t.rut}</span> : null}
                    </td>
                    <td className="px-3 py-1">{grupo ? grupo.nombre : "Sin grupo"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {bulkError && <p className="text-[11px] text-red-600">{bulkError}</p>}

        <button
          type="button"
          onClick={crearAsignacionesMasivas}
          className="inline-flex items-center rounded-full bg-sky-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-sky-600"
        >
          Asignar planificación a seleccionados
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Trabajador</th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Planificación</th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">
                <span className="flex items-center gap-1">
                  Desde
                  <span
                    className="cursor-help rounded-full border border-slate-300 px-1 text-[9px] text-slate-600"
                    title={TOOLTIP_PERIODO_PLAN}
                  >
                    ?
                  </span>
                </span>
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">
                <span className="flex items-center gap-1">
                  Hasta
                  <span
                    className="cursor-help rounded-full border border-slate-300 px-1 text-[9px] text-slate-600"
                    title={TOOLTIP_PERIODO_PLAN}
                  >
                    ?
                  </span>
                </span>
              </th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {asignaciones.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-3 py-1.5">
                  <select
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={a.trabajadorId}
                    onChange={(e) =>
                      updateAsignacion(a.id, "trabajadorId", e.target.value ? Number(e.target.value) : "")
                    }
                  >
                    <option value="">Seleccionar…</option>
                    {trabajadores.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre || "Sin nombre"}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <select
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={a.planificacionId}
                    onChange={(e) =>
                      updateAsignacion(a.id, "planificacionId", e.target.value ? Number(e.target.value) : "")
                    }
                  >
                    <option value="">Seleccionar…</option>
                    {planificaciones.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre || "Sin nombre"}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    type="date"
                    value={a.desde}
                    onChange={(e) => updateAsignacion(a.id, "desde", e.target.value)}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex gap-2 items-center">
                    <select
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      value={a.hasta === "permanente" ? "permanente" : "fecha"}
                      onChange={(e) => {
                        if (e.target.value === "permanente") {
                          updateAsignacion(a.id, "hasta", "permanente")
                        } else {
                          updateAsignacion(a.id, "hasta", "")
                        }
                      }}
                    >
                      <option value="fecha">Fecha</option>
                      <option value="permanente">Permanente</option>
                    </select>
                    {a.hasta !== "permanente" && (
                      <input
                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        type="date"
                        value={a.hasta}
                        onChange={(e) => updateAsignacion(a.id, "hasta", e.target.value)}
                      />
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => removeAsignacion(a.id)}
                    className="rounded-full px-2 py-1 text-[11px] text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addAsignacion}
        className="mt-2 inline-flex items-center rounded-full border border-sky-500 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
      >
        + Agregar asignación manual
      </button>

      <div className="mt-6 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Estado de planificación por trabajador</h3>
        </div>
        <p className="text-[11px] text-slate-600">
          Aquí se muestran todos los trabajadores. Si un trabajador no tiene una planificación válida asignada (con
          periodo Desde/Hasta), aparecerá como
          <span className="font-semibold text-red-600"> "Sin planificar"</span>.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Trabajador</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Planificación asignada</th>
              </tr>
            </thead>
            <tbody>
              {trabajadores.map((t) => {
                const label = getPlanificacionLabelForTrabajador(t.id)
                return (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">
                      {t.nombre || "Sin nombre"}
                      {t.rut ? <span className="text-[10px] text-slate-500"> – {t.rut}</span> : null}
                    </td>
                    <td className="px-3 py-1.5">
                      {label ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {label}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                          Sin planificar
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

const DecisionStep = ({ onDecision }) => {
  return (
    <section className="space-y-6">
      <header className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
          ¿Deseas configurar turnos y planificaciones ahora?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Puedes configurar los turnos, planificaciones y asignaciones ahora, o verlo más tarde durante la capacitación
          de la plataforma.
        </p>
      </header>

      <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onDecision("now")}
          className="group relative overflow-hidden rounded-2xl border-2 border-sky-300 bg-white p-6 text-left transition-all hover:border-sky-500 hover:shadow-lg"
        >
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 transition-colors group-hover:bg-sky-500 group-hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Configurar ahora</h3>
          <p className="text-sm text-slate-600">
            Continúa configurando turnos, planificaciones y asignaciones en los siguientes pasos.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onDecision("later")}
          className="group relative overflow-hidden rounded-2xl border-2 border-emerald-300 bg-white p-6 text-left transition-all hover:border-emerald-500 hover:shadow-lg"
        >
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Ver en capacitación</h3>
          <p className="text-sm text-slate-600">
            Omite esta configuración y completa el onboarding. Lo verás durante la capacitación de la plataforma.
          </p>
        </button>
      </div>
    </section>
  )
}

const WorkersDecisionStep = ({ onDecision }: { onDecision: (decision: "now" | "later") => void }) => {
  return (
    <section className="space-y-6">
      <header className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">¿Deseas cargar trabajadores ahora?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Puedes cargar los trabajadores ahora o hacerlo más tarde durante la capacitación de la plataforma.
        </p>
      </header>

      <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onDecision("now")}
          className="group relative overflow-hidden rounded-2xl border-2 border-sky-300 bg-white p-6 text-left transition-all hover:border-sky-500 hover:shadow-lg"
        >
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 transition-colors group-hover:bg-sky-500 group-hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Cargar ahora</h3>
          <p className="text-sm text-slate-600">Continúa cargando los trabajadores en el siguiente paso.</p>
        </button>

        <button
          type="button"
          onClick={() => onDecision("later")}
          className="group relative overflow-hidden rounded-2xl border-2 border-emerald-300 bg-white p-6 text-left transition-all hover:border-emerald-500 hover:shadow-lg"
        >
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Cargar en capacitación</h3>
          <p className="text-sm text-slate-600">
            Salta a la revisión final. Cargarás trabajadores durante la capacitación de la plataforma.
          </p>
        </button>
      </div>
    </section>
  )
}

const casosDeExitoVideos = [
  {
    empresa: "Starbucks",
    industria: "Alimentación",
    videoId: "Je6-Ka-1Fjo",
    quote: "Logramos reducir en un 90% el tiempo dedicado a gestión de asistencia",
  },
  {
    empresa: "Huawei Chile",
    industria: "Telecomunicaciones",
    videoId: "wg8iLbheAzg",
    quote: "Control total de nuestros equipos en tiempo real desde cualquier lugar",
  },
  {
    empresa: "Bureau Veritas",
    industria: "Certificación",
    videoId: "Ofzj8SsgdDs",
    quote: "Procesos de nómina más eficientes y sin errores",
  },
  {
    empresa: "Virgin Mobile",
    industria: "Telecomunicaciones",
    videoId: "BHXid-4Rlrg",
    quote: "Visibilidad completa del equipo de ventas en terreno",
  },
  {
    empresa: "Toshiba",
    industria: "Tecnología",
    videoId: "P-SDGVuoquM",
    quote: "Automatización que nos ahorra horas de trabajo administrativo",
  },
  {
    empresa: "Energy Fitness",
    industria: "Fitness",
    videoId: "9Ix6xiSH9SY",
    quote: "Gestión simplificada de turnos rotativos",
  },
]

const beneficiosGeoVictoria = [
  {
    icon: TrendingUp,
    titulo: "Reduce errores de nómina",
    descripcion: "Hasta 90% menos errores en cálculos de asistencia",
  },
  {
    icon: Clock,
    titulo: "Ahorra tiempo",
    descripcion: "Automatiza procesos que antes tomaban horas",
  },
  {
    icon: Users,
    titulo: "Control en tiempo real",
    descripcion: "Visibilidad de tu equipo desde cualquier lugar",
  },
  {
    icon: Shield,
    titulo: "Datos seguros",
    descripcion: "Información protegida y respaldada en la nube",
  },
]

const BienvenidaMarketingStep = ({
  nombreEmpresa,
  onContinue,
}: {
  nombreEmpresa?: string
  onContinue: () => void
}) => {
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % casosDeExitoVideos.length)
  }, [setCurrentSlide])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + casosDeExitoVideos.length) % casosDeExitoVideos.length)
  }, [setCurrentSlide])

  return (
    <section className="space-y-8 rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 md:p-8">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/30 mb-2">
          <Rocket className="w-10 h-10 text-white" />
        </div>

        {nombreEmpresa ? (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
              ¡Bienvenido, <span className="text-sky-600">{nombreEmpresa}</span>!
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Estás a punto de unirte a miles de empresas que ya transformaron su gestión de asistencia con GeoVictoria.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
              ¡Bienvenido a <span className="text-sky-600">GeoVictoria</span>!
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Estás a punto de transformar la gestión de asistencia de tu empresa. Miles de organizaciones ya lo
              hicieron.
            </p>
          </>
        )}

        <div className="flex flex-col items-center gap-3 mt-6">
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            Estamos emocionados de acompañarte en este proceso
          </p>
          <Button
            onClick={onContinue}
            size="lg"
            className="bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/30 hover:shadow-xl hover:shadow-sky-600/40 transition-all duration-300 text-base px-8 py-6 rounded-full"
          >
            <Zap className="w-5 h-5 mr-2" />
            Comenzar mi implementación
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Beneficios destacados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {beneficiosGeoVictoria.map((beneficio, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-md hover:border-sky-200 transition-all"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-100 mb-3">
              <beneficio.icon className="w-6 h-6 text-sky-600" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm mb-1">{beneficio.titulo}</h3>
            <p className="text-xs text-slate-500">{beneficio.descripcion}</p>
          </div>
        ))}
      </div>

      {/* Estadísticas de confianza */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-xl p-6 text-white">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl md:text-4xl font-bold">+5,000</p>
            <p className="text-sky-200 text-sm">Empresas activas</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold">+1M</p>
            <p className="text-sky-200 text-sm">Trabajadores gestionados</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold">15+</p>
            <p className="text-sky-200 text-sm">Países en Latam</p>
          </div>
        </div>
      </div>

      {/* Casos de éxito con videos */}
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-slate-800">Empresas que confían en nosotros</h2>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="relative">
            {/* Carrusel de videos */}
            <div className="overflow-hidden rounded-xl">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {casosDeExitoVideos.map((caso, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-2">
                    <div className="space-y-3">
                      {/* Info de la empresa */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-sky-500" />
                          <span className="font-semibold text-slate-800">{caso.empresa}</span>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {caso.industria}
                          </span>
                        </div>
                      </div>

                      {/* Quote */}
                      <p className="text-sm text-slate-600 italic border-l-2 border-sky-300 pl-3">"{caso.quote}"</p>

                      {/* Video de YouTube */}
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-900">
                        <iframe
                          src={`https://www.youtube.com/embed/${caso.videoId}?rel=0`}
                          title={`Caso de éxito: ${caso.empresa}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones de navegación */}
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 bg-white rounded-full p-2 shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors z-10"
              aria-label="Video anterior"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 bg-white rounded-full p-2 shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors z-10"
              aria-label="Video siguiente"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Indicadores */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="flex justify-center gap-1.5">
              {casosDeExitoVideos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? "bg-sky-500" : "bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Ir a video ${index + 1}`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">
              {currentSlide + 1} de {casosDeExitoVideos.length} casos de éxito
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

const AntesDeComenzarStep = ({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) => {
  return (
    <section className="space-y-6 max-w-[1700px] mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-2">
          <CheckCircle2 className="w-8 h-8 text-slate-600" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Antes de comenzar</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Te explicamos brevemente qué información te pediremos para configurar tu plataforma.
        </p>
      </div>

      {/* Qué pediremos - Reorganizado en grid 2x2 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-medium text-slate-900 mb-4">¿Qué información te pediremos?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fila 1 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">
              1
            </div>
            <div>
              <p className="font-medium text-slate-700 text-sm">Datos de tu empresa</p>
              <p className="text-xs text-slate-500">Razón social, RUT, dirección y contacto</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">
              2
            </div>
            <div>
              <p className="font-medium text-slate-700 text-sm">Administrador de la plataforma</p>
              <p className="text-xs text-slate-500">Quien gestionará GeoVictoria en tu empresa</p>
            </div>
          </div>
          {/* Fila 2 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">
              3
            </div>
            <div>
              <p className="font-medium text-slate-700 text-sm">Listado de tus trabajadores</p>
              <p className="text-xs text-slate-500">Nombre, RUT, correo y grupo (puedes pegarlo desde Excel)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">
              4
            </div>
            <div>
              <p className="font-medium text-slate-700 text-sm">Turnos y planificaciones</p>
              <p className="text-xs text-slate-500">Horarios de trabajo, periodos de descanso (opcional por ahora)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mensaje tranquilizador */}
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-emerald-800">No te preocupes si no tienes todo perfecto</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Puedes avanzar con la información que tengas. Al final podrás revisar todo, y siempre podrás hacer
                ajustes más adelante. Tus datos están protegidos y seguros.
              </p>
            </div>
          </div>
        </div>

        {/* Qué tener a mano */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <h2 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            ¿Qué es útil tener a mano?
          </h2>
          <ul className="space-y-2 text-sm text-amber-700">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Datos básicos de la empresa (RUT, Razón Social, Dirección)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Listado de trabajadores (nombre, RUT, correo)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Información general de turnos y horarios
            </li>
          </ul>
        </div>
      </div>

      {/* Tiempo estimado */}
      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
        <Clock className="w-4 h-4" />
        <span>Tiempo estimado: 10-15 minutos</span>
      </div>

      {/* Botón continuar */}
      <div className="flex justify-center items-center gap-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Atrás
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-8 py-3 text-base font-semibold text-white hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/25"
        >
          Entendido, continuar
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  )
}

const DEFAULT_TURNOS = [
  {
    id: 1,
    nombre: "Descanso",
    horaInicio: "",
    horaFin: "",
    colacionMinutos: 0,
    tooltip: "Fin de Semana o Feriado",
    tipoColacion: "sin", // Default to 'sin'
    colacionInicio: "",
    colacionFin: "",
  },
  {
    id: 2,
    nombre: "Libre",
    horaInicio: "",
    horaFin: "",
    colacionMinutos: 0,
    tooltip: "No marca o Artículo 22",
    tipoColacion: "sin", // Default to 'sin'
    colacionInicio: "",
    colacionFin: "",
  },
  {
    id: 3,
    nombre: "Presencial",
    horaInicio: "",
    horaFin: "",
    colacionMinutos: 0,
    tooltip: "Sin planificación",
    tipoColacion: "sin", // Default to 'sin'
    colacionInicio: "",
    colacionFin: "",
  },
]

// Define the Empresa type (assuming it's defined elsewhere or needs to be defined here)
type Empresa = {
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
  grupos: { id: number; nombre: string; descripcion: string }[]
  id_zoho: string | null
}

// Define OnboardingFormData type
type OnboardingFormData = {
  empresa: Empresa
  admins: {
    id: number
    nombre: string
    apellido: string
    rut: string
    email: string
    telefono: string
    grupoId: string
    grupoNombre: string
  }[]
  trabajadores: {
    id: number
    nombre: string
    rut: string
    correo: string
    grupoId: string
    telefono1: string
    telefono2: string
    telefono3: string
    tipo: "usuario" | "administrador"
  }[]
  turnos: {
    id: number
    nombre: string
    horaInicio: string
    horaFin: string
    tipoColacion: "sin" | "libre" | "fija" // Added type for colacion
    colacionMinutos: number
    colacionInicio: string
    colacionFin: string
    tooltip: string
  }[]
  planificaciones: {
    id: number
    nombre: string
    diasTurnos: (number | null)[]
  }[]
  asignaciones: {
    id: number
    trabajadorId: string | number
    planificacionId: string | number
    desde: string
    hasta: string
  }[]
  configureNow: boolean
  loadWorkersNow?: boolean // Added loadWorkersNow to OnboardingFormData
}

// Define EditedFields type
type EditedFields = Record<string, { originalValue: any; currentValue: any }>

function getEmptyEmpresa(): Empresa {
  return {
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
    id_zoho: null,
  }
}

// CHANGE: Adding component function declaration
function OnboardingTurnosCliente() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [grupos, setGrupos] = useState<{ id: number; nombre: string; descripcion: string }[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [formData, setFormData] = useState<OnboardingFormData>({
    empresa: getEmptyEmpresa(),
    admins: [],
    trabajadores: [],
    turnos: DEFAULT_TURNOS,
    planificaciones: [],
    asignaciones: [],
    configureNow: true,
    loadWorkersNow: true,
  })
  const [currentStep, setCurrentStep] = useState(PRIMER_PASO)
  const [navigationHistory, setNavigationHistory] = useState([PRIMER_PASO])
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [prefilledData, setPrefilledData] = useState<any>(null)
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set())
  const [editedFields, setEditedFields] = useState<EditedFields>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [hasToken, setHasToken] = useState(false)
  const [idZoho, setIdZoho] = useState<string | null>(null)
  const [onboardingId, setOnboardingId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const hasInitialized = useRef(false)
  const [showConfirmRestart, setShowConfirmRestart] = useState(false)
  const [noAdminsError, setNoAdminsError] = useState(false)
  const [showResumeMessage, setShowResumeMessage] = useState(false)

  // Mock fetchTokenData function for demonstration purposes
  // In a real application, this would fetch data from an API based on the token.
  const fetchTokenData = async (token: string): Promise<any | null> => {
    console.log("[v0] Mock fetchTokenData called with token:", token)
    // Simulate fetching data based on token
    if (token === "dummy-token-123") {
      return {
        empresa: {
          razonSocial: "Empresa Ejemplo S.A.",
          nombreFantasia: "EmpresaEjemplo",
          rut: "76.123.456-7",
          giro: "Servicios Tecnológicos",
          direccion: "Calle Falsa 123",
          comuna: "Santiago",
          emailFacturacion: "facturacion@ejemplo.com",
          telefonoContacto: "+56987654321",
          sistema: ["GeoVictoria APP"],
          rubro: "1. Agrícola",
          id_zoho: "1234567890",
        },
        admins: [
          {
            id: 1678880000001,
            nombre: "Juan Pérez",
            apellido: "Pérez",
            rut: "12.345.678-9",
            email: "juan.perez@ejemplo.com",
            telefono: "+56911111111",
            grupoId: "",
            grupoNombre: "",
          },
        ],
        trabajadores: [
          {
            id: 1678880000002,
            nombre: "María González",
            rut: "19.234.567-8",
            correo: "maria.gonzalez@ejemplo.com",
            grupoId: "",
            telefono1: "+56922222222",
            telefono2: "",
            telefono3: "",
            tipo: "usuario",
          },
        ],
        turnos: [
          {
            id: 1,
            nombre: "Descanso",
            horaInicio: "",
            horaFin: "",
            tipoColacion: "sin",
            colacionMinutos: 0,
            tooltip: "",
            colacionInicio: "",
            colacionFin: "",
          },
          {
            id: 2,
            nombre: "Libre",
            horaInicio: "",
            horaFin: "",
            tipoColacion: "sin",
            colacionMinutos: 0,
            tooltip: "",
            colacionInicio: "",
            colacionFin: "",
          },
          {
            id: 3,
            nombre: "Turno Normal",
            horaInicio: "09:00",
            horaFin: "18:00",
            tipoColacion: "libre",
            colacionMinutos: 60,
            tooltip: "",
            colacionInicio: "",
            colacionFin: "",
          },
        ],
        planificaciones: [
          { id: 1, nombre: "Lunes a Viernes", diasTurnos: [3, 3, 3, 3, 3, 1, 1] },
          { id: 2, nombre: "Fin de Semana", diasTurnos: [1, 1, 1, 1, 1, 2, 2] },
        ],
        asignaciones: [
          { id: 1, trabajadorId: 1678880000002, planificacionId: 1, desde: "2023-01-01", hasta: "2023-12-31" },
        ],
      }
    }
    // Return null or throw an error if token is invalid or data not found
    return null
  }

  const formDataRef = useRef(formData)
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  const setEmpresa = useCallback((updater: Empresa | ((prev: Empresa) => Empresa)) => {
    setFormData((prev) => ({
      ...prev,
      empresa: typeof updater === "function" ? updater(prev.empresa) : updater,
    }))
  }, [])

  const isFieldPrefilled = useCallback(
    (fieldKey: string): boolean => {
      return prefilledFields.has(fieldKey)
    },
    [prefilledFields],
  )

  const isFieldEdited = useCallback(
    (fieldKey: string): boolean => {
      const fieldEntry = editedFields[fieldKey]
      if (!fieldEntry) return false

      return JSON.stringify(fieldEntry.originalValue) !== JSON.stringify(fieldEntry.currentValue)
    },
    [editedFields],
  )

  const trackFieldChange = useCallback(
    (fieldKey: string, newValue: any) => {
      // Only track changes if the field was prefilled
      if (!prefilledFields.has(fieldKey)) return

      // Dynamically get the current value from formDataRef
      const keys = fieldKey.split(".")
      let originalValue: any = formDataRef.current
      for (const key of keys) {
        originalValue = originalValue?.[key]
        if (originalValue === undefined || originalValue === null) break
      }

      setEditedFields((prev) => {
        const updated = { ...prev }
        if (JSON.stringify(originalValue) !== JSON.stringify(newValue)) {
          updated[fieldKey] = {
            originalValue: originalValue,
            currentValue: newValue,
          }
        } else {
          delete updated[fieldKey] // Remove if reverted to original value
        }
        return updated
      })
    },
    [prefilledFields, setEditedFields],
  )

  const handleFinalizar = useCallback(async () => {
    setIsSubmitting(true)
    setValidationErrors([]) // Clear previous validation errors

    try {
      const newHistory = [...navigationHistory, 11]

      // Marcar como completado en BD
      if (onboardingId) {
        await fetch(`/api/onboarding/${onboardingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formData: formData,
            currentStep: 11,
            navigationHistory: newHistory,
            estado: "completado",
            fecha_completado: new Date().toISOString(),
          }),
        })
        console.log("[v0] handleFinalizar: Onboarding marcado como completado")
      }

      // Preparar payload para Zoho
      const payload = {
        accion: "completado",
        eventType: "complete",
        id_zoho: idZoho,
        fechaHoraEnvio: new Date().toISOString(),
        formData: formData,
        metadata: {
          empresaRut: formData.empresa.rut || "Sin RUT",
          empresaNombre: formData.empresa.razonSocial || formData.empresa.nombreFantasia || "Sin nombre",
          pasoActual: 10,
          pasoNombre: "Resumen",
          totalPasos: steps.length,
          porcentajeProgreso: 100,
        },
        excelFile: null,
      }

      // Enviar a Zoho (fire-and-forget)
      fetch("/api/submit-to-zoho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((error) => {
        console.error("[v0] handleFinalizar: Error enviando a Zoho:", error)
      })

      // Navegar a página de agradecimiento
      setCurrentStep(11)
      setNavigationHistory(newHistory)
      setCompletedSteps((prev) => [...new Set([...prev, currentStep])])
    } catch (error) {
      console.error("[v0] handleFinalizar: Error:", error)
      toast({
        title: "Error",
        description: "Hubo un error al finalizar el onboarding",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    formData,
    idZoho,
    steps.length,
    onboardingId,
    navigationHistory,
    toast,
    currentStep,
    setCompletedSteps,
    setCurrentStep,
    setNavigationHistory,
  ])

  useEffect(() => {
    const initializeOnboarding = async () => {
      const token = searchParams.get("token")

      if (token) {
        console.log("[v0] Initial load: Token found:", token)
        setOnboardingId(token) // El token ES el ID del onboarding
        setHasToken(true)

        try {
          // Cargar datos desde Supabase usando el token como ID
          const response = await fetch(`/api/onboarding/${token}`)

          if (response.ok) {
            const result = await response.json()
            console.log("[v0] Respuesta de BD:", result)
            console.log("[v0] lastStep:", result.lastStep)
            console.log("[v0] lastStep > 1?", result.lastStep && result.lastStep > 1)

            if (result.lastStep && result.lastStep > 1) {
              console.log("[v0] Mostrando mensaje de sesión retomada")
              setShowResumeMessage(true)
              const stepName = steps.find((s) => s.id === result.lastStep)?.label || "donde quedaste"
              console.log("[v0] Step name:", stepName)
              toast({
                title: "¡Bienvenido de vuelta!",
                description: `Continuarás desde el paso "${stepName}". Tus datos anteriores han sido guardados.`,
                duration: 5000,
              })
            } else {
              console.log("[v0] NO se muestra mensaje (lastStep <= 1 o no existe)")
            }

            if (result.success && result.formData) {
              setFormData(result.formData)
              setCurrentStep(result.lastStep || PRIMER_PASO)
              setNavigationHistory(result.navigationHistory || [PRIMER_PASO])

              if (result.formData.empresa?.id_zoho) {
                setIdZoho(result.formData.empresa.id_zoho)
              }

              // Marcar campos prellenados
              const newPrefilledFields = new Set<string>()
              if (result.formData.empresa) {
                Object.keys(result.formData.empresa).forEach((key) => {
                  if (
                    result.formData.empresa[key as keyof Empresa] !== undefined &&
                    result.formData.empresa[key as keyof Empresa] !== ""
                  ) {
                    newPrefilledFields.add(`empresa.${key}`)
                  }
                })
              }
              setPrefilledFields(newPrefilledFields)

              console.log("[v0] Initial load: Loaded step", result.lastStep, "with history", result.navigationHistory)
            }
          } else {
            console.error("[v0] Initial load: Error loading data from BD:", response.status)
            toast({
              title: "Error",
              description: "No se pudieron cargar los datos del onboarding",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("[v0] Initial load: Exception loading data:", error)
          toast({
            title: "Error",
            description: "Error al conectar con la base de datos",
            variant: "destructive",
          })
        }
      } else {
        console.log("[v0] Initial load: No token found in URL")
      }

      setIsInitialized(true)
    }

    if (!hasInitialized.current) {
      initializeOnboarding()
      hasInitialized.current = true
    }
  }, [searchParams, toast])

  // (Comentado el useEffect de auto-save que guardaba cada 60 segundos)

  const ensureGrupoByName = useCallback(
    (groupName: string): string => {
      const trimmedName = groupName.trim()
      if (!trimmedName) return ""

      const existingGroup = grupos.find((g) => g.nombre.toLowerCase() === trimmedName.toLowerCase())
      if (existingGroup) {
        return existingGroup.id.toString() // Return existing group ID
      } else {
        // Create a new group
        const newGroup = {
          id: Date.now(), // Simple ID generation
          nombre: trimmedName,
          descripcion: "",
        }
        setGrupos((prev) => [...prev, newGroup])
        return newGroup.id.toString() // Return new group ID
      }
    },
    [grupos, setGrupos],
  )

  const handleCreateGroup = useCallback(
    (groupName: string) => {
      ensureGrupoByName(groupName)
    },
    [ensureGrupoByName],
  )

  const handleGrupoSelect = useCallback(
    (trabajadorId: number, grupoId: string) => {
      setTrabajadores((prev) => prev.map((t) => (t.id === trabajadorId ? { ...t, grupoId: grupoId } : t)))
      // If the group name is new, create it.
      if (grupoId && !grupos.some((g) => g.id === Number(grupoId))) {
        handleCreateGroup(grupoId) // Assuming you'd pass the name here if needed differently
      }
    },
    [setTrabajadores, grupos, handleCreateGroup],
  )

  const removeAdmin = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      admins: prev.admins.filter((_, index) => index !== indexToRemove),
    }))
  }

  // Navigation Buttons Component
  const NavigationButtons = ({
    showBack = true,
    showNext = true,
    nextLabel = "Siguiente",
  }: {
    showBack?: boolean
    showNext?: boolean
    nextLabel?: string
  }) => (
    <div className="flex justify-center items-center gap-4 py-6">
      {showBack && navigationHistory.length > 1 && (
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Atrás
        </button>
      )}
      {showNext && (
        <button
          type="button"
          onClick={goNext}
          className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-8 py-3 text-base font-semibold text-white hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/25"
        >
          {nextLabel}
          <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  )

  const goNext = useCallback(async () => {
    const nextStep = currentStep + 1
    const newHistory = [...navigationHistory, nextStep]

    // Basic validation before moving to the next step
    let isValid = true
    const errors: string[] = []
    const stepErrors: Record<string, string> = {}

    switch (currentStep) {
      case 0: // Bienvenida - No validation needed
        break
      case 1: // Antes de comenzar - No validation needed
        break
      case 2: // Empresa
        const empresaValidation = validateEmpresaFields(formData.empresa)
        if (!empresaValidation.isValid) {
          isValid = false
          errors.push(...empresaValidation.errors)
          empresaValidation.errors.forEach((err) => {
            const fieldKey = `empresa.${err.split(" ")[0].toLowerCase().replace(":", "")}` // Simple mapping, remove colon
            stepErrors[fieldKey] = `Campo inválido: ${err}`
          })
        }
        break
      case 3: // Admin
        const adminValidation = validateAdminsFields(formData.admins)
        if (!adminValidation.isValid) {
          isValid = false
          errors.push(...adminValidation.errors)
          setNoAdminsError(true) // Specific error for no admins
        } else {
          setNoAdminsError(false)
        }
        break
      case 4: // Decision - Handled by onDecision callback
        return // This step has its own navigation logic
      case 5: // Trabajadores
        // Simple validation: check if there are workers
        if (formData.trabajadores.length === 0) {
          isValid = false
          errors.push("Debes agregar al menos un trabajador.")
        }
        break
      case 6: // Configuration - This step might skip steps based on user input.
        // The navigation here is complex and depends on the `configureNow` flag.
        // We'll handle this directly when the `DecisionStep` is rendered.
        return // No direct 'next' button from here in the traditional sense.
      case 7: // Turnos
        if (formData.turnos.length <= 1) {
          // Checking if only default turns exist
          // Allow proceeding even if no custom turns are added, if default 'libre' exists.
          // Ensure default turns are present.
          if (!DEFAULT_TURNOS.some((t) => t.nombre.toLowerCase() === "libre")) {
            isValid = false
            errors.push("Debes tener al menos un turno definido, idealmente uno 'Libre' o 'Descanso'.")
          }
        }
        break
      case 8: // Planificaciones
        if (formData.turnos.length > 0 && formData.planificaciones.length === 0) {
          isValid = false
          errors.push("Debes crear al menos una planificación para continuar.")
        }
        break
      case 9: // Asignaciones
        const workersWithoutAssignment = formData.trabajadores.filter(
          (t) => !formData.asignaciones.some((a) => a.trabajadorId === t.id && a.planificacionId && a.desde && a.hasta),
        )
        if (workersWithoutAssignment.length > 0) {
          isValid = false
          errors.push("Todos los trabajadores deben tener una asignación de planificación válida.")
        }
        break
      case 10: // Resumen - Handled by handleFinalizar
        return // This step has its own finalization logic
      default:
        break
    }

    if (!isValid) {
      setValidationErrors(errors)
      setFieldErrors(stepErrors) // Set step-specific field errors
      toast({
        title: "Campos inválidos",
        description: "Por favor, corrige los errores en los campos marcados.",
        variant: "destructive",
      })
      return
    }

    if (onboardingId) {
      try {
        console.log("[v0] goNext: Guardando avance en BD", {
          step: nextStep,
          onboardingId,
        })

        const response = await fetch(`/api/onboarding/${onboardingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formData: formData,
            currentStep: nextStep,
            navigationHistory: newHistory,
            estado: "en_progreso",
          }),
        })

        if (!response.ok) {
          console.error("[v0] goNext: Error guardando en BD", await response.text())
          toast({
            title: "Error al guardar",
            description: "No se pudo guardar el progreso, pero puedes continuar.",
            variant: "destructive",
          })
        } else {
          console.log("[v0] goNext: Guardado exitoso en BD")
        }
      } catch (error) {
        console.error("[v0] goNext: Error en fetch:", error)
        toast({
          title: "Error de conexión",
          description: "No se pudo conectar con el servidor.",
          variant: "destructive",
        })
      }
    } else {
      console.warn("[v0] goNext: No hay onboardingId, no se guardó en BD")
    }

    // If valid, proceed
    setCurrentStep(nextStep)
    setNavigationHistory(newHistory)
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])])
  }, [
    currentStep,
    formData,
    navigationHistory,
    onboardingId, // Agregado a dependencias
    setCompletedSteps,
    setCurrentStep,
    setNavigationHistory,
    setValidationErrors,
    setFieldErrors,
    toast,
    setNoAdminsError,
    setGrupos,
  ])

  const goBack = useCallback(() => {
    if (navigationHistory.length <= 1) return // Cannot go back further than the first step

    const previousStep = navigationHistory[navigationHistory.length - 2]
    setNavigationHistory((prev) => prev.slice(0, -1)) // Remove current step from history
    setCurrentStep(previousStep)
  }, [navigationHistory, setCurrentStep, setNavigationHistory])

  // Helper to get the current step component
  const renderStepContent = () => {
    // Initial loading state
    if (!isInitialized) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <p>Cargando...</p>
        </div>
      )
    }

    // Render based on currentStep
    switch (currentStep) {
      case 0:
        return <BienvenidaMarketingStep onContinue={goNext} nombreEmpresa={formData.empresa.nombreFantasia} />
      case 1:
        return <AntesDeComenzarStep onContinue={goNext} onBack={goBack} />
      case 2:
        return (
          <>
            <EmpresaStep
              empresa={formData.empresa}
              setEmpresa={setEmpresa}
              prefilledFields={prefilledFields}
              isFieldPrefilled={isFieldPrefilled}
              isFieldEdited={isFieldEdited}
              trackFieldChange={trackFieldChange}
              fieldErrors={Object.keys(fieldErrors).reduce(
                (acc, key) => {
                  if (key.startsWith("empresa.")) {
                    acc[key] = fieldErrors[key]
                  }
                  return acc
                },
                {} as Record<string, string>,
              )}
            />
            <NavigationButtons />
          </>
        )
      case 3:
        return (
          <>
            <AdminStep
              admins={formData.admins}
              setAdmins={(newAdmins) => setFormData((prev) => ({ ...prev, admins: newAdmins }))}
              grupos={formData.empresa.grupos} // Pass company groups
              ensureGrupoByName={ensureGrupoByName}
              onRemoveAdmin={removeAdmin}
              isEditMode={false} // Assuming this is initial setup, not edit mode
            />
            <NavigationButtons />
          </>
        )
      case 4: // Decision Step: Load workers now or later?
        return <WorkersDecisionStep onDecision={handleWorkersDecision} />
      case 5: // Trabajadores Step (if loading now)
        return (
          <>
            <TrabajadoresStep
              trabajadores={trabajadores} // Use the state variable directly
              setTrabajadores={setTrabajadores} // Use the state setter directly
              grupos={formData.empresa.grupos}
              setGrupos={(newGrupos) =>
                setFormData((prev) => ({
                  ...prev,
                  empresa: { ...prev.empresa, grupos: newGrupos },
                }))
              }
              errorGlobal={validationErrors.join(" ")}
              ensureGrupoByName={ensureGrupoByName}
            />
            <NavigationButtons />
          </>
        )
      case 6: // Skip workers loading - proceed to configuration decision
        return (
          <DecisionStep
            onDecision={handleConfigurationDecision} // This function decides whether to configure now or later
          />
        )
      case 7: // Turnos
        return (
          <>
            <TurnosStep
              turnos={formData.turnos}
              setTurnos={(newTurnos) => setFormData((prev) => ({ ...prev, turnos: newTurnos }))}
            />
            <NavigationButtons />
          </>
        )
      case 8: // Planificaciones
        return (
          <>
            <PlanificacionesStep
              planificaciones={formData.planificaciones}
              setPlanificaciones={(newPlanificaciones) =>
                setFormData((prev) => ({ ...prev, planificaciones: newPlanificaciones }))
              }
              turnos={formData.turnos}
            />
            <NavigationButtons />
          </>
        )
      case 9: // Asignaciones
        return (
          <>
            <AsignacionStep
              asignaciones={formData.asignaciones}
              setAsignaciones={(newAsignaciones) => setFormData((prev) => ({ ...prev, asignaciones: newAsignaciones }))}
              trabajadores={trabajadores} // Use the state variable directly
              planificaciones={formData.planificaciones}
              grupos={formData.empresa.grupos}
              errorGlobal={validationErrors.join(" ")}
            />
            <NavigationButtons />
          </>
        )
      case 10: // Resumen
        return (
          <section className="space-y-6">
            <header>
              <h2 className="text-lg font-semibold text-slate-900">Resumen</h2>
              <p className="mt-1 text-sm text-slate-600">
                ¡Casi terminamos! Revisa los datos ingresados antes de finalizar.
              </p>
            </header>
            {/* Display summary of entered data */}
            <div className="grid gap-6">
              {/* Empresa */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Empresa</h3>
                <p>
                  <strong>Razón Social:</strong> {formData.empresa.razonSocial}
                </p>
                <p>
                  <strong>Nombre Fantasía:</strong> {formData.empresa.nombreFantasia}
                </p>
                <p>
                  <strong>RUT:</strong> {formData.empresa.rut}
                </p>
                <p>
                  <strong>Giro:</strong> {formData.empresa.giro}
                </p>
                <p>
                  <strong>Dirección:</strong> {formData.empresa.direccion}, {formData.empresa.comuna}
                </p>
                <p>
                  <strong>Email Facturación:</strong> {formData.empresa.emailFacturacion}
                </p>
                <p>
                  <strong>Teléfono Contacto:</strong> {formData.empresa.telefonoContacto}
                </p>
                <p>
                  <strong>Sistema(s):</strong> {formData.empresa.sistema.join(", ") || "No seleccionado"}
                </p>
                <p>
                  <strong>Rubro:</strong> {formData.empresa.rubro || "No seleccionado"}
                </p>
              </div>

              {/* Administradores */}
              {formData.admins.length > 0 && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Administradores</h3>
                  <ul>
                    {formData.admins.map((admin, index) => (
                      <li key={admin.id || index} className="mb-2 text-sm">
                        <strong>{admin.nombre}</strong> (RUT: {admin.rut}, Email: {admin.email}, Tel: {admin.telefono}){" "}
                        {admin.grupoNombre && `[${admin.grupoNombre}]`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trabajadores */}
              {trabajadores.length > 0 && ( // Use the state variable directly
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Trabajadores ({trabajadores.length})</h3>
                  <p className="text-sm">
                    (Detalle completo se puede ver en el paso de Trabajadores)
                    {/* Optionally display a few worker names */}
                  </p>
                </div>
              )}

              {/* Grupos */}
              {formData.empresa.grupos.length > 0 && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Grupos ({formData.empresa.grupos.length})</h3>
                  <ul>
                    {formData.empresa.grupos.map((grupo) => (
                      <li key={grupo.id} className="mb-1 text-sm">
                        <strong>{grupo.nombre}</strong>
                        {grupo.descripcion && `: ${grupo.descripcion}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Turnos */}
              {formData.turnos.filter(
                (t) => t.nombre.toLowerCase() !== "descanso" && t.nombre.toLowerCase() !== "libre",
              ).length > 0 && ( // Exclude default 'Descanso' and 'Libre' for cleaner summary
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Turnos definidos</h3>
                  <ul>
                    {formData.turnos
                      .filter((t) => t.nombre.toLowerCase() !== "descanso" && t.nombre.toLowerCase() !== "libre")
                      .map((turno) => (
                        <li key={turno.id} className="mb-2 text-sm">
                          <strong>{turno.nombre}</strong>: {turno.horaInicio} - {turno.horaFin}
                          {turno.tipoColacion !== "sin" && (
                            <span>
                              {" ("}
                              {turno.tipoColacion === "libre"
                                ? `${turno.colacionMinutos} min libre`
                                : `${turno.colacionInicio} - ${turno.colacionFin} fija`}
                              {")"}
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Planificaciones */}
              {formData.planificaciones.length > 0 && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Planificaciones ({formData.planificaciones.length})
                  </h3>
                  <ul>
                    {formData.planificaciones.map((plan) => (
                      <li key={plan.id} className="mb-2 text-sm">
                        <strong>{plan.nombre}</strong>
                        {/* Optionally show assigned turns */}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Asignaciones */}
              {formData.asignaciones.length > 0 && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Asignaciones ({formData.asignaciones.length})
                  </h3>
                  <p className="text-sm">(Detalle completo se puede ver en el paso de Asignaciones)</p>
                </div>
              )}
            </div>
            <div className="flex justify-center items-center gap-4 py-6">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
                Atrás
              </button>
              <button
                type="button"
                onClick={handleFinalizar}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 text-base font-semibold text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
              >
                Confirmar y Enviar
                <Check className="w-5 h-5" />
              </button>
            </div>
          </section>
        )
      case 11: // Agradecimiento
        return (
          <section className="space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 mx-auto">
              <Check className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
              ¡Felicidades, {formData.empresa.nombreFantasia || "empresa"}!
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Tu configuración inicial de GeoVictoria está completa. Te contactaremos pronto para agendar tu
              capacitación y resolver cualquier duda.
            </p>
            <p className="text-sm text-slate-500 mt-4">
              Mientras tanto, puedes explorar la plataforma o visitar nuestro{" "}
              <a href="/soporte" className="text-sky-600 hover:underline">
                centro de ayuda
              </a>
              .
            </p>
            <div className="mt-8">
              <Button
                size="lg"
                className="bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/30 hover:shadow-xl hover:shadow-sky-600/40 transition-all duration-300 text-base px-8 py-6 rounded-full"
                onClick={() => (window.location.href = "/dashboard")} // Redirect to dashboard or relevant page
              >
                Ir a mi cuenta
              </Button>
            </div>
          </section>
        )
      default:
        return <p>Paso no encontrado.</p>
    }
  }

  // These handlers were moved inside the main component to resolve undeclared variable errors.
  // They now correctly reference the state setters defined within the component.
  const handleWorkersDecision = (decision: "now" | "later") => {
    if (decision === "now") {
      goNext() // Proceed to the TrabajadoresStep
    } else {
      // Skip TrabajadoresStep and go directly to the Configuration DecisionStep
      setCurrentStep(6) // Corresponds to DecisionStep
      setNavigationHistory((prev) => [...prev, 6])
      setCompletedSteps((prev) => [...prev, currentStep])
    }
  }

  const handleConfigurationDecision = (decision: "now" | "later") => {
    if (decision === "now") {
      goNext() // Proceed to TurnosStep
    } else {
      // Skip Turnos, Planificaciones, Asignaciones and go directly to Resumen
      setCurrentStep(10)
      setNavigationHistory((prev) => [...prev.slice(0, -1), 10]) // Replace current step in history
      setCompletedSteps((prev) => [...new Set([...prev, currentStep, 7, 8, 9])]) // Mark skipped steps as completed
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="sticky top-0 z-20 bg-white border-b border-slate-200 py-4 px-6 md:px-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-geovictoria.svg" alt="GeoVictoria Logo" className="h-8 w-auto" />
            <h1 className="text-lg font-bold text-slate-800">Configuración Inicial</h1>
          </div>
        </div>
        <div className="mt-4">
          <Stepper currentStep={currentStep} />
        </div>
      </nav>

      <main className="flex-1 container mx-auto py-8 px-6 md:px-12">{renderStepContent()}</main>
    </div>
  )
}

// CHANGE: Adding export default for deployment
export default OnboardingTurnosCliente
