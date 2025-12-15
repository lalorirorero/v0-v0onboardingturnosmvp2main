import { z } from "zod"

// Schema del payload que se envía a Zoho Flow
export const ZohoPayloadSchema = z.object({
  accion: z.enum(["crear", "actualizar"]),
  eventType: z.enum(["progress", "complete"]),
  id_zoho: z.string().optional(),
  fechaHoraEnvio: z.string().datetime(),
  formData: z.object({
    empresa: z.object({
      razonSocial: z.string().min(1),
      nombreFantasia: z.string().optional(),
      rut: z.string().min(1),
      giro: z.string().optional(),
      direccion: z.string().optional(),
      comuna: z.string().optional(),
      emailFacturacion: z.string().email().optional(),
      telefonoContacto: z.string().optional(),
      sistema: z.array(z.string()).optional(),
      rubro: z.string().optional(),
    }),
    admins: z.array(
      z.object({
        nombre: z.string().min(1),
        apellido: z.string().min(1),
        email: z.string().email(),
        telefono: z.string().optional(),
        cargo: z.string().optional(),
      }),
    ),
    trabajadores: z
      .array(
        z.object({
          nombre: z.string().min(1),
          rut: z.string().min(1),
          email: z.string().email().optional(),
          grupo: z.string().optional(),
        }),
      )
      .optional(),
    turnos: z
      .array(
        z.object({
          nombre: z.string().min(1),
          horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
          horaFin: z.string().regex(/^\d{2}:\d{2}$/),
          dias: z.array(z.string()),
          color: z.string().optional(),
        }),
      )
      .optional(),
    planificaciones: z.array(z.any()).optional(),
    asignaciones: z.array(z.any()).optional(),
    configureNow: z.boolean(),
  }),
  metadata: z.object({
    pasoActual: z.number().optional(),
    pasoNombre: z.string().optional(),
    totalPasos: z.number().optional(),
    porcentajeProgreso: z.number().optional(),
    empresaRut: z.string(),
    empresaNombre: z.string(),
    totalCambios: z.number().optional(),
    editedFields: z.array(z.any()).optional(),
  }),
  excelFile: z
    .object({
      filename: z.string(),
      base64: z.string(),
      mimeType: z.string(),
    })
    .nullable(),
})

export type ZohoPayload = z.infer<typeof ZohoPayloadSchema>

// Función helper para validar payloads
export function validateZohoPayload(payload: unknown): { valid: boolean; errors?: string[] } {
  const result = ZohoPayloadSchema.safeParse(payload)
  if (result.success) {
    return { valid: true }
  }
  return {
    valid: false,
    errors: result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
  }
}
