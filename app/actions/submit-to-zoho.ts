"use server"

export async function submitToZoho(formData: any) {
  const zohoFlowUrl = process.env.ZOHO_FLOW_TEST_URL

  if (!zohoFlowUrl) {
    return {
      success: false,
      error: "ZOHO_FLOW_TEST_URL no está configurado",
    }
  }

  try {
    const response = await fetch(zohoFlowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        formData: formData,
      }),
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
