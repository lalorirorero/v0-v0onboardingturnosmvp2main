import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// GET /api/onboarding/[id] - Obtener datos actuales del onboarding
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 })
    }

    console.log(`[v0] GET /api/onboarding/${id}`)

    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase.from("onboardings").select("*").eq("id", id).single()

    if (error) {
      console.error("[v0] Error obteniendo onboarding:", error)
      return NextResponse.json({ success: false, error: "Onboarding no encontrado" }, { status: 404 })
    }

    console.log(`[v0] Onboarding encontrado - Paso: ${data.ultimo_paso}`)

    return NextResponse.json({
      success: true,
      formData: data.datos_actuales,
      lastStep: data.estado === "Completado" ? 11 : data.ultimo_paso,
      currentStep: data.ultimo_paso,
      navigationHistory: data.navigation_history,
      estado: data.estado,
      isLocked: data.estado === "Completado",
    })
  } catch (error) {
    console.error("[v0] Error en GET /api/onboarding/[id]:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}

// PATCH /api/onboarding/[id] - Actualizar datos del onboarding
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 })
    }

    const { formData, currentStep, navigationHistory, estado, fecha_completado } = body

    if (!formData || typeof currentStep !== "number") {
      return NextResponse.json({ success: false, error: "Datos inválidos" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data: existingRow, error: existingError } = await supabase
      .from("onboardings")
      .select("datos_actuales, estado, ultimo_paso, navigation_history")
      .eq("id", id)
      .single()

    if (existingError) {
      console.error("[v0] Error obteniendo onboarding para merge:", existingError)
      return NextResponse.json({ success: false, error: "Onboarding no encontrado" }, { status: 404 })
    }

    const isNonEmptyArray = (value: unknown): value is unknown[] => Array.isArray(value) && value.length > 0

    const shouldUseArray = (incoming: unknown, step: number, allowedSteps: number[]) => {
      if (isNonEmptyArray(incoming)) return true
      return Array.isArray(incoming) && allowedSteps.includes(step)
    }

    const mergeFormData = (existing: any, incoming: any, step: number) => {
      const mergedEmpresa = {
        ...(existing?.empresa || {}),
        ...(incoming?.empresa || {}),
      }

      if (shouldUseArray(incoming?.empresa?.grupos, step, [5])) {
        mergedEmpresa.grupos = incoming.empresa.grupos
      } else if (Array.isArray(existing?.empresa?.grupos)) {
        mergedEmpresa.grupos = existing.empresa.grupos
      }

      const merged = {
        ...existing,
        ...incoming,
        empresa: mergedEmpresa,
      }

      if (shouldUseArray(incoming?.admins, step, [3])) merged.admins = incoming.admins
      else if (Array.isArray(existing?.admins)) merged.admins = existing.admins

      if (shouldUseArray(incoming?.trabajadores, step, [5])) merged.trabajadores = incoming.trabajadores
      else if (Array.isArray(existing?.trabajadores)) merged.trabajadores = existing.trabajadores

      if (shouldUseArray(incoming?.turnos, step, [7])) merged.turnos = incoming.turnos
      else if (Array.isArray(existing?.turnos)) merged.turnos = existing.turnos

      if (shouldUseArray(incoming?.planificaciones, step, [8])) merged.planificaciones = incoming.planificaciones
      else if (Array.isArray(existing?.planificaciones)) merged.planificaciones = existing.planificaciones

      if (shouldUseArray(incoming?.asignaciones, step, [9])) merged.asignaciones = incoming.asignaciones
      else if (Array.isArray(existing?.asignaciones)) merged.asignaciones = existing.asignaciones

      if (incoming?.configureNow === undefined && existing?.configureNow !== undefined) {
        merged.configureNow = existing.configureNow
      }

      if (incoming?.loadWorkersNow === undefined && existing?.loadWorkersNow !== undefined) {
        merged.loadWorkersNow = existing.loadWorkersNow
      }

      return merged
    }

    if (existingRow?.estado === "Completado") {
      console.log(`[v0] Onboarding ${id} bloqueado (Completado). Ignorando actualizacion.`)
      return NextResponse.json({ success: true, locked: true })
    }

    const existingStep = Number(existingRow?.ultimo_paso ?? 0)
    const incomingStep = Number(currentStep)
    const nextStep = Math.max(existingStep, incomingStep)
    if (incomingStep < existingStep) {
      console.log(
        `[v0] Onboarding ${id}: paso entrante ${incomingStep} menor que ultimo paso ${existingStep}. Conservando ultimo paso.`,
      )
    }

    const mergedFormData = mergeFormData(existingRow?.datos_actuales || {}, formData, currentStep)


    const existingHistory = Array.isArray(existingRow?.navigation_history) ? existingRow.navigation_history : []
    const incomingHistory = Array.isArray(navigationHistory) ? navigationHistory : []
    const nextHistory = incomingStep < existingStep && existingHistory.length > 0 ? existingHistory : incomingHistory

    const updateData: any = {
      datos_actuales: mergedFormData,
      ultimo_paso: nextStep,
      navigation_history: nextHistory,
      fecha_ultima_actualizacion: new Date().toISOString(),
    }

    // Si se pasa estado, actualizarlo
    if (estado && incomingStep >= existingStep) {
      updateData.estado = estado
    }

    // Si se pasa fecha_completado, actualizarla
    if (fecha_completado) {
      updateData.fecha_completado = fecha_completado
    }

    // Si no está en estado pendiente, cambiar a en_progreso
    if (!estado && nextStep > 0) {
      updateData.estado = "en_progreso"
    }

    const { error } = await supabase.from("onboardings").update(updateData).eq("id", id)

    if (error) {
      console.error("[v0] Error actualizando onboarding:", error)
      return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 })
    }

    console.log(`[v0] Onboarding ${id} actualizado - Paso: ${currentStep}`)

    try {
      const { error: historyError } = await supabase.from("onboarding_history").insert({
        onboarding_id: id,
        source: "api_onboarding_patch",
        event_type: "patch",
        current_step: currentStep,
        estado: estado || null,
        payload: body,
        created_at: new Date().toISOString(),
      })
      if (historyError) {
        console.error("[v0] Error insertando onboarding_history:", historyError)
      }
    } catch (historyInsertError) {
      console.error("[v0] Error inesperado insertando onboarding_history:", historyInsertError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error en PATCH /api/onboarding/[id]:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
