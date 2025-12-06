"use server"

export async function testZohoWebhook() {
  try {
    const webhookUrl = process.env.ZOHO_FLOW_TEST_URL

    if (!webhookUrl) {
      return {
        success: false,
        error: "ZOHO_FLOW_TEST_URL environment variable not configured",
        response: null,
      }
    }

    const payload = {
      deal_id: "TEST_DEAL_ID",
      mensaje: "Hola Zoho, prueba desde la app",
      timestamp: new Date().toISOString(),
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { _raw: responseText }
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseData,
      sentPayload: payload,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      response: null,
    }
  }
}
