import { test, expect } from "@playwright/test"

test.describe("Anti-regresión: Persistencia", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => localStorage.clear())
  })

  test("El botón 'Partir desde el comienzo' no borra prefill", async ({ page }) => {
    // TODO: Implementar con token mock
    expect(true).toBe(true)
  })

  test("Editar campos no borra rubro seleccionado", async ({ page }) => {
    // TODO: Implementar
    expect(true).toBe(true)
  })

  test("Refrescar página restaura borrador correctamente", async ({ page }) => {
    // Completar paso 1
    await page.fill('input[name="empresa.razonSocial"]', "Empresa Test")
    await page.fill('input[name="empresa.rut"]', "12345678-9")
    await page.click('button:has-text("Siguiente")')

    // Esperar que se guarde el borrador
    await page.waitForTimeout(600)

    // Refrescar página
    await page.reload()

    // Verificar que aparece el diálogo
    await expect(page.locator('text="Tienes un borrador guardado"')).toBeVisible()

    // Continuar
    await page.click('button:has-text("Continuar donde lo dejé")')

    // Verificar que los datos están presentes
    await expect(page.locator('input[name="empresa.razonSocial"]')).toHaveValue("Empresa Test")
  })
})
