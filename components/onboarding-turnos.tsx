"use client"

import React from "react"

import { useState, useEffect } from "react"
import {
  Building2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Shield,
  Rocket,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Award,
  Heart,
  Zap,
  Info,
} from "lucide-react"
import * as XLSX from "xlsx"
import { useSearchParams } from "next/navigation"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card" // Import added
// import { useOnboardingPersistence } from "@/hooks/use-onboarding-persistence"
// import { useDataProtection } from "@/hooks/use-data-protection"

const steps = [
  { id: 0, label: "Bienvenida", description: "Comienza aquí" },
  { id: 1, label: "Antes de comenzar", description: "Información del proceso" },
  { id: 2, label: "Empresa", description: "Datos base de la empresa" },
  { id: 3, label: "Admin", description: "Encargado de la plataforma" },
  { id: 4, label: "Trabajadores", description: "Listado inicial" },
  { id: 5, label: "Configuración", description: "Decidir qué configurar" },
  { id: 6, label: "Turnos", description: "Definición de turnos" },
  { id: 7, label: "Planificaciones", description: "Tipos de planificación semanal" },
  { id: 8, label: "Asignaciones", description: "Asignar planificaciones a trabajadores" },
  { id: 9, label: "Resumen", description: "Revisión final" },
]

// Si se agregan pasos al inicio, cambiar este valor
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

