import { describe, it, expect } from "vitest"
import { validateZohoPayload } from "../schemas/zoho-payload.schema"

describe("Schema del Payload de Zoho Flow", () => {
  const validPayload = {
    accion: "crear" as const,
    eventType: "complete" as const,
    id_zoho: "1234567890",
    fechaHoraEnvio: new Date().toISOString(),
    formData: {
      empresa: {
        razonSocial: "Test Company",
        rut: "76543210-9",
      },
      admins: [
        {
          nombre: "Juan",
          apellido: "Pérez",
          email: "juan@test.com",
        },
      ],
      trabajadores: [],
      turnos: [],
      planificaciones: [],
      asignaciones: [],
      configureNow: false,
    },
    metadata: {
      empresaRut: "76543210-9",
      empresaNombre: "Test Company",
    },
    excelFile: null,
  }

  it("valida payload correcto", () => {
    const result = validateZohoPayload(validPayload)
    expect(result.valid).toBe(true)
    expect(result.errors).toBeUndefined()
  })

  it("rechaza payload sin accion", () => {
    const invalid = { ...validPayload, accion: undefined }
    const result = validateZohoPayload(invalid)
    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("rechaza payload sin eventType", () => {
    const invalid = { ...validPayload, eventType: undefined }
    const result = validateZohoPayload(invalid)
    expect(result.valid).toBe(false)
  })

  it("rechaza payload con email inválido en admins", () => {
    const invalid = {
      ...validPayload,
      formData: {
        ...validPayload.formData,
        admins: [{ nombre: "Juan", apellido: "Pérez", email: "invalid-email" }],
      },
    }
    const result = validateZohoPayload(invalid)
    expect(result.valid).toBe(false)
  })

  it("rechaza payload con fechaHoraEnvio inválida", () => {
    const invalid = { ...validPayload, fechaHoraEnvio: "not-a-date" }
    const result = validateZohoPayload(invalid)
    expect(result.valid).toBe(false)
  })

  it("acepta payload con id_zoho null", () => {
    const withoutIdZoho = { ...validPayload, id_zoho: undefined }
    const result = validateZohoPayload(withoutIdZoho)
    expect(result.valid).toBe(true)
  })
})
