import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"

const DEFAULT_TOKEN_TTL_DAYS = 30
const NUBOX_TOKEN_PREFIX = "nbx_"

const toNonEmptyString = (value: unknown) => {
  if (typeof value !== "string") return ""
  return value.trim()
}

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "si", "sí", "yes"].includes(normalized)) return true
    if (["false", "0", "no"].includes(normalized)) return false
  }
  return fallback
}

const getTokenTtlDays = () => {
  const raw = Number.parseInt(process.env.ONBOARDING_TOKEN_TTL_DAYS || "", 10)
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TOKEN_TTL_DAYS
  return raw
}

const isSchemaCompatibilityError = (error: any) => {
  const code = String(error?.code || "")
  const message = String(error?.message || "").toLowerCase()
  return (
    code === "42703" ||
    code === "PGRST204" ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("could not find") && message.includes("column"))
  )
}

const parseBearerToken = (value: string | null) => {
  if (!value) return ""
  const [scheme, token] = value.trim().split(/\s+/, 2)
  if (!scheme || !token) return ""
  if (scheme.toLowerCase() !== "bearer") return ""
  return token
}

const isAuthorizedNuboxRequest = (request: NextRequest) => {
  const configuredSecret = process.env.NUBOX_PARTNER_API_KEY || ""
  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production"
  }

  const headerSecret =
    request.headers.get("x-nubox-api-key") ||
    request.headers.get("x-api-key") ||
    request.headers.get("x-partner-secret") ||
    ""
  const bearerSecret = parseBearerToken(request.headers.get("authorization"))
  return headerSecret === configuredSecret || bearerSecret === configuredSecret
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedNuboxRequest(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado. Debes enviar credenciales válidas de Nubox.",
        },
        { status: 401 },
      )
    }

    let body
    try {
      const text = await request.text()

      if (!text || text.trim() === "") {
        return NextResponse.json(
          {
            success: false,
            error: "El body de la solicitud está vacío. Debes enviar un JSON con los datos de la empresa.",
          },
          { status: 400 },
        )
      }

      body = JSON.parse(text)
    } catch (parseError) {
      console.error("[v0] nubox/generate-link: Error parseando JSON:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "El body de la solicitud no es un JSON válido. Verifica el formato.",
        },
        { status: 400 },
      )
    }

    if (!body.empresa && !body.empresaData) {
      return NextResponse.json(
        {
          success: false,
          error: "Se requiere el campo 'empresa' o 'empresaData' con los datos de la empresa.",
        },
        { status: 400 },
      )
    }

    const id_zoho = body.id_zoho ? String(body.id_zoho) : null
    const tokenTtlDays = getTokenTtlDays()
    const tokenExpiresAt = new Date(Date.now() + tokenTtlDays * 24 * 60 * 60 * 1000).toISOString()

    const sourceCrm = toNonEmptyString(body.source_crm || body.sourceCRM) || "nubox_partner_api"
    const sourcePartner = "nubox"
    const processingPurpose =
      toNonEmptyString(body.processing_purpose || body.processingPurpose) || "onboarding_cliente_partner"
    const legalBasis = toNonEmptyString(body.legal_basis || body.legalBasis) || "ejecucion_contractual"
    const policyVersion = toNonEmptyString(body.policy_version || body.policyVersion) || "v1"
    const representativeDeclarationAccepted = toBoolean(
      body.representative_declaration_accepted ?? body.representativeDeclarationAccepted,
      false,
    )

    const formData = {
      empresa: {
        razonSocial: body.empresa?.razonSocial || body.empresaData?.razonSocial || "",
        nombreFantasia: body.empresa?.nombreFantasia || body.empresaData?.nombreFantasia || "",
        rut: body.empresa?.rut || body.empresaData?.rut || "",
        giro: body.empresa?.giro || body.empresaData?.giro || "",
        direccion: body.empresa?.direccion || body.empresaData?.direccion || "",
        comuna: body.empresa?.comuna || body.empresaData?.comuna || "",
        emailFacturacion: body.empresa?.emailFacturacion || body.empresaData?.emailFacturacion || "",
        telefonoContacto: body.empresa?.telefonoContacto || body.empresaData?.telefonoContacto || "",
        ejecutivoTelefono: body.empresa?.ejecutivoTelefono || body.empresaData?.ejecutivoTelefono || "",
        ejecutivoNombre: body.empresa?.ejecutivoNombre || body.empresaData?.ejecutivoNombre || "",
        sistema: body.empresa?.sistema || body.empresaData?.sistema || [],
        modulosAdicionales: body.empresa?.modulosAdicionales || body.empresaData?.modulosAdicionales || [],
        modulosAdicionalesOtro:
          body.empresa?.modulosAdicionalesOtro || body.empresaData?.modulosAdicionalesOtro || "",
        rubro: body.empresa?.rubro || body.empresaData?.rubro || "",
        grupos: [],
        id_zoho: id_zoho,
      },
      admins: body.admins || body.empresaData?.admins || [],
      trabajadores: body.trabajadores || body.empresaData?.trabajadores || [],
      turnos: body.turnos || body.empresaData?.turnos || [],
      planificaciones: body.planificaciones || body.empresaData?.planificaciones || [],
      asignaciones: body.asignaciones || body.empresaData?.asignaciones || [],
      configureNow: false,
      loadWorkersNow: false,
      empresaDataSource: "token",
      hubspotFound: true,
      missingFields: [],
      hardwareUsb: body.hardwareUsb || {
        arriendoValor: "",
        cantidadLectores: "",
        instalacionIncluida: "",
        instalacionValor: "",
        envioIncluido: "",
        envioValor: "",
        direccionEnvioInstalacion: "",
        billingEditableContext: false,
      },
    }

    const supabase = getSupabaseAdminClient()
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el servidor.",
        },
        { status: 500 },
      )
    }

    const baseInsertPayload = {
      id_zoho: id_zoho || "sin-id",
      estado: "pendiente",
      datos_actuales: formData,
      ultimo_paso: 0,
      navigation_history: [0],
    }

    const complianceInsertPayload = {
      ...baseInsertPayload,
      source_crm: sourceCrm,
      source_partner: sourcePartner,
      processing_purpose: processingPurpose,
      legal_basis: legalBasis,
      policy_version: policyVersion,
      token_expires_at: tokenExpiresAt,
      representative_declaration_accepted: representativeDeclarationAccepted,
      compliance_metadata: {
        sourceTrigger: toNonEmptyString(body.source_trigger || body.sourceTrigger) || "nubox_api",
        generatedBy: "api_nubox_generate_link",
        partner: "nubox",
      },
    }

    let data: any = null
    let error: any = null

    const firstInsert = await supabase.from("onboardings").insert(complianceInsertPayload).select().single()
    data = firstInsert.data
    error = firstInsert.error

    if (error && isSchemaCompatibilityError(error)) {
      const fallbackInsert = await supabase.from("onboardings").insert(baseInsertPayload).select().single()
      data = fallbackInsert.data
      error = fallbackInsert.error
    }

    if (error) {
      console.error("[v0] nubox/generate-link: Error creando registro en Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: `Error al crear registro en base de datos: ${error.message}`,
        },
        { status: 500 },
      )
    }

    const onboardingId = data.id
    const token = `${NUBOX_TOKEN_PREFIX}${onboardingId}`
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const link = `${baseUrl}?token=${token}`

    return NextResponse.json({
      success: true,
      partner: "nubox",
      tokenType: "nubox_prefixed",
      token,
      onboardingId,
      link,
      tokenExpiresAt,
    })
  } catch (error) {
    console.error("[v0] nubox/generate-link: Error general:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
