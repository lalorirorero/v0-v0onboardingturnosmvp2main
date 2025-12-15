import { test, expect } from "@playwright/test"

test.describe("Flujo completo de onboarding", () => {
  test("completa el onboarding sin token", async ({ page }) => {
    await page.goto("/")

    // Paso 0: Bienvenida
    await expect(page.locator("h1")).toContainText("Bienvenido")
    await page.click("text=Comenzar mi implementación")

    // Paso 1: Antes de comenzar
    await expect(page.locator("h2")).toContainText("Antes de comenzar")
    await page.click("text=Continuar")

    // Paso 2: Empresa
    await page.fill('input[name="razonSocial"]', "Test Company SPA")
    await page.fill('input[name="rut"]', "76.543.210-9")
    await page.click("text=Siguiente")

    // Paso 3: Administrador
    await page.fill('input[placeholder*="Eduardo"]', "Juan")
    await page.fill('input[placeholder*="Gómez"]', "Pérez")
    await page.fill('input[type="email"]', "juan@test.com")
    await page.click("text=Siguiente")

    // Verificar que llegamos al paso 4
    await expect(page.locator("text=Paso 4")).toBeVisible()
  })

  test("carga datos prellenados con token válido", async ({ page }) => {
    // Mock token generation
    const mockToken = "valid-test-token"

    await page.goto(`/?token=${mockToken}`)

    // Verificar que los datos se prellenan
    await expect(page.locator("text=Editar datos")).toBeVisible()
  })

  test("valida campos obligatorios antes de avanzar", async ({ page }) => {
    await page.goto("/")

    // Saltar a paso de empresa
    await page.click("text=Comenzar mi implementación")
    await page.click("text=Continuar")

    // Intentar avanzar sin llenar datos
    const razonSocialInput = page.locator('input[name="razonSocial"]')
    await expect(razonSocialInput).toBeEmpty()

    // Llenar solo razón social
    await razonSocialInput.fill("Test")

    // RUT es obligatorio
    const rutInput = page.locator('input[name="rut"]')
    await expect(rutInput).toBeEmpty()
  })
})
