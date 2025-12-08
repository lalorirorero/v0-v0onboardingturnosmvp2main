/**
 * MÓDULO DE SINCRONIZACIÓN CON ZOHO FLOW
 * ======================================
 *
 * POLÍTICA DE GATILLANTES:
 *
 * 1. EVENTO "started" - Se envía una sola vez cuando:
 *    - El usuario abre el link por primera vez
 *    - NO se envía si ya existe progreso guardado
 *    - Acción: "crear" en Zoho CRM
 *
 * 2. EVENTO "progress" - Se envía cuando:
 *    - El usuario hace clic en "Siguiente" y avanza exitosamente de paso
 *    - Es un envío asíncrono que NO bloquea la UI
 *    - Si falla, se ignora silenciosamente (no afecta la experiencia)
 *    - Acción: "actualizar" en Zoho CRM
 *
 * 3. EVENTO "complete" - Se envía cuando:
 *    - El usuario hace clic en "Completar y enviar" en el paso de Resumen
 *    - Este es el ÚNICO evento que envía datos completos
 *    - Si falla, se muestra error y se permite reintentar
 *    - Acción: "actualizar" en Zoho CRM
 *
 * PARÁMETRO "accion":
 * - "crear": Primera vez que se registra el onboarding (evento started)
 * - "actualizar": Actualizaciones posteriores (eventos progress y complete)
 *
 * DATOS ENVIADOS:
 * - started/progress: Solo metadata (RUT, nombre empresa, paso actual, % progreso)
 * - complete: Datos completos del formulario + archivo Excel
 */

import type { ZohoTrackingEvent } from "./onboarding-persistence"

export type ZohoAccion = "crear" | "actualizar"

export interface ZohoPayload {
  accion: ZohoAccion
  timestamp: string
  eventType: string
  formData?: any
  metadata?: {
    rut?: string
    nombreEmpresa?: string
    pasoActual?: number
    totalPasos?: number
    porcentajeProgreso?: number
  }
}

// Enviar evento de tracking a Zoho Flow (fire and forget)
export async function sendTrackingEvent(event: ZohoTrackingEvent): Promise<void> {
  try {
    const accion: ZohoAccion = event.eventType === "started" ? "crear" : "actualizar"

    const payload: ZohoPayload = {
      accion,
      timestamp: event.timestamp,
      eventType: event.eventType,
      metadata: {
        rut: event.metadata?.empresaRut,
        nombreEmpresa: event.metadata?.empresaNombre,
        pasoActual: event.metadata?.currentStep,
        totalPasos: event.metadata?.totalSteps,
        porcentajeProgreso: event.metadata?.progressPercent,
      },
    }

    // Envío asíncrono a través de nuestra API
    fetch("/api/submit-to-zoho", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((error) => {
      // Ignorar errores silenciosamente - no afecta la experiencia
      console.log("[ZohoTracking] Error enviando evento (ignorado):", error)
    })
  } catch (error) {
    // Ignorar cualquier error
    console.log("[ZohoTracking] Error preparando evento (ignorado):", error)
  }
}

// Enviar datos completos al finalizar (este SÍ espera respuesta)
export async function sendCompleteData(formData: any): Promise<{
  success: boolean
  message?: string
  error?: string
  data?: any
}> {
  try {
    const payload: ZohoPayload = {
      accion: "actualizar",
      timestamp: new Date().toISOString(),
      eventType: "complete",
      formData,
    }

    const response = await fetch("/api/submit-to-zoho", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
