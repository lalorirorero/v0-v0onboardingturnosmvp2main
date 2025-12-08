"use server"

interface ZohoPayload {
  accion: "crear" | "actualizar"
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

export async function submitToZoho(payload: ZohoPayload | any) {
  const zohoFlowUrl = process.env.ZOHO_FLOW_TEST_URL

  if (!zohoFlowUrl) {
    return {
      success: false,
      error: "ZOHO_FLOW_TEST_URL no está configurado",
    }
  }

  try {
    const dataToSend = {
      accion: payload.accion || "actualizar",
      timestamp: payload.timestamp || new Date().toISOString(),
      eventType: payload.eventType || "unknown",
      ...(payload.formData && { formData: payload.formData }),
      ...(payload.metadata && { metadata: payload.metadata }),
    }

    const response = await fetch(zohoFlowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    })

    const responseText = await response.text()

    if (!response.ok) {
      return {
        success: false,
        error: `Error del servidor: ${response.status}`,
        details: responseText,
      }
    }

    // Try to parse as JSON, fallback to text
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    return {
      success: true,
      data: responseData,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
