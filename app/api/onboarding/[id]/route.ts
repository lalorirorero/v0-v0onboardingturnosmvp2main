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
      lastStep: data.ultimo_paso,
      navigationHistory: data.navigation_history,
      estado: data.estado,
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

    const updateData: any = {
      datos_actuales: formData,
      ultimo_paso: currentStep,
      navigation_history: navigationHistory,
      fecha_ultima_actualizacion: new Date().toISOString(),
    }

    // Si se pasa estado, actualizarlo
    if (estado) {
      updateData.estado = estado
    }

    // Si se pasa fecha_completado, actualizarla
    if (fecha_completado) {
      updateData.fecha_completado = fecha_completado
    }

    // Si no está en estado pendiente, cambiar a en_progreso
    if (!estado && currentStep > 0) {
      updateData.estado = "en_progreso"
    }

    const { error } = await supabase.from("onboardings").update(updateData).eq("id", id)

    if (error) {
      console.error("[v0] Error actualizando onboarding:", error)
      return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 })
    }

    console.log(`[v0] Onboarding ${id} actualizado - Paso: ${currentStep}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error en PATCH /api/onboarding/[id]:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
