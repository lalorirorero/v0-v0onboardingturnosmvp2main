/**
 * BACKEND UNIFICADO - ARQUITECTURA SIMPLE
 * =======================================
 *
 * Este módulo centraliza toda la lógica del backend en un solo lugar.
 *
 * FUNCIONALIDADES:
 * 1. Generación y desencriptación de tokens para prellenar formularios
 * 2. Envío de datos a Zoho Flow con el parámetro "accion"
 * 3. Tracking de progreso (opcional, fire-and-forget)
 *
 * NO incluye:
 * - Persistencia en localStorage (se maneja en el componente)
 * - Protección de datos compleja (se simplifica en el componente)
 * - Hooks complejos con múltiples dependencias
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface EmpresaData {
  id_zoho?: string // ID del registro en Zoho CRM que generó esta sesión
  razonSocial: string
  nombreFantasia?: string
  rut: string
  giro?: string
  direccion?: string
  comuna?: string
  emailFacturacion?: string
  telefonoContacto?: string
  sistema?: string[]
  rubro?: string
  admins?: any[]
  trabajadores?: any[]
  turnos?: any[]
  planificaciones?: any[]
  asignaciones?: any[]
}

export interface FormData {
  empresa: EmpresaData
  admins: any[]
  trabajadores: any[]
  turnos: any[]
  planificaciones: any[]
  asignaciones: any[]
  configureNow: boolean
}

// ============================================================================
// ENCRIPTACIÓN/DESENCRIPTACIÓN
// ============================================================================

export async function encryptToken(empresaData: EmpresaData): Promise<string> {
  console.log("[v0] backend.encryptToken: Iniciando encriptación")
  console.log("[v0] backend.encryptToken: Datos recibidos:", {
    id_zoho: empresaData.id_zoho,
    razonSocial: empresaData.razonSocial,
    rut: empresaData.rut,
  })

  const jsonString = JSON.stringify(empresaData)
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(jsonString)

  const secret = process.env.ENCRYPTION_SECRET || "default-secret-key"
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "PBKDF2" }, false, [
    "deriveBits",
    "deriveKey",
  ])

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, dataBuffer)

  const resultBuffer = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength)
  resultBuffer.set(salt, 0)
  resultBuffer.set(iv, salt.length)
  resultBuffer.set(new Uint8Array(encryptedBuffer), salt.length + iv.length)

  const token = Buffer.from(resultBuffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")

  console.log("[v0] backend.encryptToken: Token generado exitosamente")

  return token
}

export async function decryptToken(token: string): Promise<EmpresaData | null> {
  try {
    console.log("[v0] backend.decryptToken: Iniciando desencriptación")
    console.log("[v0] backend.decryptToken: Token recibido:", token.substring(0, 20) + "...")

    if (!token || typeof token !== "string") {
      console.error("[v0] backend.decryptToken: Token inválido: debe ser una cadena no vacía")
      return null
    }

    // Restaurar base64 desde URL-safe
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/")
    const padding = "=".repeat((4 - (base64.length % 4)) % 4)

    let buffer: Buffer
    try {
      buffer = Buffer.from(base64 + padding, "base64")
    } catch (bufferError) {
      console.error("[v0] backend.decryptToken: Error al decodificar base64:", bufferError)
      return null
    }

    // Verificar que el buffer tenga el tamaño mínimo esperado
    if (buffer.length < 28) {
      console.error("[v0] backend.decryptToken: Token demasiado corto para ser válido")
      return null
    }

    const salt = buffer.slice(0, 16)
    const iv = buffer.slice(16, 28)
    const encryptedData = buffer.slice(28)

    if (encryptedData.length === 0) {
      console.error("[v0] backend.decryptToken: No hay datos encriptados en el token")
      return null
    }

    const secret = process.env.ENCRYPTION_SECRET || "default-secret-key"
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "PBKDF2" }, false, [
      "deriveBits",
      "deriveKey",
    ])

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    )

    const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encryptedData)

    const decoder = new TextDecoder()
    const jsonString = decoder.decode(decryptedBuffer)

    let parsed
    try {
      parsed = JSON.parse(jsonString)
    } catch (jsonError) {
      console.error("[v0] backend.decryptToken: Error al parsear JSON desencriptado:", jsonError)
      return null
    }

    console.log("[v0] backend.decryptToken: Desencriptación exitosa:", {
      id_zoho: parsed.id_zoho,
      razonSocial: parsed.razonSocial,
      rut: parsed.rut,
      hasAdmins: Array.isArray(parsed.admins),
      hasTrabajadores: Array.isArray(parsed.trabajadores),
    })

    return parsed
  } catch (error) {
    console.error("[v0] backend.decryptToken: Error decrypting token:", error)
    return null
  }
}

// ============================================================================
// ZOHO FLOW
// ============================================================================

export interface ZohoPayload {
  accion: "crear" | "actualizar"
  fechaHoraEnvio: string // Timestamp ISO del envío
  eventType: "started" | "progress" | "complete"
  id_zoho: string | null // Cambiado de opcional a nullable
  formData: FormData | null // Puede ser null en eventos de progreso
  metadata: {
    empresaRut: string
    empresaNombre: string
    pasoActual?: number
    pasoNombre?: string
    totalPasos?: number
    porcentajeProgreso?: number
    totalCambios?: number
    editedFields?: Array<{
      field: string
      originalValue: any
      currentValue: any
    }>
  }
  excelFile?: {
    filename: string
    base64: string
    mimeType: string
  } | null
}

export async function sendToZohoFlow(payload: ZohoPayload): Promise<{
  success: boolean
  error?: string
  data?: any
}> {
  const url = process.env.ZOHO_FLOW_TEST_URL

  if (!url) {
    return {
      success: false,
      error: "ZOHO_FLOW_TEST_URL no configurado",
    }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Error ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json().catch(() => response.text())

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
