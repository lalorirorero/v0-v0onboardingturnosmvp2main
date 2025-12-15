import { test, expect } from "@playwright/test"

test.describe("Envío de webhooks a Zoho Flow", () => {
  test("envía webhook de progreso al cambiar de paso", async ({ page }) => {
    let webhookReceived = false
    let webhookPayload: any = null

    await page.route("**/api/submit-to-zoho", async (route) => {
      const request = route.request()
      webhookPayload = request.postDataJSON()
      webhookReceived = true

      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto("/")
    await page.click("text=Comenzar mi implementación")
    await page.click("text=Continuar")

    // Llenar datos mínimos
    await page.fill('input[name="razonSocial"]', "Test Company")
    await page.fill('input[name="rut"]', "76.543.210-9")
    await page.click("text=Siguiente")

    // Verificar que se envió el webhook
    await page.waitForTimeout(1000) // Esperar a que se envíe
    expect(webhookReceived).toBe(true)
    expect(webhookPayload).toHaveProperty("eventType", "progress")
  })

  test("envía webhook final al completar onboarding", async ({ page }) => {
    let finalWebhookReceived = false
    let finalPayload: any = null

    await page.route("**/api/submit-to-zoho", async (route) => {
      const payload = route.request().postDataJSON()

      if (payload.eventType === "complete") {
        finalWebhookReceived = true
        finalPayload = payload
      }

      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    })

    // Completar flujo básico (este test puede ser largo)
    await page.goto("/")
    // ... llenar todos los pasos ...

    // Verificar estructura del payload final
    expect(finalPayload).toHaveProperty("formData")
    expect(finalPayload).toHaveProperty("metadata")
    expect(finalPayload).toHaveProperty("excelFile")
  })
})
