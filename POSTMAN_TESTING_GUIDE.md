# Guía de Pruebas con Postman - API de Encriptación

Esta guía te muestra cómo probar la API de generación de links encriptados usando Postman.

---

## 📋 Paso a Paso

### Paso 1: Configurar Postman

1. Abre Postman
2. Crea una nueva petición (New Request)
3. Nombre sugerido: "Generate Encrypted Link"

### Paso 2: Configurar la Petición

**Método:** `POST`

**URL:** Depende de tu entorno:

- **Desarrollo local:** `http://localhost:3000/api/generate-link`
- **Preview de v0:** Usa la URL de tu preview (ej: `https://tu-preview.v0.app/api/generate-link`)
- **Producción:** `https://tu-dominio.com/api/generate-link`

### Paso 3: Configurar Headers

En la pestaña **Headers**, agrega:

\`\`\`
Content-Type: application/json
\`\`\`

### Paso 4: Configurar el Body

1. Ve a la pestaña **Body**
2. Selecciona **raw**
3. Selecciona **JSON** en el dropdown

**Pega el siguiente JSON de ejemplo:**

\`\`\`json
{
  "empresaData": {
    "razonSocial": "EDALTEC LTDA",
    "nombreFantasia": "EDALTEC",
    "rut": "76201998-1",
    "giro": "Comercializadora de equipos de alta tecnología",
    "direccion": "Chiloé 5138",
    "comuna": "San Miguel",
    "emailFacturacion": "marcelo.vargas@edaltec.cl",
    "telefonoContacto": "56995925655",
    "sistema": ["3.- GeoVictoria APP"],
    "rubro": "5.- DISTRIBUCIÓN"
  }
}
\`\`\`

### Paso 5: Enviar la Petición

1. Haz clic en el botón **Send**
2. Espera la respuesta

### Paso 6: Interpretar la Respuesta

Si todo funciona correctamente, recibirás una respuesta similar a:

\`\`\`json
{
  "success": true,
  "link": "https://tu-app.vercel.app?token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0...",
  "token": "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0...",
  "message": "Link generado exitosamente. El token contiene los datos encriptados de forma segura."
}
\`\`\`

### Paso 7: Probar el Link

1. Copia el valor del campo `"link"` de la respuesta
2. Pégalo en tu navegador
3. El formulario debería abrirse con los datos prellenados:
   - Razón Social: EDALTEC LTDA
   - Nombre de fantasía: EDALTEC
   - RUT: 76201998-1
   - Etc.

---

## 🧪 Ejemplos de Datos para Probar

### Ejemplo 1: Empresa Básica

\`\`\`json
{
  "empresaData": {
    "razonSocial": "INNOVATECH SPA",
    "nombreFantasia": "InnovaTech",
    "rut": "77123456-7",
    "giro": "Servicios de consultoría tecnológica",
    "direccion": "Av. Providencia 1234",
    "comuna": "Providencia",
    "emailFacturacion": "facturacion@innovatech.cl",
    "telefonoContacto": "56912345678",
    "sistema": ["1.- GeoVictoria BOX", "5.- GeoVictoria WEB"],
    "rubro": "22.- CONSULTORÍA"
  }
}
\`\`\`

### Ejemplo 2: Empresa de Salud

\`\`\`json
{
  "empresaData": {
    "razonSocial": "CLÍNICA MÉDICA DEL SUR SA",
    "nombreFantasia": "Clínica del Sur",
    "rut": "96555444-3",
    "giro": "Servicios médicos y hospitalarios",
    "direccion": "Av. Las Condes 8000",
    "comuna": "Las Condes",
    "emailFacturacion": "contabilidad@clinicadelsur.cl",
    "telefonoContacto": "56922334455",
    "sistema": ["2.- GeoVictoria CALL", "4.- GeoVictoria USB"],
    "rubro": "1.- SALUD"
  }
}
\`\`\`

### Ejemplo 3: Empresa de Retail

\`\`\`json
{
  "empresaData": {
    "razonSocial": "SUPERMERCADOS CENTRALES LTDA",
    "nombreFantasia": "Super Central",
    "rut": "78999888-k",
    "giro": "Venta al por menor de productos alimenticios",
    "direccion": "Alameda 1500",
    "comuna": "Santiago Centro",
    "emailFacturacion": "finanzas@supercentral.cl",
    "telefonoContacto": "56956789012",
    "sistema": ["3.- GeoVictoria APP"],
    "rubro": "16.- RETAIL PEQUEÑO"
  }
}
\`\`\`

---

## ⚠️ Posibles Errores y Soluciones

### Error 400: "Se requieren los datos de la empresa"

**Causa:** El campo `empresaData` no está presente en el JSON

**Solución:** Asegúrate de que tu JSON tenga la estructura correcta con `empresaData` como clave principal

\`\`\`json
{
  "empresaData": {
    // ... datos aquí
  }
}
\`\`\`

### Error 500: "Error al generar el link"

**Causa:** Problema con la encriptación o variable de entorno `ENCRYPTION_SECRET` no configurada

**Solución:** 
1. Verifica que la variable `ENCRYPTION_SECRET` esté configurada en las variables de entorno
2. Asegúrate de que tenga al menos 32 caracteres

### Error de CORS

**Causa:** Estás haciendo la petición desde un dominio diferente sin configuración CORS

**Solución:** 
- Si estás en desarrollo local, usa `http://localhost:3000`
- Si estás en preview, usa la URL completa del preview

---

## 🔍 Verificar la Encriptación

Para verificar que el token está correctamente encriptado:

1. Copia el valor de `"token"` de la respuesta
2. NO deberías poder leer los datos a simple vista
3. El token debería verse algo así: `eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0...` (muy largo)

---

## 📝 Notas Importantes

- El token generado es **temporal** y contiene todos los datos de empresa encriptados
- Cada vez que llamas a la API con los mismos datos, genera un **token diferente** (por seguridad)
- El token solo puede ser desencriptado con la misma `ENCRYPTION_SECRET` configurada en tu proyecto
- Los datos encriptados incluyen **todos los campos** del objeto `empresaData`

---

## 🚀 Próximos Pasos

Una vez que confirmes que la API funciona correctamente:

1. Implementa la misma lógica en **Zoho CRM** usando Deluge
2. Configura un **Zoho Flow** que llame a esta API cuando se cree/actualice un Deal
3. El Flow enviará el link encriptado por email al cliente o lo guardará en el CRM

---

## 💡 Tips

- Usa la **colección de Postman** para guardar múltiples ejemplos
- Crea un **entorno (Environment)** en Postman con variables como:
  - `base_url`: URL de tu API
  - Esto facilita cambiar entre desarrollo y producción

### Ejemplo de Variables de Entorno en Postman:

\`\`\`
base_url: http://localhost:3000
\`\`\`

Luego en la URL usa: `{{base_url}}/api/generate-link`
