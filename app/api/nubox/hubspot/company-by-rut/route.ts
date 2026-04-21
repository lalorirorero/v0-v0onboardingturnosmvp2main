import { type NextRequest, NextResponse } from "next/server"

const HUBSPOT_SEARCH_URL = "https://api.hubapi.com/crm/v3/objects/companies/search"

const REQUIRED_COMPANY_FIELDS = [
  "razonSocial",
  "nombreFantasia",
  "rut",
  "giro",
  "direccion",
  "comuna",
  "emailFacturacion",
  "telefonoContacto",
  "rubro",
] as const

const toStringOrEmpty = (value: unknown) => (typeof value === "string" ? value.trim() : "")
const normalizeRut = (value: string) => value.replace(/\./g, "").toUpperCase().trim()

const parseBearerToken = (value: string | null) => {
  if (!value) return ""
  const [scheme, token] = value.trim().split(/\s+/, 2)
  if (!scheme || !token) return ""
  if (scheme.toLowerCase() !== "bearer") return ""
  return token
}

const isAuthorizedLookupRequest = (request: NextRequest) => {
  const secret = process.env.NUBOX_HUBSPOT_LOOKUP_SECRET || ""
  if (!secret) return true
  const headerSecret = request.headers.get("x-nubox-lookup-secret") || ""
  const bearerSecret = parseBearerToken(request.headers.get("authorization"))
  return headerSecret === secret || bearerSecret === secret
}

const mapHubspotCompany = (properties: Record<string, unknown>) => {
  const razonSocial =
    toStringOrEmpty(properties.razon_social) ||
    toStringOrEmpty(properties.razonsocial) ||
    toStringOrEmpty(properties.name)
  const nombreFantasia =
    toStringOrEmpty(properties.nombre_fantasia) ||
    toStringOrEmpty(properties.nombrefantasia) ||
    toStringOrEmpty(properties.trade_name) ||
    razonSocial
  const rut = toStringOrEmpty(properties.rut)
  const giro = toStringOrEmpty(properties.giro) || toStringOrEmpty(properties.industry)
  const direccion =
    toStringOrEmpty(properties.direccion) ||
    toStringOrEmpty(properties.address) ||
    toStringOrEmpty(properties.address_line_1)
  const comuna = toStringOrEmpty(properties.comuna) || toStringOrEmpty(properties.city)
  const emailFacturacion =
    toStringOrEmpty(properties.email_facturacion) ||
    toStringOrEmpty(properties.billing_email) ||
    toStringOrEmpty(properties.email)
  const telefonoContacto =
    toStringOrEmpty(properties.telefono_contacto) || toStringOrEmpty(properties.phone) || toStringOrEmpty(properties.mobilephone)
  const rubro = toStringOrEmpty(properties.rubro) || toStringOrEmpty(properties.industry)

  return {
    razonSocial,
    nombreFantasia,
    rut,
    giro,
    direccion,
    comuna,
    emailFacturacion,
    telefonoContacto,
    rubro,
  }
}

const getMissingFields = (company: Record<string, string>) => {
  return REQUIRED_COMPANY_FIELDS.filter((key) => !toStringOrEmpty(company[key]))
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedLookupRequest(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado.",
        },
        { status: 401 },
      )
    }

    const hubspotToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN || ""
    if (!hubspotToken) {
      return NextResponse.json(
        {
          success: false,
          error: "HUBSPOT_PRIVATE_APP_TOKEN no configurado.",
        },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const rutRaw = toStringOrEmpty(body?.rut)
    const rut = normalizeRut(rutRaw)
    if (!rut) {
      return NextResponse.json(
        {
          success: false,
          error: "Debes informar un RUT valido.",
        },
        { status: 400 },
      )
    }

    const requestBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "rut",
              operator: "EQ",
              value: rut,
            },
          ],
        },
      ],
      properties: [
        "name",
        "rut",
        "razon_social",
        "nombre_fantasia",
        "giro",
        "industry",
        "direccion",
        "address",
        "comuna",
        "city",
        "email_facturacion",
        "billing_email",
        "email",
        "telefono_contacto",
        "phone",
        "rubro",
      ],
      limit: 1,
    }

    const response = await fetch(HUBSPOT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hubspotToken}`,
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: payload?.message || `HubSpot search error (${response.status})`,
        },
        { status: 500 },
      )
    }

    const first = Array.isArray(payload?.results) && payload.results.length > 0 ? payload.results[0] : null
    if (!first?.properties) {
      return NextResponse.json({
        success: true,
        found: false,
      })
    }

    const company = mapHubspotCompany(first.properties as Record<string, unknown>)
    if (!company.rut) company.rut = rut
    const missingFields = getMissingFields(company)

    return NextResponse.json({
      success: true,
      found: true,
      company,
      missingFields,
    })
  } catch (error) {
    console.error("[v0] nubox/hubspot/company-by-rut error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
