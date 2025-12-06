"use client"

import { useState, useEffect } from "react" // Added useEffect
import { Building2 } from "lucide-react" // Import Building2 icon
import * as XLSX from "xlsx"

// Pasos del flujo
const steps = [
  { id: 0, label: "Empresa y grupos", description: "Datos base de la empresa" },
  { id: 1, label: "Admin", description: "Responsable de la cuenta" },
  { id: 2, label: "Trabajadores", description: "Listado inicial" },
  { id: 3, label: "Turnos", description: "Definición de turnos" },
  { id: 4, label: "Planificaciones", description: "Tipos de planificación semanal" },
  { id: 5, label: "Asignación", description: "Quién trabaja qué planificación" },
  { id: 6, label: "Resumen", description: "Revisión final" },
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

// Tipos

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

const AdminStep = ({ admins, setAdmins }) => {
  const handleChange = (id, field, value) => {
    setAdmins(admins.map((admin) => (admin.id === id ? { ...admin, [field]: value } : admin)))
  }

  const addAdmin = () => {
    setAdmins([
      ...admins,
      {
        id: Date.now(),
        nombre: "",
        rut: "",
        email: "",
        telefono: "",
      },
    ])
  }

  const removeAdmin = (id) => {
    if (admins.length === 1) return
    setAdmins(admins.filter((admin) => admin.id !== id))
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Administradores</h2>
        <p className="text-xs text-slate-500">
          Personas de contacto principales para coordinar la implementación y cambios de turnos.
        </p>
      </header>

      <div className="space-y-4">
        {admins.map((admin, index) => (
          <div key={admin.id} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">Administrador {index + 1}</h3>
              {admins.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAdmin(admin.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Eliminar
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="font-medium">Nombre completo</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  type="text"
                  value={admin.nombre}
                  onChange={(e) => handleChange(admin.id, "nombre", e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="font-medium">RUT</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  type="text"
                  value={admin.rut}
                  onChange={(e) => handleChange(admin.id, "rut", e.target.value)}
                  placeholder="12345678-9"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="font-medium">Correo</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  type="email"
                  value={admin.email}
                  onChange={(e) => handleChange(admin.id, "email", e.target.value)}
                  placeholder="admin@empresa.com"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="font-medium">Teléfono</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  type="tel"
                  value={admin.telefono}
                  onChange={(e) => handleChange(admin.id, "telefono", e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addAdmin}
        className="rounded-xl border-2 border-dashed border-sky-300 px-4 py-2 text-sm font-medium text-sky-600 hover:border-sky-400 hover:bg-sky-50"
      >
        + Agregar administrador
      </button>
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

  // Removed entire grupos creation section - grupos only created from worker import

  return (
    <section className="space-y-6">
      {/* Datos de Empresa */}
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
        <div className="flex items-center justify-between">
          
          {/* Removed addGrupo button */}
        </div>
        

        <div className="space-y-2">{/* Removed dynamic rendering of grupos */}</div>
      </div>
    </section>
  )
}

const TrabajadoresStep = ({ trabajadores, setTrabajadores, grupos, errors, setErrors, ensureGrupoByName }) => {
  const [bulkText, setBulkText] = useState("")
  const [showVideoModal, setShowVideoModal] = useState(false)

  useEffect(() => {
    if (!bulkText.trim()) return

    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length === 0) return

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
        tipo: "usuario", // Mark as regular user
      }
    })

    setTrabajadores([...trabajadores, ...nuevos])
    setBulkText("")
    setErrors({ byId: {}, global: [] })
  }, [bulkText])

  const updateTrabajador = (id, field, value) => {
    const updated = trabajadores.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    setTrabajadores(updated)

    if (errors?.byId?.[id]?.[field]) {
      const newById = { ...(errors.byId || {}) }
      const row = { ...(newById[id] || {}) }
      delete row[field]
      if (Object.keys(row).length === 0) {
        delete newById[id]
      } else {
        newById[id] = row
      }
      setErrors({ ...(errors || { byId: {}, global: [] }), byId: newById })
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
    // Don't allow removing admins from this view
    const trabajador = trabajadores.find((t) => t.id === id)
    if (trabajador?.tipo === "administrador") {
      alert("No se puede eliminar un administrador desde aquí. Elimínalo desde el paso de Administradores.")
      return
    }
    setTrabajadores(trabajadores.filter((t) => t.id !== id))
    if (errors?.byId?.[id]) {
      const newById = { ...(errors.byId || {}) }
      delete newById[id]
      setErrors({ ...(errors || { byId: {}, global: [] }), byId: newById })
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
        <textarea
          className="mt-2 h-28 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder={`Ejemplo de fila pegada:\n18371911-4\t correo@ejemplo.cl\tVICTOR MANUEL ALEJANDRO\tFLORES ESPEJO\tGTS\t+5691234567\t+5691234568\t+5691234569`}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
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
  const updateTurno = (id, field, value) => {
    const updated = turnos.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    setTurnos(updated)
  }

  const addTurno = () => {
    setTurnos([
      ...turnos,
      {
        id: Date.now(),
        nombre: "",
        horaInicio: "",
        horaFin: "",
        colacionMinutos: 0,
      },
    ])
  }

  const removeTurno = (id) => {
    if (turnos.length === 1) return
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

      <div className="space-y-3">
        {turnos.map((turno) => (
          <div key={turno.id} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-2 md:grid-cols-3">
              <div className="space-y-1 text-sm">
                <label className="font-medium">Nombre del turno</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  type="text"
                  value={turno.nombre}
                  onChange={(e) => updateTurno(turno.id, "nombre", e.target.value)}
                  placeholder="Ej: Turno Oficina, Turno Noche"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="font-medium">Hora inicio</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  type="time"
                  value={turno.horaInicio}
                  onChange={(e) => updateTurno(turno.id, "horaInicio", e.target.value)}
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="font-medium">Hora fin</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  type="time"
                  value={turno.horaFin}
                  onChange={(e) => updateTurno(turno.id, "horaFin", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <label className="font-medium">Tiempo de colación (minutos)</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                type="number"
                value={turno.colacionMinutos}
                onChange={(e) => updateTurno(turno.id, "colacionMinutos", Number.parseInt(e.target.value) || 0)}
                placeholder="Ej: 30, 60"
                min="0"
              />
            </div>
            <button
              type="button"
              onClick={() => removeTurno(turno.id)}
              className="text-xs text-slate-500 hover:text-red-500"
            >
              Eliminar turno
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addTurno}
        className="mt-2 inline-flex items-center rounded-full border border-sky-500 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
      >
        + Agregar turno
      </button>
    </section>
  )
}

const PlanificacionesStep = ({ planificaciones, setPlanificaciones, turnos }) => {
  const updatePlanificacion = (id, field, value) => {
    const updated = planificaciones.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    setPlanificaciones(updated)
  }

  const updateDiaTurno = (planId, dayIndex, turnoId) => {
    const updated = planificaciones.map((p) => {
      if (p.id === planId) {
        const nuevosDias = [...p.diasTurnos]
        nuevosDias[dayIndex] = turnoId
        return { ...p, diasTurnos: nuevosDias }
      }
      return p
    })
    setPlanificaciones(updated)
  }

  const addPlanificacion = () => {
    const turnoLibre = turnos.find((t) => t.nombre.toLowerCase() === "libre")
    const turnoLibreId = turnoLibre ? turnoLibre.id : null

    setPlanificaciones([
      ...planificaciones,
      {
        id: Date.now(),
        nombre: "",
        diasTurnos: Array(7).fill(turnoLibreId),
      },
    ])
  }

  const removePlanificacion = (id) => {
    if (planificaciones.length === 1) return
    setPlanificaciones(planificaciones.filter((p) => p.id !== id))
  }

  const verificarPlanificacionCompleta = (plan) => {
    return plan.diasTurnos.every((turnoId) => turnoId !== null && turnoId !== "")
  }

  return (
    <section className="space-y-4">
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

      <div className="space-y-3">
        {planificaciones.map((plan) => {
          const esCompleta = verificarPlanificacionCompleta(plan)
          return (
            <div key={plan.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="space-y-1 text-sm">
                <label className="font-medium">Nombre de la planificación</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  type="text"
                  value={plan.nombre}
                  onChange={(e) => updatePlanificacion(plan.id, "nombre", e.target.value)}
                  placeholder="Ej: Lunes a Viernes Oficina, Fin de semana Libre"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Asignación semanal (L, M, X, J, V, S, D)</p>
                <div className="grid gap-2 sm:grid-cols-7">
                  {DIAS.map((dia, dayIndex) => {
                    const turnoAsignado = plan.diasTurnos[dayIndex]
                    return (
                      <div key={dayIndex} className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">{dia}</label>
                        <select
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          value={turnoAsignado ?? ""}
                          onChange={(e) =>
                            updateDiaTurno(plan.id, dayIndex, e.target.value ? Number(e.target.value) : null)
                          }
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

              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <div className="text-xs">
                  {esCompleta ? (
                    <span className="text-emerald-700 font-medium">✓ Planificación completa</span>
                  ) : (
                    <span className="text-red-700 font-medium">⚠ Todos los días deben tener un turno</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePlanificacion(plan.id)}
                  className="text-xs text-slate-500 hover:text-red-500"
                >
                  Eliminar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addPlanificacion}
        disabled={turnos.length === 0}
        className="mt-2 inline-flex items-center rounded-full border border-sky-500 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:border-slate-300 disabled:text-slate-500 disabled:hover:bg-white"
      >
        + Agregar planificación
      </button>
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
      // Corrected condition for bulkHasta
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

          {/* START: CHANGE */}
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
          {/* END: CHANGE */}
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
          <table className="min-w-full border-collapse text-[11px]">
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
                {/* START: CHANGE */}
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
                {/* END: CHANGE */}
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

export default function OnboardingTurnos({}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [admins, setAdmins] = useState([
    {
      id: Date.now(),
      nombre: "Carlos López",
      rut: "12345678-9",
      email: "carlos@empresa.com",
      telefono: "+56912345678",
    },
  ])

  const [empresa, setEmpresa] = useState({
    razonSocial: "EDALTEC LTDA",
    nombreFantasia: "EDALTEC",
    rut: "76201998-1",
    giro: "Comercializadora de equipos de alta tecnología",
    direccion: "Chiloé 5138",
    comuna: "San Miguel",
    emailFacturacion: "marcelo.vargas@edaltec.cl",
    telefonoContacto: "56995925655", // Changed from telefono to telefonoContacto to match updates
    sistema: ["3.- GeoVictoria APP"], // Updated to match new sistema options and format
    rubro: "5.- DISTRIBUCIÓN", // Updated to match new rubro options
    grupos: [],
  })
  const [trabajadores, setTrabajadores] = useState([])
  const [turnos, setTurnos] = useState([])
  const [planificaciones, setPlanificaciones] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [errorGlobalAsignaciones, setErrorGlobalAsignaciones] = useState("")
  const [trabajadoresErrors, setTrabajadoresErrors] = useState({
    byId: {},
    global: [],
  })

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
    // Remove old admin entries
    const nonAdmins = trabajadores.filter((t) => t.tipo !== "administrador")

    // Add current admins as trabajadores
    const adminTrabajadores = admins.map((admin) => ({
      id: `admin-${admin.id}`,
      nombre: admin.nombre,
      rut: admin.rut,
      correo: admin.email,
      grupoId: "",
      telefono1: admin.telefono,
      telefono2: "",
      telefono3: "",
      tipo: "administrador",
    }))

    setTrabajadores([...adminTrabajadores, ...nonAdmins])
  }, [admins])

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()

    // Hoja 1: Datos de la empresa y the first admin
    const empresaData = [
      ["DATOS EMPRESA"],
      ["Razón Social", empresa.razonSocial],
      ["Nombre de fantasía", empresa.nombreFantasia || ""],
      ["RUT", empresa.rut],
      ["Giro", empresa.giro || ""],
      ["Dirección", empresa.direccion],
      ["Comuna", empresa.comuna || ""],
      ["Email de facturación", empresa.emailFacturacion || ""],
      ["Teléfono de contacto", empresa.telefonoContacto || ""], // Use telefonoContacto
      ["Sistema", empresa.sistema.join(", ") || ""], // Join array elements for display
      ["Rubro", empresa.rubro || ""],
      [],
      ["Datos Administrador del Sistema"],
      ["Nombre", admins[0].nombre], // Use admins[0] instead of admin
      ["RUT", admins[0].rut], // Use admins[0] instead of admin
      ["Teléfono Contacto", admins[0].telefono || ""], // Use admins[0] instead of admin
      ["Correo", admins[0].email], // Use admins[0] instead of admin
    ]

    const ws1 = XLSX.utils.aoa_to_sheet(empresaData)

    // Aplicar estilos a los encabezados
    ws1["A1"] = { v: "DATOS EMPRESA", t: "s", s: { fill: { fgColor: { rgb: "00B0F0" } } } }
    ws1["A13"] = { v: "Datos Administrador del Sistema", t: "s", s: { fill: { fgColor: { rgb: "00B0F0" } } } }

    XLSX.utils.book_append_sheet(workbook, ws1, "Datos Empresa")

    // Hoja 2: Trabajadores y planificaciones
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

    // Agregar datos de trabajadores con sus asignaciones
    trabajadores.forEach((trabajador) => {
      const asignacion = asignaciones.find((a) => a.trabajadorId === trabajador.id)
      let planificacion = null
      let fechaFin = ""
      const turnosPorDia = Array(7).fill({ entrada: "", colacion: "", salida: "" })

      if (asignacion) {
        planificacion = planificaciones.find((p) => p.id === asignacion.planificacionId)
        fechaFin = asignacion.hasta === "permanente" ? "PERMANENTE" : asignacion.hasta

        if (planificacion) {
          // Obtener los turnos para cada día de la semana
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
        // Lunes
        turnosPorDia[0].entrada,
        turnosPorDia[0].colacion,
        turnosPorDia[0].salida,
        // Martes
        turnosPorDia[1].entrada,
        turnosPorDia[1].colacion,
        turnosPorDia[1].salida,
        // Miércoles
        turnosPorDia[2].entrada,
        turnosPorDia[2].colacion,
        turnosPorDia[2].salida,
        // Jueves
        turnosPorDia[3].entrada,
        turnosPorDia[3].colacion,
        turnosPorDia[3].salida,
        // Viernes
        turnosPorDia[4].entrada,
        turnosPorDia[4].colacion,
        turnosPorDia[4].salida,
        // Sábado
        turnosPorDia[5].entrada,
        turnosPorDia[5].colacion,
        turnosPorDia[5].salida,
        // Domingo
        turnosPorDia[6].entrada,
        turnosPorDia[6].colacion,
        turnosPorDia[6].salida,
        // Teléfonos
        [trabajador.telefono1, trabajador.telefono2, trabajador.telefono3]
          .filter(Boolean)
          .join(" | "),
      ]

      trabajadoresData.push(row)
    })

    const ws2 = XLSX.utils.aoa_to_sheet(trabajadoresData)

    // Ajustar anchos de columna
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
    setTrabajadoresErrors({ byId: {}, global: [] })

    if (currentStep === 0) {
      if (!empresa.razonSocial.trim()) {
        alert("Completa la razón social de la empresa")
        return
      }
      if (!empresa.rut.trim()) {
        alert("Completa el RUT de la empresa")
        return
      }
      // Validation for telefonoContacto
      if (!empresa.telefonoContacto.trim()) {
        alert("Completa el teléfono de contacto de la empresa")
        return
      }
      // Validation for sistema
      if (!empresa.sistema || empresa.sistema.length === 0) {
        alert("Selecciona al menos un sistema")
        return
      }
    }
    // Added validation for admin step
    if (currentStep === 1) {
      const invalidAdmin = admins.find((admin) => !admin.nombre || !admin.email)
      if (invalidAdmin) {
        alert("Completa todos los campos requeridos de los administradores")
        return
      }
      // Validate email format for all admins
      const invalidEmail = admins.some((admin) => admin.email && !isValidEmail(admin.email))
      if (invalidEmail) {
        alert("Uno o más correos de administrador son inválidos")
        return
      }
    }
    // </CHANGE>
    if (currentStep === 2) {
      if (trabajadores.length === 0) {
        alert("Debes cargar al menos 1 trabajador")
        return
      }

      const errores = { byId: {}, global: [] }

      trabajadores.forEach((t) => {
        const rowErrors = {}

        if (!t.nombre.trim()) {
          rowErrors["nombre"] = "Nombre requerido"
        }
        if (!t.rut.trim()) {
          rowErrors["rut"] = "RUT requerido"
        } else if (!isValidRut(t.rut)) {
          rowErrors["rut"] = "RUT inválido"
        }
        if (t.correo.trim() && !isValidEmail(t.correo)) {
          rowErrors["correo"] = "Correo inválido"
        }

        if (Object.keys(rowErrors).length > 0) {
          errores.byId[t.id] = rowErrors
        }
      })

      if (Object.keys(errores.byId).length > 0) {
        setTrabajadoresErrors(errores)
        alert("Hay errores en la tabla de trabajadores")
        return
      }
    } else if (currentStep === 3) {
      if (turnos.length === 0) {
        alert("Debes crear al menos 1 turno")
        return
      }
      const turnoSinNombre = turnos.find((t) => !t.nombre.trim())
      if (turnoSinNombre) {
        alert("Todos los turnos deben tener un nombre")
        return
      }
    } else if (currentStep === 4) {
      if (planificaciones.length === 0) {
        alert("Debes crear al menos 1 planificación")
        return
      }
      const planificacionSinNombre = planificaciones.find((p) => !p.nombre.trim())
      if (planificacionSinNombre) {
        alert("Todas las planificaciones deben tener un nombre")
        return
      }
    }

    setCurrentStep(currentStep + 1)
  }

  const handlePrev = () => {
    setCurrentStep(Math.max(0, currentStep - 1))
  }

  const handleFinal = () => {
    const resumen = {
      admin: admins, // Use admins array
      empresa,
      trabajadores,
      turnos,
      planificaciones,
      asignaciones,
    }
    console.log("Resumen final:", resumen)
    alert(
      `Onboarding completado.\n\nAdmin: ${admins[0].nombre}\nEmpresa: ${empresa.nombreFantasia}\nTrabajadores: ${trabajadores.length}\nTurnos: ${turnos.length}\nPlanificaciones: ${planificaciones.length}\nAsignaciones: ${asignaciones.length}`,
    )
  }

  return (
    <div className="space-y-8">
      <Stepper currentStep={currentStep} />

      {currentStep === 0 && <EmpresaStep empresa={empresa} setEmpresa={setEmpresa} />}
      {currentStep === 1 && <AdminStep admins={admins} setAdmins={setAdmins} />}
      {currentStep === 2 && (
        <TrabajadoresStep
          trabajadores={trabajadores}
          setTrabajadores={setTrabajadores}
          grupos={empresa.grupos}
          errors={trabajadoresErrors}
          setErrors={setTrabajadoresErrors}
          ensureGrupoByName={ensureGrupoByName}
        />
      )}
      {currentStep === 3 && <TurnosStep turnos={turnos} setTurnos={setTurnos} />}
      {currentStep === 4 && (
        <PlanificacionesStep
          planificaciones={planificaciones}
          setPlanificaciones={setPlanificaciones}
          turnos={turnos}
        />
      )}
      {currentStep === 5 && (
        <AsignacionStep
          asignaciones={asignaciones}
          setAsignaciones={setAsignaciones}
          trabajadores={trabajadores}
          planificaciones={planificaciones}
          grupos={empresa.grupos}
          errorGlobal={errorGlobalAsignaciones}
        />
      )}
      {currentStep === 6 && (
        <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-emerald-900">Onboarding completado</h2>
          <p className="text-sm text-emerald-800">
            Todos los datos han sido registrados correctamente. Ahora se crearán los turnos, planificaciones y
            asignaciones en el sistema.
          </p>
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
          ←Atrás
        </button>

        <span className="text-sm text-slate-600">
          Paso {currentStep + 1} de {steps.length}
        </span>

        {currentStep < steps.length - 1 ? (
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
            onClick={handleFinal}
            className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Completar
          </button>
        )}
      </div>
    </div>
  )
}
