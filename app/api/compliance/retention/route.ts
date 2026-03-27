import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceClient, isAuthorizedComplianceRequest, toPositiveInt } from "@/lib/compliance"

type RetentionResponse = {
  success: boolean
  error?: string
  retention?: {
    processedCount: number
    limit: number
  }
  emailRetention?: {
    processedCount: number
    days: number
    limit: number
    skipped?: boolean
  }
  history?: {
    prunedRows: number
    keepDays: number
  }
  executedAt?: string
}

const extractProcessedCount = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return 0
  const first = value[0] as Record<string, unknown>
  const candidate = Number(first?.processed_count ?? first?.processedCount ?? 0)
  if (!Number.isFinite(candidate)) return 0
  return Math.max(0, Math.trunc(candidate))
}

const extractPrunedRows = (value: unknown) => {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.trunc(parsed))
}

const isMissingRpcFunctionError = (error: any) => {
  const code = String(error?.code || "")
  const message = String(error?.message || "").toLowerCase()
  return (
    code === "42883" ||
    code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("function") && message.includes("does not exist")
  )
}

const runRetention = async (
  retentionLimit: number,
  historyKeepDays: number,
  emailRetentionDays: number,
  emailRetentionLimit: number,
) => {
  try {
    const supabase = getSupabaseServiceClient()
    if (!supabase) {
      return NextResponse.json<RetentionResponse>(
        { success: false, error: "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 },
      )
    }

    const retentionResult = await supabase.rpc("run_onboarding_retention", { p_limit: retentionLimit })
    if (retentionResult.error) {
      console.error("[v0] compliance/retention: Error run_onboarding_retention:", retentionResult.error)
      return NextResponse.json<RetentionResponse>(
        { success: false, error: `Error ejecutando run_onboarding_retention: ${retentionResult.error.message}` },
        { status: 500 },
      )
    }

    const emailRetentionResult = await supabase.rpc("purge_onboarding_personal_emails", {
      p_limit: emailRetentionLimit,
      p_days: emailRetentionDays,
    })

    let emailRetentionProcessed = 0
    let emailRetentionSkipped = false

    if (emailRetentionResult.error) {
      if (isMissingRpcFunctionError(emailRetentionResult.error)) {
        emailRetentionSkipped = true
        console.warn(
          "[v0] compliance/retention: purge_onboarding_personal_emails no disponible en esquema actual. Se omite.",
        )
      } else {
        console.error(
          "[v0] compliance/retention: Error purge_onboarding_personal_emails:",
          emailRetentionResult.error,
        )
        return NextResponse.json<RetentionResponse>(
          {
            success: false,
            error: `Error ejecutando purge_onboarding_personal_emails: ${emailRetentionResult.error.message}`,
          },
          { status: 500 },
        )
      }
    } else {
      emailRetentionProcessed = extractProcessedCount(emailRetentionResult.data)
    }

    const historyResult = await supabase.rpc("prune_onboarding_history", { p_keep_days: historyKeepDays })
    if (historyResult.error) {
      console.error("[v0] compliance/retention: Error prune_onboarding_history:", historyResult.error)
      return NextResponse.json<RetentionResponse>(
        { success: false, error: `Error ejecutando prune_onboarding_history: ${historyResult.error.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json<RetentionResponse>({
      success: true,
      retention: {
        processedCount: extractProcessedCount(retentionResult.data),
        limit: retentionLimit,
      },
      emailRetention: {
        processedCount: emailRetentionProcessed,
        days: emailRetentionDays,
        limit: emailRetentionLimit,
        skipped: emailRetentionSkipped ? true : undefined,
      },
      history: {
        prunedRows: extractPrunedRows(historyResult.data),
        keepDays: historyKeepDays,
      },
      executedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] compliance/retention: Error crítico:", error)
    return NextResponse.json<RetentionResponse>(
      { success: false, error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedComplianceRequest(request)) {
    return NextResponse.json<RetentionResponse>({ success: false, error: "No autorizado." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const shouldRun = searchParams.get("run") === "true"

  if (!shouldRun) {
    return NextResponse.json<RetentionResponse>({
      success: true,
      executedAt: new Date().toISOString(),
    })
  }

  const retentionLimit = toPositiveInt(searchParams.get("retentionLimit"), 500, 1, 5000)
  const historyKeepDays = toPositiveInt(searchParams.get("historyKeepDays"), 180, 1, 3650)
  const emailRetentionDays = toPositiveInt(searchParams.get("emailRetentionDays"), 90, 1, 3650)
  const emailRetentionLimit = toPositiveInt(searchParams.get("emailRetentionLimit"), 500, 1, 5000)
  return runRetention(retentionLimit, historyKeepDays, emailRetentionDays, emailRetentionLimit)
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedComplianceRequest(request)) {
    return NextResponse.json<RetentionResponse>({ success: false, error: "No autorizado." }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const retentionLimit = toPositiveInt(body?.retentionLimit, 500, 1, 5000)
  const historyKeepDays = toPositiveInt(body?.historyKeepDays, 180, 1, 3650)
  const emailRetentionDays = toPositiveInt(body?.emailRetentionDays, 90, 1, 3650)
  const emailRetentionLimit = toPositiveInt(body?.emailRetentionLimit, 500, 1, 5000)
  return runRetention(retentionLimit, historyKeepDays, emailRetentionDays, emailRetentionLimit)
}
