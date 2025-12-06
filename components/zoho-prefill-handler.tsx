"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

interface ZohoPrefillData {
  // Datos de empresa
  razonSocial?: string
  nombreFantasia?: string
  rut?: string
  giro?: string
  direccion?: string
  comuna?: string
  emailFacturacion?: string
  telefonoContacto?: string
  sistema?: string[]
  rubro?: string

  // Administradores (pueden venir múltiples)
  admins?: Array<{
    nombre: string
    rut: string
    email: string
    telefono: string
  }>
}

interface ZohoPrefillHandlerProps {
  setEmpresa: (empresa: any) => void
  setAdmins: (admins: any[]) => void
}

export function ZohoPrefillHandler({ setEmpresa, setAdmins }: ZohoPrefillHandlerProps) {
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if there's prefill data in URL params
    const prefillData = searchParams.get("prefill")

    if (prefillData) {
      try {
        const data: ZohoPrefillData = JSON.parse(decodeURIComponent(prefillData))

        console.log("[v0] Prellenando formulario con datos de Zoho:", data)

        // Prefill empresa data
        if (data.razonSocial || data.nombreFantasia || data.rut) {
          setEmpresa((prev: any) => ({
            ...prev,
            ...(data.razonSocial && { razonSocial: data.razonSocial }),
            ...(data.nombreFantasia && { nombreFantasia: data.nombreFantasia }),
            ...(data.rut && { rut: data.rut }),
            ...(data.giro && { giro: data.giro }),
            ...(data.direccion && { direccion: data.direccion }),
            ...(data.comuna && { comuna: data.comuna }),
            ...(data.emailFacturacion && { emailFacturacion: data.emailFacturacion }),
            ...(data.telefonoContacto && { telefonoContacto: data.telefonoContacto }),
            ...(data.sistema && { sistema: data.sistema }),
            ...(data.rubro && { rubro: data.rubro }),
          }))
        }

        // Prefill admins data
        if (data.admins && data.admins.length > 0) {
          const adminsWithIds = data.admins.map((admin, index) => ({
            id: Date.now() + index,
            nombre: admin.nombre || "",
            rut: admin.rut || "",
            email: admin.email || "",
            telefono: admin.telefono || "",
          }))
          setAdmins(adminsWithIds)
        }

        console.log("[v0] Formulario prellenado exitosamente")
      } catch (error) {
        console.error("[v0] Error al parsear datos de prefill:", error)
      }
    }
  }, [searchParams, setEmpresa, setAdmins])

  return null
}
