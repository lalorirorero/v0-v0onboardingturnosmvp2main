# API Nubox: Lookup HubSpot por RUT

## Endpoint

`POST /api/nubox/hubspot/company-by-rut`

Base URL ejemplo: `https://tu-dominio.vercel.app/api/nubox/hubspot/company-by-rut`

## Objetivo

Buscar una empresa en HubSpot por RUT para hidratar el onboarding Nubox cuando el cliente entra sin token pre-cargado.

## Seguridad

- El token real de HubSpot se mantiene server-side en `HUBSPOT_PRIVATE_APP_TOKEN`.
- Opcionalmente puedes exigir clave interna con `NUBOX_HUBSPOT_LOOKUP_SECRET`.

Si `NUBOX_HUBSPOT_LOOKUP_SECRET` esta configurada, debes enviar una de estas cabeceras:

- `x-nubox-lookup-secret: <NUBOX_HUBSPOT_LOOKUP_SECRET>`
- `Authorization: Bearer <NUBOX_HUBSPOT_LOOKUP_SECRET>`

Si no se envia (o es invalida), responde `401`.

## Headers requeridos

```http
Content-Type: application/json
```

## Request

```json
{
  "rut": "76.543.210-5"
}
```

Notas:
- La API normaliza el RUT para buscarlo (sin puntos y en mayuscula).

## Response: exito encontrado (`200`)

```json
{
  "success": true,
  "found": true,
  "company": {
    "razonSocial": "Cliente Demo SpA",
    "nombreFantasia": "Cliente Demo",
    "rut": "76543210-5",
    "giro": "Servicios",
    "direccion": "Av. Siempre Viva 123",
    "comuna": "Santiago",
    "emailFacturacion": "facturacion@clientedemo.cl",
    "telefonoContacto": "+56911112222",
    "rubro": "Servicios"
  },
  "missingFields": []
}
```

## Response: exito sin resultado (`200`)

```json
{
  "success": true,
  "found": false
}
```

## Errores

### `400` - RUT faltante/invalido

```json
{
  "success": false,
  "error": "Debes informar un RUT valido."
}
```

### `401` - No autorizado

```json
{
  "success": false,
  "error": "No autorizado."
}
```

### `500` - Error de configuracion o integracion

Posibles causas:
- `HUBSPOT_PRIVATE_APP_TOKEN` no configurado.
- Error al consultar HubSpot.
- Error inesperado del servidor.

Ejemplo:

```json
{
  "success": false,
  "error": "HubSpot search error (500)"
}
```

## Variables de entorno relacionadas

- `HUBSPOT_PRIVATE_APP_TOKEN` (obligatoria para lookup real)
- `NUBOX_HUBSPOT_LOOKUP_SECRET` (opcional, recomendada)
- `NEXT_PUBLIC_EMAIL_DOMAINS_BLOCKLIST` (CSV, validacion frontend de trabajadores)
- `PUBLIC_EMAIL_DOMAINS_BLOCKLIST` (fallback adicional para la misma validacion)

