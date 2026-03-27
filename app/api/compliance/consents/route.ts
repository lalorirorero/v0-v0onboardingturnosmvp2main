import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceClient, isAuthorizedComplianceRequest, toPositiveInt, toNullableString } from "@/lib/compliance"

type ConsentEventRow = {
  id: number
  onboarding_id: string
  subject_type: "empresa_representante" | "titular" | "partner_user"
  event_type:
    | "privacy_notice_shown"
    | "privacy_notice_accepted"
    | "representative_declaration_accepted"
    | "marketing_opt_in"
    | "marketing_opt_out"
  policy_version: string
  legal_text_hash: string | null
  ip_address: string | null
  user_agent: string | null
  source: string
  metadata: Record<string, unknown>
  created_at: string
}

type OnboardingSummary = {
  id: string
  id_zoho: string | null
  source_crm: string | null
  source_partner: string | null
  policy_version: string | null
}

const CONSENT_EVENT_TYPES = [
  "privacy_notice_shown",
  "privacy_notice_accepted",
  "representative_declaration_accepted",
  "marketing_opt_in",
  "marketing_opt_out",
] as const

const CONSENT_SUBJECT_TYPES = ["empresa_representante", "titular", "partner_user"] as const

type ConsentEventType = (typeof CONSENT_EVENT_TYPES)[number]
type ConsentSubjectType = (typeof CONSENT_SUBJECT_TYPES)[number]

type ConsentApiResponse = {
  success: boolean
  error?: string
  filters?: Record<string, unknown>
  total?: number
  events?: Array<
    ConsentEventRow & {
      onboarding?: OnboardingSummary | null
    }
  >
}

const isValidIsoDate = (value: string | null) => {
  if (!value) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime())
}

const isValidConsentEventType = (value: string): value is ConsentEventType =>
  CONSENT_EVENT_TYPES.includes(value as ConsentEventType)

const isValidConsentSubjectType = (value: string): value is ConsentSubjectType =>
  CONSENT_SUBJECT_TYPES.includes(value as ConsentSubjectType)

