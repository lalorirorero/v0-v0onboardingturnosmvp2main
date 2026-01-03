# API de Generación de Links con Token

## Descripción

Esta API permite generar links únicos de onboarding con datos pre-llenados para facilitar el proceso de configuración inicial de nuevos clientes. Cada link contiene un token que identifica de manera única la sesión de onboarding en la base de datos.

---

## Endpoint

```
POST /api/generate-link
```

**URL Base:** `https://tu-dominio.vercel.app`

**URL Completa:** `https://tu-dominio.vercel.app/api/generate-link`

---

## Headers Requeridos

```json
{
  "Content-Type": "application/json"
}
```

---

## Estructura del Payload

### Campos de Nivel Superior

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id_zoho` | string | Opcional | Identificador del registro en Zoho CRM. Se almacena como referencia. |
| `empresa` | object | **Sí** | Objeto con los datos de la empresa. Ver estructura detallada abajo. |
| `admins` | array | Opcional | Array de objetos con datos de administradores. Ver estructura detallada abajo. |

---

## Objeto `empresa` (OBLIGATORIO)

### Campos Obligatorios

| Campo | Tipo | Obligatorio | Formato/Validación | Ejemplo |
|-------|------|-------------|-------------------|---------|
| `razonSocial` | string | **Sí** | Texto libre | `"Construcciones del Sur SpA"` |
| `rut` | string | **Sí** | Formato: `XX.XXX.XXX-X` | `"76.543.210-5"` |
| `giro` | string | **Sí** | Texto libre | `"Construcción y obras civiles"` |
| `direccion` | string | **Sí** | Texto libre | `"Av. Libertador B. O'Higgins 1234"` |
| `comuna` | string | **Sí** | Texto libre | `"Santiago Centro"` |
| `emailFacturacion` | string | **Sí** | Email válido | `"facturacion@construcsur.cl"` |
| `telefonoContacto` | string | **Sí** | Formato: `+56XXXXXXXXX` | `"+56223456789"` |
| `rubro` | string | **Sí** | Uno de los rubros disponibles (ver lista abajo) | `"Construcción"` |
| `sistema` | array | **Sí** | Array con al menos 1 sistema (ver opciones abajo) | `["Control de Asistencia"]` |

### Campos Opcionales

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `nombreFantasia` | string | Nombre comercial de la empresa | `"Construcsur"` |

### Rubros Disponibles

Debes seleccionar uno de estos valores para el campo `rubro`:

```
- "Agricultura, ganadería, silvicultura y pesca"
- "Explotación de minas y canteras"
- "Industrias manufactureras"
- "Suministro de electricidad, gas, vapor y aire acondicionado"
- "Suministro de agua; evacuación de aguas residuales, gestión de desechos"
- "Construcción"
- "Comercio al por mayor y al por menor"
- "Transporte y almacenamiento"
- "Actividades de alojamiento y de servicio de comidas"
- "Información y comunicaciones"
- "Actividades financieras y de seguros"
- "Actividades inmobiliarias"
- "Actividades profesionales, científicas y técnicas"
- "Actividades de servicios administrativos y de apoyo"
- "Administración pública y defensa; planes de seguridad social"
- "Enseñanza"
- "Actividades de atención de la salud humana y de asistencia social"
- "Actividades artísticas, de entretenimiento y recreativas"
- "Otras actividades de servicios"
- "Actividades de los hogares como empleadores"
- "Actividades de organizaciones y órganos extraterritoriales"
```

### Sistemas de Marcaje Disponibles

Debes incluir al menos uno de estos valores en el array `sistema`:

```
- "Control de Asistencia"
- "Gestión de Turnos"
- "Portal del Colaborador"
```

---

## Array `admins` (OPCIONAL pero recomendado)

Si deseas pre-llenar datos de administradores, cada objeto del array debe tener:

### Estructura de Cada Admin

| Campo | Tipo | Obligatorio | Formato/Validación | Ejemplo |
|-------|------|-------------|-------------------|---------|
| `nombre` | string | **Sí** | Texto libre (solo nombre) | `"María"` |
| `apellido` | string | **Sí** | Texto libre | `"González Pérez"` |
| `rut` | string | **Sí** | Formato: `XX.XXX.XXX-X` | `"12.345.678-9"` |
| `email` | string | **Sí** | Email válido | `"maria.gonzalez@construcsur.cl"` |
| `telefono` | string | **Sí** | Formato: `+56XXXXXXXXX` | `"+56912345678"` |
| `grupo` | string | Opcional | Departamento o área | `"Recursos Humanos"` |

---

## Ejemplo Completo de Payload

### Payload Mínimo (Solo Empresa)

```json
{
  "id_zoho": "3525045000561554077",
  "empresa": {
    "razonSocial": "Construcciones del Sur SpA",
    "rut": "76.543.210-5",
    "giro": "Construcción y obras civiles",
    "direccion": "Av. Libertador Bernardo O'Higgins 1234",
    "comuna": "Santiago Centro",
    "emailFacturacion": "facturacion@construcsur.cl",
    "telefonoContacto": "+56223456789",
    "rubro": "Construcción",
    "sistema": ["Control de Asistencia", "Gestión de Turnos"]
  }
}
```

### Payload Completo (Empresa + Administradores)

```json
{
  "id_zoho": "3525045000561554077",
  "empresa": {
    "razonSocial": "Construcciones del Sur SpA",
    "nombreFantasia": "Construcsur",
    "rut": "76.543.210-5",
    "giro": "Construcción y obras civiles",
    "direccion": "Av. Libertador Bernardo O'Higgins 1234",
    "comuna": "Santiago Centro",
    "emailFacturacion": "facturacion@construcsur.cl",
    "telefonoContacto": "+56223456789",
    "rubro": "Construcción",
    "sistema": ["Control de Asistencia", "Gestión de Turnos"]
  },
  "admins": [
    {
      "nombre": "María",
      "apellido": "González Pérez",
      "rut": "12.345.678-9",
      "email": "maria.gonzalez@construcsur.cl",
      "telefono": "+56912345678",
      "grupo": "Recursos Humanos"
    },
    {
      "nombre": "Carlos",
      "apellido": "Ramírez Silva",
      "rut": "15.678.234-5",
      "email": "carlos.ramirez@construcsur.cl",
      "telefono": "+56987654321",
      "grupo": "Operaciones"
    }
  ]
}
```

---

## Respuesta Exitosa

**Código HTTP:** `200 OK`

```json
{
  "success": true,
  "link": "https://tu-dominio.vercel.app?token=ab39e615-944f-4f87-9ffd-4f4d05810ed8",
  "token": "ab39e615-944f-4f87-9ffd-4f4d05810ed8"
}
```

### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | boolean | Indica si la operación fue exitosa |
| `link` | string | URL completa del onboarding con el token incluido |
| `token` | string | UUID único que identifica esta sesión de onboarding |

---

## Respuestas de Error

### Error 400: Payload Vacío

```json
{
  "success": false,
  "error": "El body de la solicitud está vacío. Debes enviar un JSON con los datos de la empresa."
}
```

### Error 400: JSON Inválido

```json
{
  "success": false,
  "error": "El body de la solicitud no es un JSON válido. Verifica el formato."
}
```

### Error 400: Falta Campo Empresa

```json
{
  "success": false,
  "error": "Se requiere el campo 'empresa' o 'empresaData' con los datos de la empresa"
}
```

### Error 500: Error en Base de Datos

```json
{
  "success": false,
  "error": "Error al crear registro en base de datos: [mensaje de error]",
  "details": { ... }
}
```

---

## Ejemplos de Uso

### cURL

```bash
curl -X POST https://tu-dominio.vercel.app/api/generate-link \
  -H "Content-Type: application/json" \
  -d '{
    "id_zoho": "3525045000561554077",
    "empresa": {
      "razonSocial": "Construcciones del Sur SpA",
      "nombreFantasia": "Construcsur",
      "rut": "76.543.210-5",
      "giro": "Construcción y obras civiles",
      "direccion": "Av. Libertador Bernardo O'\''Higgins 1234",
      "comuna": "Santiago Centro",
      "emailFacturacion": "facturacion@construcsur.cl",
      "telefonoContacto": "+56223456789",
      "rubro": "Construcción",
      "sistema": ["Control de Asistencia"]
    },
    "admins": [
      {
        "nombre": "María",
        "apellido": "González Pérez",
        "rut": "12.345.678-9",
        "email": "maria.gonzalez@construcsur.cl",
        "telefono": "+56912345678",
        "grupo": "Recursos Humanos"
      }
    ]
  }'