const AdminStep = ({ admins, setAdmins, grupos, ensureGrupoByName }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    email: "",
    telefono: "",
    grupo: "",
  })

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const addAdmin = () => {
    // Validar que al menos el nombre esté completo
    if (!formData.nombre.trim()) {
      alert("Por favor ingresa el nombre del administrador")
      return
    }

    // Crear el grupo si es nuevo
    let grupoId = ""
    if (formData.grupo.trim()) {
      grupoId = ensureGrupoByName(formData.grupo.trim())
    }

    // Agregar el administrador
    setAdmins([
      ...admins,
      {
        id: Date.now(),
        nombre: formData.nombre,
        rut: formData.rut,
        email: formData.email,
        telefono: formData.telefono,
        grupoId: grupoId,
        grupoNombre: formData.grupo,
      },
    ])

    // Limpiar el formulario
    setFormData({
      nombre: "",
      rut: "",
      email: "",
      telefono: "",
      grupo: "",
    })
  }

  const removeAdmin = (id) => {
    setAdmins(admins.filter((admin) => admin.id !== id))
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Administrador de la plataforma</h2>
        <p className="text-sm text-slate-600 mt-1">
          El administrador es la persona que tendrá acceso completo a GeoVictoria para gestionar la asistencia,
          configurar turnos, administrar trabajadores y generar reportes de tu empresa.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Puede ser el encargado de RRHH, jefe de operaciones o quien será responsable del control de asistencia.
        </p>
      </header>

      {/* Formulario único */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Datos del administrador</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <label className="font-medium">Nombre completo</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              value={formData.nombre}
              onChange={(e) => handleFormChange("nombre", e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium inline-flex items-center gap-1">
              RUT
              <span className="group relative">
                <svg
                  className="h-3.5 w-3.5 text-slate-400 cursor-help"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="invisible group-hover:visible absolute left-0 top-5 z-10 w-48 rounded-lg bg-slate-800 px-2 py-1.5 text-[10px] text-white shadow-lg">
                  Sin puntos y con guión. Ejemplo: 12345678-9
                </span>
              </span>
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              value={formData.rut}
              onChange={(e) => handleFormChange("rut", e.target.value)}
              placeholder="12345678-9"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium inline-flex items-center gap-1">
              Correo
              <span className="group relative">
                <svg
                  className="h-3.5 w-3.5 text-slate-400 cursor-help"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="invisible group-hover:visible absolute left-0 top-5 z-10 w-48 rounded-lg bg-slate-800 px-2 py-1.5 text-[10px] text-white shadow-lg">
                  Formato: usuario@dominio.com
                </span>
              </span>
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              placeholder="admin@empresa.com"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium inline-flex items-center gap-1">
              Teléfono
              <span className="group relative">
                <svg
                  className="h-3.5 w-3.5 text-slate-400 cursor-help"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="invisible group-hover:visible absolute left-0 top-5 z-10 w-48 rounded-lg bg-slate-800 px-2 py-1.5 text-[10px] text-white shadow-lg">
                  Formato: +56 9 1234 5678 (con código país)
                </span>
              </span>
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="tel"
              value={formData.telefono}
              onChange={(e) => handleFormChange("telefono", e.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div className="space-y-1 text-sm md:col-span-2">
            <label className="font-medium inline-flex items-center gap-1">
              Grupo
              <span className="group relative">
                <svg
                  className="h-3.5 w-3.5 text-slate-400 cursor-help"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="invisible group-hover:visible absolute left-0 top-5 z-10 w-56 rounded-lg bg-slate-800 px-2 py-1.5 text-[10px] text-white shadow-lg">
                  Los grupos permiten organizar trabajadores por equipos, sucursales o departamentos. Ejemplo: Ventas,
                  Bodega, Sucursal Centro
                </span>
              </span>
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              value={formData.grupo}
              onChange={(e) => handleFormChange("grupo", e.target.value)}
              placeholder="Ej: Gerencia, Administración, etc."
            />
          </div>
        </div>
        <button
          type="button"
          onClick={addAdmin}
          className="mt-4 w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          + Agregar administrador
        </button>
      </div>

      {/* Listado de administradores */}
      {admins.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Administradores agregados ({admins.length})</h3>
          <div className="space-y-2">
            {admins.map((admin, index) => (
              <div
                key={admin.id}
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
                  onClick={() => removeAdmin(admin.id)}
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
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-500">No hay administradores agregados aún</p>
          <p className="text-xs text-slate-400 mt-1">
            Completa el formulario arriba para agregar el primer administrador
          </p>
        </div>
      )}
    </section>
  )
}

const EmpresaStep = ({ empresa, setEmpresa, prefilledFields, isFieldPrefilled, isFieldEdited, trackFieldChange }) => {
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
    "SALUD",
    "EDUCACIÓN",
    "BANCA Y FINANZAS",
    "MANUFACTURA",
    "DISTRIBUCIÓN",
    "TRANSPORTE",
    "MINERÍA",
    "LEASING AUTOMOTRIZ",
    "MANTENCIÓN TÉCNICA",
    "SERVICIOS BÁSICOS",
    "GOBIERNO",
    "OUTSOURCING SEGURIDAD",
    "OUTSOURCING SERVICIOS GENERALES",
    "OUTSOURCING RETAIL",
    "RETAIL GRANDES TIENDAS",
    "RETAIL PEQUEÑO",
    "AGRICULTURA",
    "ACUICULTURA",
    "ENTRETENIMIENTO Y TURISMO",
    "GIMNASIOS",
    "HOTELERÍA Y GASTRONOMÍA",
    "CONSULTORÍA",
    "SERVICIO AL CLIENTE",
    "CONSTRUCCIÓN",
  ]

  const [isEditing, setIsEditing] = useState(false)
  const hasPrefilled = prefilledFields.size > 0

  const handleEmpresaChange = (e) => {
    const { name, value } = e.target
    setEmpresa({ ...empresa, [name]: value })
    if (isFieldPrefilled(`empresa.${name}`)) {
      trackFieldChange(`empresa.${name}`, value)
    }
  }

  const handleSistemaChange = (sistemaValue) => {
    const currentSistemas = empresa.sistema || []
    const isSelected = currentSistemas.includes(sistemaValue)

    const newSistemas = isSelected
      ? currentSistemas.filter((s) => s !== sistemaValue)
      : [...currentSistemas, sistemaValue]

    setEmpresa({ ...empresa, sistema: newSistemas })
    if (isFieldPrefilled("empresa.sistema")) {
      trackFieldChange("empresa.sistema", newSistemas)
    }
  }

  const ProtectedInput = ({
    name,
    label,
    type = "text",
    placeholder,
  }: {
    name: string
    label: string
    type?: string
    placeholder?: string
  }) => {
    const fieldKey = `empresa.${name}`
    const isPrefilled = isFieldPrefilled(fieldKey)
    const wasEdited = isFieldEdited(fieldKey)
    const value = empresa[name] || ""
    const isLocked = hasPrefilled && !isEditing && isPrefilled && !wasEdited

    return (
      <div className="space-y-1 text-sm">
        <label className="font-medium flex items-center gap-2">
          {label}
          {isPrefilled && wasEdited && (
            <span className="text-xs bg-warning-muted text-warning-foreground px-1.5 py-0.5 rounded">Editado</span>
          )}
        </label>
        {isLocked ? (
          <div className="rounded-xl border border-info-border bg-info-muted px-3 py-2 text-sm text-slate-700">
            {value || <span className="text-slate-400 italic">Sin valor</span>}
          </div>
        ) : (
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-1 focus:ring-info"
            type={type}
            name={name}
            value={value}
            onChange={handleEmpresaChange}
            placeholder={placeholder}
          />
        )}
      </div>
    )
  }

  const ProtectedRubroSelect = () => {
    const fieldKey = "empresa.rubro"
    const isPrefilled = isFieldPrefilled(fieldKey)
    const wasEdited = isFieldEdited(fieldKey)
    const value = empresa.rubro || ""
    const isLocked = hasPrefilled && !isEditing && isPrefilled && !wasEdited

    return (
      <div className="space-y-1 text-sm">
        <label className="font-medium flex items-center gap-2">
          Rubro
          {isPrefilled && wasEdited && (
            <span className="text-xs bg-warning-muted text-warning-foreground px-1.5 py-0.5 rounded">Editado</span>
          )}
        </label>
        {isLocked ? (
          <div className="rounded-xl border border-info-border bg-info-muted px-3 py-2 text-sm text-slate-700">
            {value || <span className="text-slate-400 italic">Sin valor</span>}
          </div>
        ) : (
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-1 focus:ring-info"
            name="rubro"
            value={value}
            onChange={handleEmpresaChange}
          >
            <option value="">Seleccionar rubro...</option>
            {RUBROS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
      </div>
    )
  }

  const ProtectedSistemas = () => {
    const fieldKey = "empresa.sistema"
    const isPrefilled = isFieldPrefilled(fieldKey)
    const wasEdited = isFieldEdited(fieldKey)
    const selectedSistemas = empresa.sistema || []
    const isLocked = hasPrefilled && !isEditing && isPrefilled && !wasEdited

    return (
      <div className="space-y-2 text-sm col-span-2">
        <label className="font-medium flex items-center gap-2">
          Sistema de marcaje
          {isPrefilled && wasEdited && (
            <span className="text-xs bg-warning-muted text-warning-foreground px-1.5 py-0.5 rounded">Editado</span>
          )}
        </label>
        {isLocked ? (
          <div className="rounded-xl border border-info-border bg-info-muted px-3 py-2 text-sm text-slate-700">
            {selectedSistemas.length > 0 ? (
              selectedSistemas.join(", ")
            ) : (
              <span className="text-slate-400 italic">Sin sistemas seleccionados</span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {SISTEMAS.map((s) => {
              const info = SISTEMAS_INFO[s]
              const isSelected = selectedSistemas.includes(s)
              const shortName = s.replace("GeoVictoria ", "")

              return (
                <HoverCard key={s} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <label
                      className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border-2 transition-all whitespace-nowrap ${
                        isSelected
                          ? "border-sky-500 bg-sky-50"
                          : "border-slate-200 hover:border-sky-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSistemaChange(s)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-sm font-medium">{shortName}</span>
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                    </label>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-72" side="top">
                    <div className="space-y-3">
                      <img
                        src={info.imagen || "/placeholder.svg"}
                        alt={info.titulo}
                        className="w-full h-32 object-contain rounded-lg bg-slate-50"
                      />
                      <div>
                        <h4 className="font-semibold text-sm">{info.titulo}</h4>
                        <p className="text-xs text-slate-600 mt-1">{info.descripcion}</p>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="space-y-6">
      {hasPrefilled && (
        <div className="rounded-xl border border-info-border bg-info-muted p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-info-foreground">Datos de su empresa</h4>
                <p className="text-sm text-info-foreground mt-1">
                  {isEditing
                    ? "Puede modificar los campos que necesite. Los cambios quedarán registrados."
                    : 'Verifique que la información sea correcta. Si necesita hacer cambios, haga clic en "Editar datos".'}
                </p>
              </div>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-sky-300 bg-white hover:bg-sky-100 text-sky-700 text-sm font-medium transition-colors flex-shrink-0"
              >
                <Edit2 className="h-4 w-4" />
                Editar datos
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Building2 className="h-5 w-5 text-sky-600" />
          Datos de la empresa
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <ProtectedInput name="razonSocial" label="Razón Social" placeholder="Ej: EDALTEC LTDA" />
          <ProtectedInput name="nombreFantasia" label="Nombre de fantasía" placeholder="Ej: EDALTEC" />
          <ProtectedInput name="rut" label="RUT" placeholder="Ej: 76.201.998-1" />
          <ProtectedInput name="giro" label="Giro" placeholder="Ej: Comercializadora de equipos" />
          <ProtectedInput name="direccion" label="Dirección" placeholder="Ej: Chiloé 5138" />
          <ProtectedInput name="comuna" label="Comuna" placeholder="Ej: San Miguel" />
          <ProtectedInput
            name="emailFacturacion"
            label="Email de facturación"
            type="email"
            placeholder="Ej: marcelo.vargas@edaltec.cl"
          />
          <ProtectedInput
            name="telefonoContacto"
            label="Teléfono de contacto"
            type="tel"
            placeholder="Ej: 56995925655"
          />
          <ProtectedSistemas />
          <ProtectedRubroSelect />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between" />
        <div className="space-y-2" />
      </div>
    </section>
  )
}

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
  }, [bulkText, trabajadores, setTrabajadores, ensureGrupoByName]) // Added ensureGrupoByName to dependency array

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
                      placeholder="correo@empresa.cl"
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
    colacionMinutos: 0,
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
      },
    ])

    // Limpiar el formulario
    setFormTurno({
      nombre: "",
      horaInicio: "",
      horaFin: "",
      colacionMinutos: 0,
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

        <div className="space-y-1 text-sm">
          <label className="font-medium">Tiempo de colación (minutos)</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            type="number"
            value={formTurno.colacionMinutos}
            onChange={(e) => setFormTurno({ ...formTurno, colacionMinutos: Number.parseInt(e.target.value) || 0 })}
            placeholder="Ej: 30, 60"
            min="0"
          />
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
                    {turno.colacionMinutos > 0 && (
                      <span>
                        <strong>Colación:</strong> {turno.colacionMinutos} min
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

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

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

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const updateDiaTurno = (dayIndex, turnoId) => {
    const nuevosDias = [...formData.diasTurnos]
    nuevosDias[dayIndex] = turnoId
    setFormData({ ...formData, diasTurnos: nuevosDias })
  }

  const addPlanificacion = () => {
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
  }

  const removePlanificacion = (id) => {
    setPlanificaciones(planificaciones.filter((p) => p.id !== id))
  }

  const verificarPlanificacionCompleta = (diasTurnos) => {
    return diasTurnos.every((turnoId) => turnoId !== null && turnoId !== "")
  }

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

  const updateAsignacion = (id, field, value) => {
    const updated = asignaciones.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    setAsignaciones(updated)
  }

  const addAsignacion = () => {
    setAsignaciones([...asignaciones, { id: Date.now(), trabajadorId: "", planificacionId: "", desde: "", hasta: "" }])
  }

  const removeAsignacion = (id) => {
    if (asignaciones.length === 1) return
    setAsignaciones(asignaciones.filter((a) => a.id !== id))
  }

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

  const toggleTrabajadorSeleccionado = (id) => {
    setSelectedTrabajadoresIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const seleccionarTodos = () => {
    const ids = trabajadoresFiltrados.map((t) => t.id)
    setSelectedTrabajadoresIds(ids)
  }

  const limpiarSeleccion = () => {
    setSelectedTrabajadoresIds([])
  }

  const crearAsignacionesMasivas = () => {
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

    setAsignaciones([...asignaciones, ...nuevas])
    setBulkError("")
    setSelectedTrabajadoresIds([])
  }

  const getPlanificacionLabelForTrabajador = (trabajadorId) => {
    const asignacionValida = asignaciones.find(
      (a) => a.trabajadorId === trabajadorId && a.planificacionId && a.desde && a.hasta,
    )
    if (!asignacionValida) return null
    const plan = planificaciones.find((p) => p.id === asignacionValida.planificacionId)
    return plan ? plan.nombre || "Sin nombre" : null
  }

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
          Total de trabajadores: <span className="font-semibold">{totalTrabajadores}</span>
        </p>
        <p className="text-[11px] text-slate-700">
          Trabajadores sin planificación válida:{" "}
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
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false) // unused variable

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % casosDeExitoVideos.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + casosDeExitoVideos.length) % casosDeExitoVideos.length)
  }

  return (
    <section className="space-y-8 rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 md:p-8">
      {/* Header personalizado */}
      <div className="text-center space-y-4">
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

      {/* Call to action */}
      <div className="text-center space-y-4 pt-4">
        <p className="text-slate-600">
          <Heart className="w-4 h-4 inline text-red-400 mr-1" />
          Estamos emocionados de acompañarte en este proceso
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-sky-600 px-10 py-4 text-lg font-semibold text-white hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40"
        >
          <Zap className="w-5 h-5" />
          Comenzar mi implementación
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  )
}

const AntesDeComenzarStep = ({ onContinue }: { onContinue: () => void }) => {
  return (
    <section className="space-y-6 max-w-2xl mx-auto">
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

      {/* Qué pediremos */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-medium text-slate-900 mb-4">¿Qué información te pediremos?</h3>
        <div className="space-y-3">
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

      {/* Mensaje tranquilizador */}
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 space-y-2">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-emerald-800">No te preocupes si no tienes todo perfecto</h3>
            <p className="text-sm text-emerald-700 mt-1">
              Puedes avanzar con la información que tengas. Al final podrás revisar todo, y siempre podrás hacer ajustes
              más adelante. Tus datos están protegidos y seguros.
            </p>
          </div>
        </div>
      </div>

      {/* Qué tener a mano */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 space-y-3">
        <h2 className="font-semibold text-amber-800 flex items-center gap-2">
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
            Listado de trabajadores (nombre, RUT, correo) - puede ser en borrador
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Información general de turnos y horarios (si ya los tienes definidos)
          </li>
        </ul>
      </div>

      {/* Tiempo estimado */}
      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
        <Clock className="w-4 h-4" />
        <span>Tiempo estimado: 10-15 minutos</span>
      </div>

      {/* Botón continuar */}
      <div className="flex justify-center py-4">
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

export default function OnboardingTurnos({}) {
  const searchParams = useSearchParams()

  // Estados principales
  const [currentStep, setCurrentStep] = useState(PRIMER_PASO)
  const [isLoadingToken, setIsLoadingToken] = useState(false)
  const [prefilledData, setPrefilledData] = useState<Record<string, unknown> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [zohoSubmissionResult, setZohoSubmissionResult] = useState<any>(null)
  const [configureNow, setConfigureNow] = useState(true) // Renamed from skipConfiguration
  const [tokenError, setTokenError] = useState<string | null>(null)

  const [editedFields, setEditedFields] = useState<Record<string, { originalValue: any; currentValue: any }>>({})
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // Estado empresa
  const [empresa, setEmpresa] = useState({
    razonSocial: "",
    nombreFantasia: "",
    rut: "",
    giro: "",
    direccion: "",
    comuna: "",
    emailFacturacion: "",
    telefonoContacto: "",
    sistema: [] as string[],
    rubro: "",
    grupos: [] as { id: number; nombre: string; descripcion: string }[],
  })

  const [admins, setAdmins] = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [turnos, setTurnos] = useState([
    {
      id: 1,
      nombre: "Descanso",
      horaInicio: "",
      horaFin: "",
      colacionMinutos: 0,
      tooltip: "Fin de Semana o Feriado",
    },
    {
      id: 2,
      nombre: "Libre",
      horaInicio: "",
      horaFin: "",
      colacionMinutos: 0,
      tooltip: "No marca o Artículo 22",
    },
    {
      id: 3,
      nombre: "Presencial",
      horaInicio: "",
      horaFin: "",
      colacionMinutos: 0,
      tooltip: "Sin planificación",
    },
  ])
  const [planificaciones, setPlanificaciones] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [errorGlobalAsignaciones, setErrorGlobalAsignaciones] = useState("")
  const [trabajadoresErrors, setTrabajadoresErrors] = useState({
    byId: {},
    global: [],
  })
  const [errors, setErrors] = useState({ byId: {}, global: [] })

  useEffect(() => {
    const token = searchParams?.get("token")

    if (!token) return

    setIsLoadingToken(true)
    setTokenError(null)
    setCurrentStep(PRIMER_PASO)

    const decryptToken = async () => {
      try {
        const response = await fetch("/api/decrypt-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.empresaData) {
          setPrefilledData(data.empresaData)
          setEmpresa((prev) => ({
            ...prev,
            ...data.empresaData,
            grupos: Array.isArray(data.empresaData.grupos) ? data.empresaData.grupos : [],
          }))
        } else {
          console.error("Error al desencriptar token:", data.error)
          setTokenError(data.error || "Token inválido")
        }
      } catch (error) {
        console.error("Error al procesar token:", error)
        setTokenError(error instanceof Error ? error.message : "Error desconocido")
      } finally {
        setIsLoadingToken(false)
      }
    }

    decryptToken()
  }, [searchParams])

  const prefilledFields = prefilledData
    ? new Set(
        Object.entries(prefilledData)
          .filter(([_, value]) => value !== null && value !== undefined && value !== "")
          .map(([k]) => `empresa.${k}`),
      )
    : new Set()

  const ensureGrupoByName = (nombre) => {
    const existing = empresa.grupos.find((g) => g.nombre.toLowerCase() === nombre.toLowerCase())
    if (existing) return existing.id

    const nuevoGrupo = {
      id: Date.now(),
      nombre,
      descripcion: "",
    }
    setEmpresa({ ...empresa, grupos: [...empresa.grupos, nuevoGrupo] })
    return nuevoGrupo.id
  }

  useEffect(() => {
    const nonAdmins = trabajadores.filter((t) => t.tipo !== "administrador")

    const adminTrabajadores = admins.map((admin) => ({
      id: `admin-${admin.id}`,
      nombre: admin.nombre,
      rut: admin.rut,
      correo: admin.email,
      grupoId: admin.grupoId,
      telefono1: admin.telefono,
      telefono2: "",
      telefono3: "",
      tipo: "administrador",
    }))

    setTrabajadores([...adminTrabajadores, ...nonAdmins])
  }, [admins])

  const isFieldPrefilled = (fieldKey: string): boolean => {
    return prefilledFields.has(fieldKey)
  }

  const isFieldEdited = (fieldKey: string): boolean => {
    return fieldKey in editedFields
  }

  const trackFieldChange = (fieldKey: string, newValue: any) => {
    if (!prefilledData) return

    const fieldName = fieldKey.replace("empresa.", "")
    const originalValue = prefilledData[fieldName]

    // Only track if the value has actually changed
    if (JSON.stringify(originalValue) !== JSON.stringify(newValue)) {
      setEditedFields((prev) => ({
        ...prev,
        [fieldKey]: {
          originalValue,
          currentValue: newValue,
        },
      }))
    } else {
      // If it reverted to the original value, remove it from tracking
      setEditedFields((prev) => {
        const updated = { ...prev }
        delete updated[fieldKey]
        return updated
      })
    }
  }

  const completeStep = (stepIndex: number) => {
    setCompletedSteps((prev) => new Set(prev).add(stepIndex))
  }

  const isStepCompleted = (stepIndex: number): boolean => {
    return completedSteps.has(stepIndex)
  }

  const getChangesSummary = () => {
    const editedFieldsList = Object.entries(editedFields).map(([fieldKey, values]) => ({
      field: fieldKey,
      originalValue: values.originalValue,
      currentValue: values.currentValue,
    }))

    return {
      totalChanges: editedFieldsList.length,
      editedFields: editedFieldsList,
      hadPrefilledData: prefilledData !== null,
    }
  }

  const prepareFinalSubmission = (formData: any) => {
    const changesSummary = getChangesSummary()
    return {
      formData,
      changesSummary,
      accion: prefilledData ? "actualizar" : "crear",
    }
  }

  const trackProgress = async (stepLabel: string) => {
    if (!prefilledData) return // Only track if there's prefilled data (coming from Zoho)

    try {
      await fetch("/api/submit-to-zoho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar",
          eventType: "progress",
          metadata: {
            pasoActual: currentStep,
            pasoNombre: stepLabel,
            totalPasos: steps.length,
            porcentajeProgreso: Math.round((currentStep / (steps.length - 1)) * 100),
            empresaRut: empresa.rut,
            empresaNombre: empresa.razonSocial,
          },
        }),
      })
    } catch (error) {
      // Silently fail - do not block flow for tracking errors
      console.error("Error tracking progress:", error)
    }
  }

  const sendCompleteData = async (data: any) => {
    const response = await fetch("/api/submit-to-zoho", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: prefilledData ? "actualizar" : "crear",
        eventType: "complete",
        formData: data,
        metadata: {
          empresaRut: empresa.rut,
          empresaNombre: empresa.razonSocial,
          totalCambios: data._metadata?.totalChanges || 0,
          editedFields: data._metadata?.editedFields || [],
        },
      }),
    })

    const result = await response.json()
    return result
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()

    const empresaData = [
      ["DATOS EMPRESA"],
      ["Razón Social", empresa.razonSocial],
      ["Nombre de fantasía", empresa.nombreFantasia || ""],
      ["RUT", empresa.rut],
      ["Giro", empresa.giro || ""],
      ["Dirección", empresa.direccion],
      ["Comuna", empresa.comuna || ""],
      ["Email de facturación", empresa.emailFacturacion || ""],
      ["Teléfono de contacto", empresa.telefonoContacto || ""],
      ["Sistema", empresa.sistema.join(", ") || ""],
      ["Rubro", empresa.rubro || ""],
      [],
      ["Datos Administrador del Sistema"],
      ["Nombre", admins[0]?.nombre],
      ["RUT", admins[0]?.rut],
      ["Teléfono Contacto", admins[0]?.telefono || ""],
      ["Correo", admins[0]?.email],
    ]

    const ws1 = XLSX.utils.aoa_to_sheet(empresaData)
    ws1["A1"] = { v: "DATOS EMPRESA", t: "s", s: { fill: { fgColor: { rgb: "00B0F0" } } } }
    ws1["A13"] = { v: "Datos Administrador del Sistema", t: "s", s: { fill: { fgColor: { rgb: "00B0F0" } } } }
    XLSX.utils.book_append_sheet(workbook, ws1, "Datos Empresa")

    const headers = [
      "Rut Completo",
      "Correo Personal",
      "Nombres",
      "Apellidos",
      "Grupo",
      "Período a planificar: turnos",
      "Lunes",
      "",
      "",
      "Martes",
      "",
      "",
      "Miércoles",
      "",
      "",
      "Jueves",
      "",
      "",
      "Viernes",
      "",
      "",
      "Sábado",
      "",
      "",
      "Domingo",
      "",
      "",
      "TELÉFONOS MARCAJE POR VICTORIA CALL",
    ]

    const subHeaders = [
      "",
      "",
      "",
      "",
      "",
      "Fecha Fin Planificación",
      "Entrada",
      "Col (minutos)",
      "Salida",
      "Entrada",
      "Col",
      "Salida",
      "Entrada",
      "Col",
      "Salida",
      "Entrada",
      "Col",
      "Salida",
      "Entrada",
      "Col",
      "Salida",
      "Entrada",
      "Col",
      "Salida",
      "Entrada",
      "Col",
      "Salida",
      "",
    ]

    const trabajadoresData = [headers, subHeaders]

    trabajadores.forEach((trabajador) => {
      const asignacion = asignaciones.find((a) => a.trabajadorId === trabajador.id)
      let planificacion = null
      let fechaFin = ""
      const turnosPorDia = Array(7).fill({ entrada: "", colacion: "", salida: "" })

      if (asignacion) {
        planificacion = planificaciones.find((p) => p.id === asignacion.planificacionId)
        fechaFin = asignacion.hasta === "permanente" ? "PERMANENTE" : asignacion.hasta

        if (planificacion) {
          planificacion.diasTurnos.forEach((turnoId, dayIndex) => {
            if (turnoId) {
              const turno = turnos.find((t) => t.id === turnoId)
              if (turno) {
                turnosPorDia[dayIndex] = {
                  entrada: turno.horaInicio || "",
                  colacion: turno.colacionMinutos || "",
                  salida: turno.horaFin || "",
                }
              }
            }
          })
        }
      }

      const grupoNombre = trabajador.grupoId
        ? empresa.grupos?.find((g) => g.id === trabajador.grupoId)?.nombre || ""
        : ""

      const row = [
        trabajador.rut,
        trabajador.correo,
        trabajador.nombre.split(" ")[0] || "",
        trabajador.nombre.split(" ").slice(1).join(" ") || "",
        grupoNombre,
        fechaFin,
        turnosPorDia[0].entrada,
        turnosPorDia[0].colacion,
        turnosPorDia[0].salida,
        turnosPorDia[1].entrada,
        turnosPorDia[1].colacion,
        turnosPorDia[1].salida,
        turnosPorDia[2].entrada,
        turnosPorDia[2].colacion,
        turnosPorDia[2].salida,
        turnosPorDia[3].entrada,
        turnosPorDia[3].colacion,
        turnosPorDia[3].salida,
        turnosPorDia[4].entrada,
        turnosPorDia[4].colacion,
        turnosPorDia[4].salida,
        turnosPorDia[5].entrada,
        turnosPorDia[5].colacion,
        turnosPorDia[5].salida,
        turnosPorDia[6].entrada,
        turnosPorDia[6].colacion,
        turnosPorDia[6].salida,
        [trabajador.telefono1, trabajador.telefono2, trabajador.telefono3].filter(Boolean).join(" | "),
      ]

      trabajadoresData.push(row)
    })

    const ws2 = XLSX.utils.aoa_to_sheet(trabajadoresData)
    ws2["!cols"] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 25 },
    ]

    XLSX.utils.book_append_sheet(workbook, ws2, "Planificación")

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Onboarding_${empresa.nombreFantasia || "Empresa"}_${new Date().toISOString().split("T")[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleNext = () => {
    // Mark current step as completed
    completeStep(currentStep)

    // Send progress event to Zoho
    trackProgress(steps[currentStep]?.label || `Step ${currentStep}`)

    // Existing navigation logic
    if (currentStep === 5) {
      // Decision step index
      if (configureNow) {
        setCurrentStep(6) // Go to Turnos step
      } else {
        setCurrentStep(9) // Skip to Resumen step (now step 9 because of new steps)
      }
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleFinalizar = async () => {
    setIsSubmitting(true)
    setZohoSubmissionResult(null)

    const formData = {
      empresa,
      admins,
      trabajadores,
      turnos,
      planificaciones,
      asignaciones,
      configureNow, // Include configureNow in the data
    }

    // Prepare data with changes metadata
    const submissionData = prepareFinalSubmission(formData)

    try {
      const result = await sendCompleteData({
        ...submissionData.formData,
        _metadata: {
          changesSummary: submissionData.changesSummary,
          totalChanges: submissionData.changesSummary.totalChanges,
          editedFields: submissionData.changesSummary.editedFields,
        },
      })

      setZohoSubmissionResult(result)

      // If submission is successful, mark the final step as completed
      if (result.success) {
        completeStep(currentStep)
        setCurrentStep(currentStep + 1) // Move to the next (non-existent) step to indicate completion
      }
    } catch (error) {
      console.error("Error sending data:", error)
      setZohoSubmissionResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to send data. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrev = () => {
    if (currentStep === 5 && !configureNow) {
      // If on Decision step (index 5) and skipped config
      setCurrentStep(5) // Stay on decision step
    } else if (currentStep === 9 && !configureNow) {
      // If on Summary (index 9) and skipped config
      setCurrentStep(5) // Go back to Decision step
    } else {
      setCurrentStep(Math.max(0, currentStep - 1))
    }
  }

  const handleConfigurationDecision = (decision) => {
    if (decision === "now") {
      setConfigureNow(true)
      setCurrentStep(6) // Ajustado: Go to Turnos step (era 5, ahora es 6)
    } else {
      setConfigureNow(false)
      setCurrentStep(9) // Ajustado: Skip to Resumen step (era 8, ahora es 9)
    }
  }

  // Removed hook usage for now
  if (isLoadingToken /* || isPersistenceLoading */) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-600 border-r-transparent"></div>
          <p className="text-slate-600">Loading information...</p>
        </div>
      </div>
    )
  }

  // Mostrar error de token si existe
  if (tokenError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center rounded-xl border border-red-400 bg-red-50 p-6 text-red-800">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-600" />
          <h2 className="text-xl font-semibold mb-2">Error al cargar la configuración</h2>
          <p className="text-sm">{tokenError}</p>
          <p className="text-xs mt-2">Por favor, contacta a soporte si el problema persiste.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 pb-24">
      <Stepper currentStep={currentStep} />

      {currentStep === 0 && (
        <BienvenidaMarketingStep
          nombreEmpresa={empresa.nombreFantasia || empresa.razonSocial || undefined}
          onContinue={handleNext}
        />
      )}

      {currentStep === 1 && <AntesDeComenzarStep onContinue={handleNext} />}

      {currentStep === 2 && (
        <EmpresaStep
          empresa={empresa}
          setEmpresa={setEmpresa}
          prefilledFields={prefilledFields}
          isFieldPrefilled={isFieldPrefilled}
          isFieldEdited={isFieldEdited}
          trackFieldChange={trackFieldChange}
        />
      )}
      {currentStep === 3 && (
        <AdminStep
          admins={admins}
          setAdmins={setAdmins}
          grupos={empresa.grupos}
          ensureGrupoByName={ensureGrupoByName}
        />
      )}
      {currentStep === 4 && (
        <TrabajadoresStep
          trabajadores={trabajadores}
          setTrabajadores={setTrabajadores}
          grupos={empresa.grupos}
          setGrupos={(newGrupos) => setEmpresa({ ...empresa, grupos: newGrupos })}
          errorGlobal={errorGlobalAsignaciones}
          ensureGrupoByName={ensureGrupoByName} // Pasando la función como prop
        />
      )}
      {currentStep === 5 && <DecisionStep onDecision={handleConfigurationDecision} />}
      {currentStep === 6 && <TurnosStep turnos={turnos} setTurnos={setTurnos} />}
      {currentStep === 7 && (
        <PlanificacionesStep
          planificaciones={planificaciones}
          setPlanificaciones={setPlanificaciones}
          turnos={turnos}
        />
      )}
      {currentStep === 8 && (
        <AsignacionStep
          asignaciones={asignaciones}
          setAsignaciones={setAsignaciones}
          trabajadores={trabajadores}
          planificaciones={planificaciones}
          grupos={empresa.grupos}
          errorGlobal={errorGlobalAsignaciones}
        />
      )}
      {currentStep === 9 && (
        <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-emerald-900">Resumen del Onboarding</h2>
          <div className="space-y-3 text-sm text-emerald-800">
            <div className="rounded-lg bg-white p-3">
              <p className="font-medium">Empresa: {empresa.nombreFantasia || empresa.razonSocial}</p>
              <p className="text-xs text-slate-600">RUT: {empresa.rut}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="font-medium">Administradores: {admins.length}</p>
              <p className="text-xs text-slate-600">{admins.map((a) => a.nombre).join(", ")}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="font-medium">Trabajadores registrados: {trabajadores.length}</p>
            </div>
            {!configureNow && (
              <>
                <div className="rounded-lg bg-white p-3">
                  <p className="font-medium">Turnos configurados: {turnos.length}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="font-medium">Planificaciones creadas: {planificaciones.length}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="font-medium">Asignaciones realizadas: {asignaciones.length}</p>
                </div>
              </>
            )}
            {!configureNow && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="font-medium text-amber-900">⏭️ Configuración de turnos y planificaciones omitida</p>
                <p className="text-xs text-amber-700">Se configurará durante la capacitación</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descargar Excel
          </button>
        </section>
      )}

      {currentStep > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            disabled={currentStep === 2}
          >
            ← Atrás
          </button>

          {/* Ajustar texto del paso */}
          <span className="text-sm text-slate-600">
            Paso {currentStep} de {steps.length - 1}
          </span>

          {currentStep < 9 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalizar}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></span>
                  Enviando...
                </>
              ) : (
                "Completar y enviar"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