export async function GET(request: NextRequest) {
  if (!isAuthorizedComplianceRequest(request)) {
    return NextResponse.json<ConsentApiResponse>({ success: false, error: "No autorizado." }, { status: 401 })
  }

  const supabase = getSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json<ConsentApiResponse>(
      { success: false, error: "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = toPositiveInt(searchParams.get("limit"), 100, 1, 500)
    const onboardingId = toNullableString(searchParams.get("onboardingId"))
    const idZoho = toNullableString(searchParams.get("idZoho"))
    const eventType = toNullableString(searchParams.get("eventType"))
    const subjectType = toNullableString(searchParams.get("subjectType"))
    const hasLegalHash = toNullableString(searchParams.get("hasLegalHash"))
    const from = toNullableString(searchParams.get("from"))
    const to = toNullableString(searchParams.get("to"))
    const includeOnboarding = (toNullableString(searchParams.get("includeOnboarding")) || "").toLowerCase() === "true"

    if (eventType && !isValidConsentEventType(eventType)) {
      return NextResponse.json<ConsentApiResponse>(
        { success: false, error: `eventType invalido. Valores permitidos: ${CONSENT_EVENT_TYPES.join(", ")}.` },
        { status: 400 },
      )
    }

    if (subjectType && !isValidConsentSubjectType(subjectType)) {
      return NextResponse.json<ConsentApiResponse>(
        { success: false, error: `subjectType invalido. Valores permitidos: ${CONSENT_SUBJECT_TYPES.join(", ")}.` },
        { status: 400 },
      )
    }

    if (from && !isValidIsoDate(from)) {
      return NextResponse.json<ConsentApiResponse>(
        { success: false, error: "Parametro 'from' invalido. Debe ser fecha ISO valida." },
        { status: 400 },
      )
    }

    if (to && !isValidIsoDate(to)) {
      return NextResponse.json<ConsentApiResponse>(
        { success: false, error: "Parametro 'to' invalido. Debe ser fecha ISO valida." },
        { status: 400 },
      )
    }

    if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
      return NextResponse.json<ConsentApiResponse>(
        { success: false, error: "Rango de fechas invalido: 'from' no puede ser mayor que 'to'." },
        { status: 400 },
      )
    }

    let onboardingIdsByZoho: string[] | null = null
    if (idZoho) {
      const onboardingResult = await supabase.from("onboardings").select("id").eq("id_zoho", idZoho).limit(5000)
      if (onboardingResult.error) {
        console.error("[v0] compliance/consents: Error buscando onboarding por idZoho:", onboardingResult.error)
        return NextResponse.json<ConsentApiResponse>(
          { success: false, error: `Error consultando onboardings por idZoho: ${onboardingResult.error.message}` },
          { status: 500 },
        )
      }

      onboardingIdsByZoho = (onboardingResult.data || []).map((row: { id: unknown }) => String(row.id))
      if (onboardingIdsByZoho.length === 0) {
        return NextResponse.json<ConsentApiResponse>({
          success: true,
          filters: {
            limit,
            onboardingId,
            idZoho,
            eventType,
            subjectType,
            hasLegalHash,
            from,
            to,
            includeOnboarding,
          },
          total: 0,
          events: [],
        })
      }
    }

    let query = supabase
      .from("onboarding_consents")
      .select(
        "id,onboarding_id,subject_type,event_type,policy_version,legal_text_hash,ip_address,user_agent,source,metadata,created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(limit)

    if (onboardingId) {
      query = query.eq("onboarding_id", onboardingId)
    }
    if (onboardingIdsByZoho && onboardingIdsByZoho.length > 0) {
      query = query.in("onboarding_id", onboardingIdsByZoho)
    }
    if (eventType) {
      query = query.eq("event_type", eventType)
    }
    if (subjectType) {
      query = query.eq("subject_type", subjectType)
    }
    if (hasLegalHash === "true") {
      query = query.not("legal_text_hash", "is", null)
    } else if (hasLegalHash === "false") {
      query = query.is("legal_text_hash", null)
    }
    if (from) {
      query = query.gte("created_at", from)
    }
    if (to) {
      query = query.lte("created_at", to)
    }

    const result = await query
    if (result.error) {
      console.error("[v0] compliance/consents: Error consultando onboarding_consents:", result.error)
      return NextResponse.json<ConsentApiResponse>(
        { success: false, error: `Error consultando consentimientos: ${result.error.message}` },
        { status: 500 },
      )
    }

    let events = (result.data || []) as ConsentEventRow[]

    if (includeOnboarding && events.length > 0) {
      const onboardingIds = Array.from(new Set(events.map((event) => event.onboarding_id)))
      const onboardingSummaryResult = await supabase
        .from("onboardings")
        .select("id,id_zoho,source_crm,source_partner,policy_version")
        .in("id", onboardingIds)

      if (onboardingSummaryResult.error) {
        console.error("[v0] compliance/consents: Error consultando resumen de onboardings:", onboardingSummaryResult.error)
      } else {
        const onboardingMap = new Map<string, OnboardingSummary>()
        const rows = (onboardingSummaryResult.data || []) as OnboardingSummary[]
        for (const row of rows) {
          onboardingMap.set(String(row.id), {
            id: String(row.id),
            id_zoho: row.id_zoho || null,
            source_crm: row.source_crm || null,
            source_partner: row.source_partner || null,
            policy_version: row.policy_version || null,
          })
        }

        events = events.map((event) => ({
          ...event,
          onboarding: onboardingMap.get(String(event.onboarding_id)) || null,
        }))
      }
    }

    return NextResponse.json<ConsentApiResponse>({
      success: true,
      filters: {
        limit,
        onboardingId,
        idZoho,
        eventType,
        subjectType,
        hasLegalHash,
        from,
        to,
        includeOnboarding,
      },
      total: result.count ?? events.length,
      events,
    })
  } catch (error) {
    console.error("[v0] compliance/consents: Error critico:", error)
    return NextResponse.json<ConsentApiResponse>(
      { success: false, error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 },
    )
  }
}
