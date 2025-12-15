import { describe, it, expect } from "vitest"
import { encryptToken, decryptToken } from "@/lib/backend"

describe("Encriptación y Desencriptación de Tokens", () => {
  const mockEmpresaData = {
    id_zoho: "1234567890",
    razonSocial: "Test Company SPA",
    rut: "76.543.210-9",
    giro: "Testing",
    admins: [
      {
        nombre: "Juan",
        apellido: "Pérez",
        email: "juan@test.com",
      },
    ],
  }

  it("encripta y desencripta datos correctamente", async () => {
    const token = await encryptToken(mockEmpresaData)
    expect(token).toBeTruthy()
    expect(typeof token).toBe("string")

    const decrypted = await decryptToken(token)
    expect(decrypted).toEqual(mockEmpresaData)
  })

  it("preserva el id_zoho durante encriptación/desencriptación", async () => {
    const token = await encryptToken(mockEmpresaData)
    const decrypted = await decryptToken(token)

    expect(decrypted?.id_zoho).toBe("1234567890")
  })

  it("retorna null para token inválido", async () => {
    const result = await decryptToken("invalid-token")
    expect(result).toBeNull()
  })

  it("retorna null para token vacío", async () => {
    const result = await decryptToken("")
    expect(result).toBeNull()
  })

  it("maneja datos con arrays correctamente", async () => {
    const dataWithArrays = {
      ...mockEmpresaData,
      trabajadores: [{ nombre: "Test", rut: "12345678-9", email: "test@test.com" }],
      turnos: [{ nombre: "Mañana", horaInicio: "08:00", horaFin: "14:00", dias: ["Lunes"] }],
    }

    const token = await encryptToken(dataWithArrays)
    const decrypted = await decryptToken(token)

    expect(decrypted?.trabajadores).toHaveLength(1)
    expect(decrypted?.turnos).toHaveLength(1)
  })
})
