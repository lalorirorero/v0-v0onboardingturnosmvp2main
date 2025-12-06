// Utilidad para encriptar y desencriptar datos usando Web Crypto API
export async function encryptData(data: any): Promise<string> {
  const jsonString = JSON.stringify(data)
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(jsonString)

  // Usar una clave derivada del secret (en producción, usar una clave más robusta)
  const secret = process.env.ENCRYPTION_SECRET || "default-secret-key-change-in-production"
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "PBKDF2" }, false, [
    "deriveBits",
    "deriveKey",
  ])

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, dataBuffer)

  // Combinar salt, iv y datos encriptados
  const resultBuffer = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength)
  resultBuffer.set(salt, 0)
  resultBuffer.set(iv, salt.length)
  resultBuffer.set(new Uint8Array(encryptedBuffer), salt.length + iv.length)

  // Convertir a base64 URL-safe
  return Buffer.from(resultBuffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

export async function decryptData(token: string): Promise<any> {
  try {
    // Restaurar base64 desde URL-safe
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/")
    const padding = "=".repeat((4 - (base64.length % 4)) % 4)
    const buffer = Buffer.from(base64 + padding, "base64")

    // Extraer salt, iv y datos encriptados
    const salt = buffer.slice(0, 16)
    const iv = buffer.slice(16, 28)
    const encryptedData = buffer.slice(28)

    const secret = process.env.ENCRYPTION_SECRET || "default-secret-key-change-in-production"
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "PBKDF2" }, false, [
      "deriveBits",
      "deriveKey",
    ])

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    )

    const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encryptedData)

    const decoder = new TextDecoder()
    const jsonString = decoder.decode(decryptedBuffer)
    return JSON.parse(jsonString)
  } catch (error) {
    console.error("Error decrypting data:", error)
    return null
  }
}
