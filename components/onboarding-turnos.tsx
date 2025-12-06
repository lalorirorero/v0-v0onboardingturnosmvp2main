"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Building2 } from "lucide-react"
import * as XLSX from "xlsx"
import { useSearchParams } from "next/navigation"

// Pasos del flujo
const steps = [
  { id: 0, label: "Empresa y grupos", description: "Datos base de la empresa" },
  { id: 1, label: "Admin", description: "Responsable de la cuenta" },
  { id: 2, label: "Trabajadores", description: "Listado inicial" },
  { id: 3, label: "Configuración", description: "Decidir qué configurar" },
  { id: 4, label: "Turnos", description: "Definición de turnos" },
  { id: 5, label: "Planificaciones", description: "Tipos de planificación semanal" },
  { id: 6, label: "Asignación", description: "Quién trabaja qué planificación" },
  { id: 7, label: "Resumen", description: "Revisión final" },
]

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
    <ol className="grid grid-cols-7 gap-2">
      {steps.map((step, index) => {
        const status = index < currentStep ? "completed" : index === currentStep ? "current" : "pending"

        const base = "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs bg-white"
        const stateClass =
          status === "current"
            ? "border-sky-500 bg-sky-50"
            : status === "completed"
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-200"

        return (
          <li key={step.id} className={`${base} ${stateClass}`}>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold flex-shrink-0
              ${status === "current" ? "bg-sky-500 text-white" : ""}
              ${status === "completed" ? "bg-emerald-500 text-white" : ""}
              ${status === "pending" ? "bg-slate-200 text-slate-700" : ""}`}
            >
              {status === "completed" ? "✓" : index + 1}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="font-semibold text-slate-800 text-[11px] truncate">{step.label}</div>
              <div className="text-[9px] text-slate-500 leading-tight truncate">{step.description}</div>
            </div>
          </li>
        )
      })}
    </ol>
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
        <h2 className="text-lg font-semibold text-slate-900">Administradores</h2>
        <p className="text-xs text-slate-500">
          Personas de contacto principales para coordinar la implementación y cambios de turnos.
        </p>
      </header>

      {/* Formulario único */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Agregar Administrador</h3>
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
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">
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
                  className="ml-2 text-xs text-red-500 hover:text-red-700 focus:outline-none"
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

const EmpresaStep = ({ empresa, setEmpresa }) => {
  const SISTEMAS = [
    "1.- GeoVictoria BOX",
    "2.- GeoVictoria CALL",
    "3.- GeoVictoria APP",
    "4.- GeoVictoria USB",
    "5.- GeoVictoria WEB",
  ]

  const RUBROS = [
    "1.- SALUD",
    "2.- EDUCACIÓN",
    "3.- BANCA Y FINANZAS",
    "4.- MANUFACTURA",
    "5.- DISTRIBUCIÓN",
    "6.- TRANSPORTE",
    "7.- MINERÍA",
    "8.- LEASING AUTOMOTRIZ",
    "9.- MANTENCIÓN TÉCNICA",
    "10.- SERVICIOS BÁSICOS",
    "11.- GOBIERNO",
    "12.- OUTSOURCING SEGURIDAD",
    "13.- OUTSOURCING SERVICIOS GENERALES",
    "14.- OUTSOURCING RETAIL",
    "15.- RETAIL GRANDES TIENDAS",
    "16.- RETAIL PEQUEÑO",
    "17.- AGRICULTURA",
    "18.- ACUICULTURA",
    "19.- ENTRETENIMIENTO Y TURISMO",
    "20.- GIMNASIOS",
    "21.- HOTELERÍA Y GASTRONOMÍA",
    "22.- CONSULTORÍA",
    "23.- SERVICIO AL CLIENTE",
    "24.- CONSTRUCCIÓN",
  ]

  const handleEmpresaChange = (e) => {
    setEmpresa({ ...empresa, [e.target.name]: e.target.value })
  }

  const handleSistemaChange = (sistemaValue) => {
    const currentSistemas = empresa.sistema || []
    const isSelected = currentSistemas.includes(sistemaValue)

    const newSistemas = isSelected
      ? currentSistemas.filter((s) => s !== sistemaValue)
      : [...currentSistemas, sistemaValue]

    setEmpresa({ ...empresa, sistema: newSistemas })
  }

  return (
    <section className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Building2 className="h-5 w-5 text-sky-600" />
          Datos de la empresa
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <label className="font-medium">Razón Social</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              name="razonSocial"
              value={empresa.razonSocial || ""}
              onChange={handleEmpresaChange}
              placeholder="Ej: EDALTEC LTDA"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium">Nombre de fantasía</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              name="nombreFantasia"
              value={empresa.nombreFantasia || ""}
              onChange={handleEmpresaChange}
              placeholder="Ej: EDALTEC"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium">RUT</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              name="rut"
              value={empresa.rut || ""}
              onChange={handleEmpresaChange}
              placeholder="Ej: 76.201.998-1"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium">Giro</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              name="giro"
              value={empresa.giro || ""}
              onChange={handleEmpresaChange}
              placeholder="Ej: Comercializadora de equipos"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium">Dirección</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              name="direccion"
              value={empresa.direccion || ""}
              onChange={handleEmpresaChange}
              placeholder="Ej: Chiloé 5138"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium">Comuna</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="text"
              name="comuna"
              value={empresa.comuna || ""}
              onChange={handleEmpresaChange}
              placeholder="Ej: San Miguel"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium">Email de facturación</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="email"
              name="emailFacturacion"
              value={empresa.emailFacturacion || ""}
              onChange={handleEmpresaChange}
              placeholder="Ej: marcelo.vargas@edaltec.cl"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium">Teléfono de contacto</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              type="tel"
              name="telefonoContacto"
              value={empresa.telefonoContacto || ""}
              onChange={handleEmpresaChange}
              placeholder="Ej: 56995925655"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium">Sistema</label>
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              {SISTEMAS.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={(empresa.sistema || []).includes(s)}
                    onChange={() => handleSistemaChange(s)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <label className="font-medium">Rubro</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              name="rubro"
              value={empresa.rubro || ""}
              onChange={handleEmpresaChange}
            >
              <option value="">Seleccionar rubro...</option>
              {RUBROS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
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
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [bulkStatus, setBulkStatus] = useState({ total: 0, added: 0, error: "" })
  const MAX_ROWS = 500
  const [errors, setErrors] = useState({ byId: {}, global: [] }) // Declare errors here

  useEffect(() => {
    if (!bulkText.trim()) return

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
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
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
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden"
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
            asignas "Turno Oficina" y Sábado y Domingo asignas "Libre". O una planificación "Turno Rotativo" con
            diferentes turnos cada día.
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
        <h2 className="text-2xl font-semibold text-slate-900">¿Deseas configurar turnos y planificaciones ahora?</h2>
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

export default function OnboardingTurnos({}) {
  const searchParams = useSearchParams()
  // Initialized currentStep to 1, added isSubmitting and isLoadingToken states
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [zohoSubmissionResult, setZohoSubmissionResult] = useState<any>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(false)

  // Renamed skipConfiguration to configureNow for clarity and consistency with the update
  const [configureNow, setConfigureNow] = useState(true) // Default to true

  const [admins, setAdmins] = useState([])

  // Modified initial state for empresa to be empty
  const [empresa, setEmpresa] = useState({
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
    grupos: [], // Ensure grupos is initialized as an array
  })
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
    // Renamed to avoid conflict with errors variable in TrabajadoresStep
    byId: {},
    global: [],
  })
  const [errors, setErrors] = useState({ byId: {}, global: [] }) // Declare errors here for TrabajadoresStep

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

  useEffect(() => {
    const token = searchParams.get("token")

    if (token) {
      setIsLoadingToken(true)

      fetch("/api/decrypt-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.empresaData) {
            // Prellenar los datos de la empresa
            setEmpresa((prev) => ({
              ...prev,
              ...data.empresaData,
              // Ensure groups is an array and merge if necessary
              grupos: Array.isArray(data.empresaData.grupos) ? data.empresaData.grupos : [],
            }))
            console.log("[v0] Datos de empresa prellenados desde token:", data.empresaData)
          } else {
            console.error("[v0] Error al desencriptar token:", data.error)
          }
        })
        .catch((error) => {
          console.error("[v0] Error al procesar token:", error)
        })
        .finally(() => {
          setIsLoadingToken(false)
        })
    }
  }, [searchParams])

  const generateExcelAsBase64 = () => {
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

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "base64" })
    const fileName = `Onboarding_${empresa.nombreFantasia || "Empresa"}_${new Date().toISOString().split("T")[0]}.xlsx`

    return {
      fileName,
      fileBase64: wbout,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
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

  const handleFinalizar = async () => {
    // Only send webhook if we're on the final step (Resumen)
    if (currentStep !== steps.length - 1) {
      return
    }

    setIsSubmitting(true)
    setZohoSubmissionResult(null)

    try {
      const excelFile = generateExcelAsBase64()

      const formData = {
        empresa,
        admins,
        trabajadores,
        ...(configureNow && {
          turnos,
          planificaciones,
          asignaciones,
        }),
        completedAt: new Date().toISOString(),
        archivo: {
          nombre: excelFile.fileName,
          contenido: excelFile.fileBase64,
          tipo: excelFile.mimeType,
        },
      }

      // Enviar a Zoho Flow
      const response = await fetch("/api/submit-to-zoho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      setZohoSubmissionResult(result)

      if (result.success) {
        console.log("[v0] Datos enviados exitosamente a Zoho Flow")
        // Avanzar al siguiente paso después de envío exitoso
        setCurrentStep(currentStep + 1)
      } else {
        console.error("[v0] Error al enviar datos a Zoho Flow:", result.error)
        // Se actualiza el estado de ZohoSubmissionResult con un mensaje más detallado
        setZohoSubmissionResult({
          success: false,
          message: result.message || "Ocurrió un error desconocido.",
          error: result.error || "No se pudo procesar la solicitud.",
        })
      }
    } catch (error) {
      console.error("Error al enviar datos:", error)
      setZohoSubmissionResult({
        success: false,
        message: "Error al enviar los datos. Por favor, intenta nuevamente.",
        error: error instanceof Error ? error.message : "Error desconocido",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    setCurrentStep(currentStep + 1)
  }

  const handlePrev = () => {
    if (currentStep === steps.length - 1 && !configureNow) {
      setCurrentStep(3) // Go back to decision step
    } else {
      setCurrentStep(Math.max(0, currentStep - 1))
    }
  }

  const handleConfigurationDecision = (decision) => {
    if (decision === "now") {
      setConfigureNow(true)
      setCurrentStep(4) // Go to Turnos step
    } else {
      setConfigureNow(false)
      setCurrentStep(7) // Skip to Resumen step
    }
  }

  if (isLoadingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-600 border-r-transparent"></div>
          <p className="text-slate-600">Cargando información...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-100">
      {/* Removed the ZohoPrefillHandler component as its functionality is now handled by the useEffect hook */}
      {/* <ZohoPrefillHandler setEmpresa={setEmpresa} setAdmins={setAdmins} /> */}

      <Stepper currentStep={currentStep} />

      {currentStep === 0 && <EmpresaStep empresa={empresa} setEmpresa={setEmpresa} />}
      {currentStep === 1 && (
        <AdminStep
          admins={admins}
          setAdmins={setAdmins}
          grupos={empresa.grupos}
          ensureGrupoByName={ensureGrupoByName}
        />
      )}
      {currentStep === 2 && (
        <TrabajadoresStep
          trabajadores={trabajadores}
          setTrabajadores={setTrabajadores}
          grupos={empresa.grupos}
          setGrupos={(newGrupos) => setEmpresa({ ...empresa, grupos: newGrupos })}
          errorGlobal={errorGlobalAsignaciones}
          ensureGrupoByName={ensureGrupoByName} // Pasando la función como prop
        />
      )}
      {currentStep === 3 && <DecisionStep onDecision={handleConfigurationDecision} />}
      {currentStep === 4 && <TurnosStep turnos={turnos} setTurnos={setTurnos} />}
      {currentStep === 5 && (
        <PlanificacionesStep
          planificaciones={planificaciones}
          setPlanificaciones={setPlanificaciones}
          turnos={turnos}
        />
      )}
      {currentStep === 6 && (
        <AsignacionStep
          asignaciones={asignaciones}
          setAsignaciones={setAsignaciones}
          trabajadores={trabajadores}
          planificaciones={planificaciones}
          grupos={empresa.grupos}
          errorGlobal={errorGlobalAsignaciones}
        />
      )}
      {currentStep === 7 && (
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
            {!configureNow && ( // Changed from skipConfiguration to configureNow
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
            {!configureNow && ( // Changed from skipConfiguration to configureNow
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

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrev}
          className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          disabled={currentStep === 0}
        >
          ← Atrás
        </button>

        <span className="text-sm text-slate-600">
          Paso {currentStep + 1} de {steps.length}
        </span>

        {currentStep === steps.length - 1 ? (
          <button
            type="button"
            onClick={handleFinalizar}
            className="inline-flex items-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Enviando..." : "Completar y enviar"}
          </button>
        ) : currentStep === 3 ? // Don't show next button on decision step - handled by DecisionStep component
        null : (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
          >
            Siguiente →
          </button>
        )}
      </div>

      {zohoSubmissionResult && (
        <div
          className={`fixed bottom-24 right-6 max-w-md rounded-xl border p-4 shadow-lg ${
            zohoSubmissionResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{zohoSubmissionResult.success ? "¡Éxito!" : "Error"}</h3>
              <p className="text-xs">
                {zohoSubmissionResult.success
                  ? zohoSubmissionResult.message || "Los datos se enviaron a Zoho Flow correctamente."
                  : zohoSubmissionResult.message ||
                    `Ocurrió un error: ${zohoSubmissionResult.error || "Detalles no disponibles."}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setZohoSubmissionResult(null)}
              className="rounded-full p-1 hover:bg-slate-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-slate-500"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
