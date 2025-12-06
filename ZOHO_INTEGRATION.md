# Integración con Zoho CRM y Zoho Flow

Este documento explica cómo usar la integración de Zoho en el formulario de onboarding.

## 1. Prellenar el formulario con datos de Zoho CRM

Para prellenar el formulario con datos desde Zoho CRM, añade un parámetro `prefill` en la URL con los datos en formato JSON:

### Formato de URL:

\`\`\`
https://tu-dominio.com/?prefill=<JSON_ENCODED>
\`\`\`

### Ejemplo de datos para prellenar:

\`\`\`json
{
  "razonSocial": "Mi Empresa S.A.",
  "nombreFantasia": "Mi Empresa",
  "rut": "76123456-7",
  "giro": "Servicios tecnológicos",
  "direccion": "Av. Principal 123",
  "comuna": "Santiago",
  "emailFacturacion": "facturacion@miempresa.cl",
  "telefonoContacto": "+56912345678",
  "sistema": ["3.- GeoVictoria APP"],
  "rubro": "3.- BANCA Y FINANZAS",
  "admins": [
    {
      "nombre": "Juan Pérez",
      "rut": "12345678-9",
      "email": "juan@miempresa.cl",
      "telefono": "+56987654321"
    }
  ]
}
\`\`\`

### Ejemplo completo de URL:

\`\`\`
https://tu-dominio.com/?prefill=%7B%22razonSocial%22%3A%22Mi%20Empresa%20S.A.%22%2C%22nombreFantasia%22%3A%22Mi%20Empresa%22%2C%22rut%22%3A%2276123456-7%22%2C%22admins%22%3A%5B%7B%22nombre%22%3A%22Juan%20P%C3%A9rez%22%2C%22rut%22%3A%2212345678-9%22%2C%22email%22%3A%22juan%40miempresa.cl%22%2C%22telefono%22%3A%22%2B56987654321%22%7D%5D%7D
\`\`\`

### Desde Zoho Flow:

En Zoho Flow, puedes generar esta URL usando la función `encodeURI`:

\`\`\`javascript
// En Zoho Flow
prefillData = {
  "razonSocial": account.Account_Name,
  "rut": account.RUT,
  "emailFacturacion": account.Email,
  // ... más campos
};

prefillJSON = prefillData.toString();
encodedData = encodeURI(prefillJSON);
url = "https://tu-dominio.com/?prefill=" + encodedData;

// Envía esta URL al usuario por email o redirígelo
\`\`\`

## 2. Recibir datos completados en Zoho Flow

Cuando el usuario complete el formulario y haga clic en "Enviar", los datos se enviarán automáticamente al webhook de Zoho Flow configurado en la variable de entorno `ZOHO_FLOW_TEST_URL`.

### Estructura de datos enviados:

\`\`\`json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "formData": {
    "empresa": {
      "razonSocial": "...",
      "nombreFantasia": "...",
      "rut": "...",
      "giro": "...",
      "direccion": "...",
      "comuna": "...",
      "emailFacturacion": "...",
      "telefonoContacto": "...",
      "sistema": ["..."],
      "rubro": "...",
      "grupos": []
    },
    "admins": [
      {
        "id": 1234567890,
        "nombre": "...",
        "rut": "...",
        "email": "...",
        "telefono": "..."
      }
    ],
    "trabajadores": [...],
    "turnos": [...],
    "planificaciones": [...],
    "asignaciones": [...],
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
\`\`\`

### En Zoho Flow:

1. Crea un webhook (Trigger: Webhook)
2. Copia la URL del webhook
3. Configura la variable de entorno `ZOHO_FLOW_TEST_URL` con esa URL
4. En tu flujo, procesa los datos recibidos:

\`\`\`javascript
// En Zoho Flow, los datos llegarán en el webhook
empresaData = webhook.formData.empresa;
adminsData = webhook.formData.admins;
trabajadoresData = webhook.formData.trabajadores;

// Puedes crear/actualizar registros en Zoho CRM
for each admin in adminsData {
  // Crear contacto en CRM
  createRecord("Contacts", {
    "Full_Name": admin.nombre,
    "Email": admin.email,
    "Phone": admin.telefono
  });
}
\`\`\`

## 3. Flujo completo de integración

1. **Usuario en Zoho CRM** → Crea un deal/account
2. **Zoho Flow detecta** → Genera URL con datos prellenados
3. **Usuario recibe email** → Con link al formulario prellenado
4. **Usuario completa** → Rellena campos faltantes (trabajadores, turnos, etc.)
5. **Usuario envía** → Datos van automáticamente a Zoho Flow
6. **Zoho Flow procesa** → Actualiza CRM, crea registros, envía notificaciones

## 4. Variables de entorno requeridas

\`\`\`env
ZOHO_FLOW_TEST_URL=https://flow.zoho.com/1234567890/flow/webhook/...
\`\`\`

## 5. Testing

Usa el botón de prueba "TEST ZOHO" en la esquina inferior derecha para probar la conexión con Zoho Flow sin necesidad de completar todo el formulario.
