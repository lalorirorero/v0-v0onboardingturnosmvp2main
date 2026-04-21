# API Nubox: Generación de Link de Auto-Onboarding

## Endpoint

`POST /api/nubox/generate-link`

Base URL ejemplo: `https://tu-dominio.vercel.app/api/nubox/generate-link`

## Objetivo

Generar un link de onboarding para clientes provenientes de Nubox, con token exclusivo de partner (prefijo `nbx_`), distinto al token genérico.

## Autenticación

Requerida por header (usa uno):

- `x-nubox-api-key: <NUBOX_PARTNER_API_KEY>`
- `x-api-key: <NUBOX_PARTNER_API_KEY>`
- `Authorization: Bearer <NUBOX_PARTNER_API_KEY>`

Si la credencial es inválida o falta, responde `401`.

## Headers requeridos

```http
Content-Type: application/json
```

## Qué pide la API (Request)

### Campos mínimos

- `empresa` (objeto) o `empresaData` (objeto), con al menos los campos que quieras prellenar.

### Campos soportados (nivel raíz)

- `id_zoho` (string, opcional)
- `empresa` (object, recomendado)
- `empresaData` (object, alternativa a `empresa`)
- `admins` (array, opcional)
- `trabajadores` (array, opcional)
- `turnos` (array, opcional)
- `planificaciones` (array, opcional)
- `asignaciones` (array, opcional)
- `processing_purpose` / `processingPurpose` (string, opcional)
- `legal_basis` / `legalBasis` (string, opcional)
- `policy_version` / `policyVersion` (string, opcional)
- `representative_declaration_accepted` / `representativeDeclarationAccepted` (boolean, opcional)

### Objeto `empresa` / `empresaData` (campos aceptados)

- `razonSocial`
- `nombreFantasia`
- `rut`
- `giro`
- `direccion`
- `comuna`
- `emailFacturacion`
- `telefonoContacto`
- `ejecutivoTelefono`
- `ejecutivoNombre`
- `sistema` (array de strings)
- `modulosAdicionales` (array)
- `modulosAdicionalesOtro`
- `rubro`

## Ejemplo request

```json
{
  "id_zoho": "3525045000561554077",
  "empresa": {
    "razonSocial": "Cliente Demo SpA",
    "nombreFantasia": "Cliente Demo",
    "rut": "76.543.210-5",
    "giro": "Servicios",
    "direccion": "Av. Siempre Viva 123",
    "comuna": "Santiago",
    "emailFacturacion": "facturacion@clientedemo.cl",
    "telefonoContacto": "+56911112222",
    "sistema": ["GeoVictoria APP", "GeoVictoria WEB"],
    "rubro": "20. Servicios"
  },
  "admins": [
    {
      "nombre": "Ana",
      "apellido": "Pérez",
      "rut": "12.345.678-9",
      "email": "ana@clientedemo.cl",
      "telefono": "+56999998888"
    }
  ]
}
```

## Qué devuelve la API (Response)

### Éxito `200`

```json
{
  "success": true,
  "partner": "nubox",
  "tokenType": "nubox_prefixed",
  "token": "nbx_4e65a6f6-4df7-4de6-a5ea-37f63c95dd0f",
  "onboardingId": "4e65a6f6-4df7-4de6-a5ea-37f63c95dd0f",
  "link": "https://tu-dominio.vercel.app?token=nbx_4e65a6f6-4df7-4de6-a5ea-37f63c95dd0f",
  "tokenExpiresAt": "2026-05-21T18:30:00.000Z"
}
```

### Errores

- `401`:

```json
{
  "success": false,
  "error": "No autorizado. Debes enviar credenciales válidas de Nubox."
}
```

- `400` (payload vacío o JSON inválido):

```json
{
  "success": false,
  "error": "El body de la solicitud está vacío. Debes enviar un JSON con los datos de la empresa."
}
```

o

```json
{
  "success": false,
  "error": "El body de la solicitud no es un JSON válido. Verifica el formato."
}
```

- `400` (sin empresa/empresaData):

```json
{
  "success": false,
  "error": "Se requiere el campo 'empresa' o 'empresaData' con los datos de la empresa."
}
```

- `500` (error interno):

```json
{
  "success": false,
  "error": "Error al crear registro en base de datos: <detalle>"
}
```

## cURL de ejemplo

```bash
curl -X POST "https://tu-dominio.vercel.app/api/nubox/generate-link" \
  -H "Content-Type: application/json" \
  -H "x-nubox-api-key: TU_API_KEY_DE_NUBOX" \
  -d '{
    "id_zoho": "3525045000561554077",
    "empresa": {
      "razonSocial": "Cliente Demo SpA",
      "rut": "76.543.210-5",
      "emailFacturacion": "facturacion@clientedemo.cl",
      "telefonoContacto": "+56911112222",
      "sistema": ["GeoVictoria APP"],
      "rubro": "20. Servicios"
    }
  }'
```

## Integración desde HubSpot

### Opción recomendada: Workflow Action `Send a webhook`

Configura la acción del workflow así:

- Method: `POST`
- URL: `https://tu-dominio.vercel.app/api/nubox/generate-link`
- Request format: `JSON`
- Headers:
  - `Content-Type: application/json`
  - `x-nubox-api-key: TU_API_KEY_DE_NUBOX`

### Ejemplo de body usando tokens de HubSpot

```json
{
  "id_zoho": "{{deal.zoho_id}}",
  "empresa": {
    "razonSocial": "{{company.name}}",
    "nombreFantasia": "{{company.name}}",
    "rut": "{{company.rut}}",
    "giro": "{{company.industry}}",
    "direccion": "{{company.address}}",
    "comuna": "{{company.city}}",
    "emailFacturacion": "{{company.billing_email}}",
    "telefonoContacto": "{{company.phone}}",
    "sistema": ["GeoVictoria APP", "GeoVictoria WEB"],
    "rubro": "20. Servicios"
  },
  "admins": [
    {
      "nombre": "{{contact.firstname}}",
      "apellido": "{{contact.lastname}}",
      "rut": "{{contact.rut}}",
      "email": "{{contact.email}}",
      "telefono": "{{contact.phone}}"
    }
  ]
}
```

### Qué hacer con la respuesta en HubSpot

La API responde:

- `link`: URL lista para enviar al cliente final
- `token`: token Nubox (`nbx_<uuid>`)
- `onboardingId`: UUID interno de trazabilidad

Recomendación operativa:

- Guardar `link` en una propiedad del Deal/Company para usarlo en email o tarea comercial.
- Guardar `onboardingId` para auditoría y soporte.

## Notas operativas

- El token de Nubox tiene formato `nbx_<uuid>` y es exclusivo del partner.
- El `onboardingId` es el UUID interno canónico (para trazabilidad técnica).
- El link devuelto ya viene listo para enviar al cliente final.
