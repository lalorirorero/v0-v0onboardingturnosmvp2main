import { describe, it, expect } from "vitest"

// Helper functions extracted for testing
const normalizeRut = (rut: string): string => {
  if (!rut) return ""
  return rut.replace(/\./g, "").replace(/-/g, "").toUpperCase()
}

const isValidRut = (rut: string): boolean => {
  const clean = normalizeRut(rut)
  if (!clean) return false
  if (!/^[0-9]+[0-9K]$/.test(clean)) return false

  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  let sum = 0
  let multiplier = 2

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number.parseInt(body[i], 10) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const mod = 11 - (sum % 11)
  let expected
  if (mod === 11) expected = "0"
  else if (mod === 10) expected = "K"
  else expected = String(mod)

  return dv === expected
}

const isValidEmail = (email: string): boolean => {
  if (!email) return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email.trim())
}

describe("Validación de RUT", () => {
  it("valida RUT correcto con puntos y guión", () => {
    expect(isValidRut("12.345.678-5")).toBe(true)
  })

  it("valida RUT correcto sin formato", () => {
    expect(isValidRut("123456785")).toBe(true)
  })

  it("valida RUT con dígito verificador K", () => {
    expect(isValidRut("11.111.111-K")).toBe(true)
    expect(isValidRut("11111111K")).toBe(true)
  })

  it("rechaza RUT con dígito verificador incorrecto", () => {
    expect(isValidRut("12.345.678-0")).toBe(false)
  })

  it("rechaza RUT vacío", () => {
    expect(isValidRut("")).toBe(false)
  })

  it("rechaza RUT con letras (excepto K al final)", () => {
    expect(isValidRut("ABC123456")).toBe(false)
  })

  it("rechaza RUT muy corto", () => {
    expect(isValidRut("12-3")).toBe(false)
  })

  it("normaliza RUT correctamente", () => {
    expect(normalizeRut("12.345.678-5")).toBe("123456785")
    expect(normalizeRut("11.111.111-k")).toBe("11111111K")
  })
})

describe("Validación de Email", () => {
  it("valida email correcto", () => {
    expect(isValidEmail("test@example.com")).toBe(true)
  })

  it("valida email con subdominios", () => {
    expect(isValidEmail("user@mail.example.com")).toBe(true)
  })

  it("rechaza email sin @", () => {
    expect(isValidEmail("testexample.com")).toBe(false)
  })

  it("rechaza email sin dominio", () => {
    expect(isValidEmail("test@")).toBe(false)
  })

  it("rechaza email sin usuario", () => {
    expect(isValidEmail("@example.com")).toBe(false)
  })

  it("rechaza email vacío", () => {
    expect(isValidEmail("")).toBe(false)
  })

  it("acepta email con espacios al inicio/fin y los trimea", () => {
    expect(isValidEmail("  test@example.com  ")).toBe(true)
  })
})
