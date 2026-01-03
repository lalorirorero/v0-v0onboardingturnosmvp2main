import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseServerClient } from "@/lib/supabase/server"

const ALLOWED_RUBROS = [
  "1. Agrícola",
  "2. Condominio",
  "3. Construcción",
  "4. Inmobiliaria",
  "5. Consultoria",
  "6. Banca y Finanzas",
  "7. Educación",
  "8. Municipio",
  "9. Gobierno",
  "10. Mineria",
  "11. Naviera",
  "12. Outsourcing Seguridad",
  "13. Outsourcing General",
  "14. Outsourcing Retail",
  "15. Planta Productiva",
  "16. Logistica",
  "17. Retail Enterprise",
  "18. Retail SMB",
  "19. Salud",
  "20. Servicios",
  "21. Transporte",
  "22. Turismo, Hotelería y Gastronomía",
] as const

const ALLOWED_SISTEMAS = [
  "GeoVictoria BOX",
  "GeoVictoria CALL",
  "GeoVictoria APP",
  "GeoVictoria USB",
  "GeoVictoria WEB",
] as const

const empresaSchema = z.object({
  razonSocial: z.string().trim().min(1, "El campo 'razonSocial' es obligatorio"),
  nombreFantasia: z.string().trim().optional(),
  rut: z.string().trim().min(1, "El campo 'rut' es obligatorio"),
  giro: z.string().trim().min(1, "El campo 'giro' es obligatorio"),
  direccion: z.string().trim().min(1, "El campo 'direccion' es obligatorio"),
  comuna: z.string().trim().min(1, "El campo 'comuna' es obligatorio"),
  emailFacturacion: z.string().trim().email("El campo 'emailFacturacion' debe ser un email válido"),
  telefonoContacto: z.string().trim().min(1, "El campo 'telefonoContacto' es obligatorio"),
  rubro: z
    .string()
    .trim()
    .refine((value) => ALLOWED_RUBROS.includes(value as (typeof ALLOWED_RUBROS)[number]), {
      message: "El campo 'rubro' debe corresponder a un valor del catálogo",
    }),
  sistema: z
    .array(z.string().trim())
    .min(1, "El campo 'sistema' debe contener al menos un elemento")
    .refine((values) => values.every((value) => ALLOWED_SISTEMAS.includes(value as (typeof ALLOWED_SISTEMAS)[number])), {
      message: "Todos los valores de 'sistema' deben pertenecer al catálogo",
    }),
})

const requestBodySchema = z
  .object({
    id_zoho: z.union([z.string(), z.number()]).optional(),
    empresa: empresaSchema.optional(),
    empresaData: empresaSchema.optional(),
    admins: z.array(z.any()).optional(),
    trabajadores: z.array(z.any()).optional(),
    turnos: z.array(z.any()).optional(),
    planificaciones: z.array(z.any()).optional(),
    asignaciones: z.array(z.any()).optional(),
    configureNow: z.boolean().optional(),
    loadWorkersNow: z.boolean().optional(),
  })
  .refine((data) => data.empresa || data.empresaData, {
    message: "Se requiere el campo 'empresa' o 'empresaData' con los datos de la empresa",
    path: ["empresa"],
  })

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] generate-link: Recibiendo solicitud")

    let body
    try {
      const text = await request.text()
      console.log("[v0] generate-link: Body recibido (texto):", text)

      if (!text || text.trim() === "") {
        return NextResponse.json(
          {
            success: false,
            error: "El body de la solicitud está vacío. Debes enviar un JSON con los datos de la empresa.",
          },
          { status: 400 },
        )
      }

      body = JSON.parse(text)
      console.log("[v0] generate-link: Body parseado exitosamente")
    } catch (parseError) {
      console.error("[v0] generate-link: Error parseando JSON:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "El body de la solicitud no es un JSON válido. Verifica el formato.",
        },
        { status: 400 },
      )
    }

    const parsed = requestBodySchema.safeParse(body)

    if (!parsed.success) {
      const validationErrors = parsed.error.errors.map((issue) => ({
        campo: issue.path.join(".") || "payload",
        mensaje: issue.message,
      }))

      console.warn("[v0] generate-link: Errores de validación", validationErrors)

      return NextResponse.json(
        {
          success: false,
          error: "El payload enviado no cumple con los requisitos mínimos",
          validationErrors,
        },
        { status: 400 },
      )
    }

    const validatedBody = parsed.data
    const empresaInput = validatedBody.empresa ?? validatedBody.empresaData!
    const id_zoho = validatedBody.id_zoho ? String(validatedBody.id_zoho) : null

    // Estructura de datos inicial consistente
    const formData = {
      empresa: {
        razonSocial: empresaInput.razonSocial,
        nombreFantasia: empresaInput.nombreFantasia || "",
        rut: empresaInput.rut,
        giro: empresaInput.giro,
        direccion: empresaInput.direccion,
        comuna: empresaInput.comuna,
        emailFacturacion: empresaInput.emailFacturacion,
        telefonoContacto: empresaInput.telefonoContacto,
        sistema: empresaInput.sistema,
        rubro: empresaInput.rubro,
        grupos: [],
        id_zoho: id_zoho,
      },
      admins: validatedBody.admins || [],
      trabajadores: validatedBody.trabajadores || [],
      turnos: validatedBody.turnos || [],
      planificaciones: validatedBody.planificaciones || [],
      asignaciones: validatedBody.asignaciones || [],
      configureNow: validatedBody.configureNow ?? false,
      loadWorkersNow: validatedBody.loadWorkersNow ?? false,
    }

    console.log("[v0] generate-link: Creando registro en BD:", {
      id_zoho,
      razonSocial: formData.empresa.razonSocial,
      rut: formData.empresa.rut,
    })

    // Crear registro en Supabase
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("onboardings")
      .insert({
        id_zoho: id_zoho || "sin-id",
        estado: "pendiente",
        datos_actuales: formData,
        ultimo_paso: 0,
        navigation_history: [0],
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] generate-link: Error creando registro en Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: `Error al crear registro en base de datos: ${error.message}`,
          details: error,
        },
        { status: 500 },
      )
    }

    // Token es simplemente el UUID del registro
    const token = data.id
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const link = `${baseUrl}?token=${token}`

    console.log("[v0] generate-link: Registro creado exitosamente:", {
      id: data.id,
      link,
    })

    return NextResponse.json({
      success: true,
      link,
      token,
    })
  } catch (error) {
    console.error("[v0] generate-link: Error general:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