```

### JavaScript (Fetch)

```javascript
const payload = {
  id_zoho: "3525045000561554077",
  empresa: {
    razonSocial: "Construcciones del Sur SpA",
    nombreFantasia: "Construcsur",
    rut: "76.543.210-5",
    giro: "Construcción y obras civiles",
    direccion: "Av. Libertador Bernardo O'Higgins 1234",
    comuna: "Santiago Centro",
    emailFacturacion: "facturacion@construcsur.cl",
    telefonoContacto: "+56223456789",
    rubro: "Construcción",
    sistema: ["Control de Asistencia", "Gestión de Turnos"]
  },
  admins: [
    {
      nombre: "María",
      apellido: "González Pérez",
      rut: "12.345.678-9",
      email: "maria.gonzalez@construcsur.cl",
      telefono: "+56912345678",
      grupo: "Recursos Humanos"
    }
  ]
};

fetch('https://tu-dominio.vercel.app/api/generate-link', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(response => response.json())
  .then(data => {
    console.log('Link generado:', data.link);
    console.log('Token:', data.token);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Python (Requests)

```python
import requests
import json

url = "https://tu-dominio.vercel.app/api/generate-link"

payload = {
    "id_zoho": "3525045000561554077",
    "empresa": {
        "razonSocial": "Construcciones del Sur SpA",
        "nombreFantasia": "Construcsur",
        "rut": "76.543.210-5",
        "giro": "Construcción y obras civiles",
        "direccion": "Av. Libertador Bernardo O'Higgins 1234",
        "comuna": "Santiago Centro",
        "emailFacturacion": "facturacion@construcsur.cl",
        "telefonoContacto": "+56223456789",
        "rubro": "Construcción",
        "sistema": ["Control de Asistencia", "Gestión de Turnos"]
    },
    "admins": [
        {
            "nombre": "María",
            "apellido": "González Pérez",
            "rut": "12.345.678-9",
            "email": "maria.gonzalez@construcsur.cl",
            "telefono": "+56912345678",
            "grupo": "Recursos Humanos"
        }
    ]
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

print(f"Link generado: {data['link']}")
print(f"Token: {data['token']}")
```

---

## Notas Importantes

1. **Formato de RUT**: Debe incluir puntos y guión. Ejemplo: `76.543.210-5`

2. **Formato de Teléfono**: Debe incluir código de país con `+`. Ejemplo: `+56912345678`

3. **Email de Facturación**: Debe ser un email válido con formato correcto

4. **Sistema de Marcaje**: Debe incluir al menos un sistema. Se permiten múltiples selecciones.

5. **Rubro**: Debe ser exactamente uno de los valores listados en la sección "Rubros Disponibles"

6. **ID de Zoho**: Es opcional pero altamente recomendado para mantener la trazabilidad con tu CRM

7. **Persistencia**: Los datos se guardan en Supabase y pueden ser actualizados a medida que el usuario avanza en el onboarding

8. **Token**: El token generado es un UUID v4 único que sirve como identificador del registro en la base de datos

---

## Validaciones del Sistema

Una vez que el usuario accede al link, el sistema validará:

### Paso Empresa
- Razón Social: Obligatorio
- RUT: Obligatorio, formato válido
- Giro: Obligatorio
- Dirección: Obligatorio
- Comuna: Obligatorio
- Email de Facturación: Obligatorio, formato válido
- Teléfono de Contacto: Obligatorio, formato válido
- Rubro: Obligatorio, debe ser uno de los valores predefinidos
- Sistema de Marcaje: Obligatorio, al menos uno seleccionado

### Paso Administradores
- Nombre: Obligatorio
- Apellido: Obligatorio
- RUT: Obligatorio, formato `XX.XXX.XXX-X`
- Email: Obligatorio, formato válido
- Teléfono: Obligatorio, formato `+56XXXXXXXXX` o similar
- Grupo: Opcional

---

## Integración con Zoho Flow

Cuando el usuario completa el onboarding, los datos se envían automáticamente a Zoho Flow mediante el webhook configurado en `ZOHO_FLOW_TEST_URL`. El payload incluye:

- `id_zoho`: ID original enviado en la generación del link
- `formData`: Todos los datos completados durante el onboarding
- `excelFile`: Archivo Excel en Base64 con todos los datos estructurados
- `metadata`: Información del progreso y estado final

---

## Soporte

Para cualquier consulta o problema con la API, contacta al equipo de desarrollo o revisa los logs del servidor para obtener información detallada sobre errores.
