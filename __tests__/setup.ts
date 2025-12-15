import "@testing-library/jest-dom"
import { beforeAll, afterEach, afterAll } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"

// Mock del endpoint de Zoho Flow
export const zohoFlowHandlers = [
  http.post(process.env.ZOHO_FLOW_TEST_URL || "https://flow.zoho.com/test", async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      message: "Datos recibidos correctamente",
      data: body,
    })
  }),
]

export const server = setupServer(...zohoFlowHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Mock de environment variables para tests
process.env.ENCRYPTION_SECRET = "test-secret-key-for-encryption"
process.env.ZOHO_FLOW_TEST_URL = "https://flow.zoho.com/test"
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000"
