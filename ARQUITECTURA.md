# Arquitectura de Persistencia y Sincronización

## Resumen Ejecutivo

Esta arquitectura resuelve los siguientes problemas:

1. **Fricción por pérdida de datos** - Persistencia automática en localStorage
2. **Continuación en otro dispositivo** - Identificador único derivado del token
3. **Reanudación inteligente** - Cálculo automático del primer paso incompleto
4. **Seguimiento comercial** - Eventos separados para Zoho Flow
5. **Separación de conceptos** - Persistencia y sincronización independientes
6. **Preparación para crecer** - Estructura modular y extensible

---

## 1. Política de Persistencia

### Qué se guarda
- Todos los datos del formulario (empresa, admins, trabajadores, turnos, planificaciones, asignaciones)
- Estado de configuración (configureNow)
- Paso actual y pasos completados
- Timestamp de última actualización

### Dónde se guarda
- **localStorage**: Para experiencia inmediata en el mismo dispositivo
- **Clave única**: `onboarding_data_{onboardingId}` donde `onboardingId` se deriva del token

### Cuándo se guarda
- Automáticamente cada vez que cambia cualquier estado
- Sin intervención del usuario (auto-save)

### Cuándo se elimina
- Solo después de enviar exitosamente el formulario completo
- El usuario puede empezar de nuevo abriendo el link original

---

## 2. Política de Sincronización con Zoho Flow

### Parámetro "accion"

Todos los envíos a Zoho Flow incluyen un parámetro `accion` que indica qué operación debe realizar Zoho CRM:

| Valor | Significado | Cuándo se usa |
|-------|-------------|---------------|
| `crear` | Crear nuevo registro en Zoho CRM | Evento `started` (primera vez) |
| `actualizar` | Actualizar registro existente | Eventos `progress` y `complete` |

### Eventos de Tracking

| Evento | Gatillante | Acción | Datos enviados | Bloquea UI |
|--------|-----------|--------|----------------|------------|
| `started` | Primera vez que se abre el link | `crear` | Solo metadata | No |
| `progress` | Click en "Siguiente" | `actualizar` | Solo metadata | No |
| `complete` | Click en "Completar y enviar" | `actualizar` | Datos completos + Excel | Sí |

### Estructura del Payload enviado a Zoho

\`\`\`json
{
  "accion": "crear | actualizar",
  "timestamp": "2024-01-15T10:30:00Z",
  "eventType": "started | progress | complete",
  "metadata": {
    "rut": "76201998-1",
    "nombreEmpresa": "EDALTEC LTDA",
    "pasoActual": 2,
    "totalPasos": 8,
    "porcentajeProgreso": 25
  },
  "formData": { ... }  // Solo en evento "complete"
}
\`\`\`

### Procesamiento en Zoho Flow

En Zoho Flow, puedes usar el parámetro `accion` para decidir qué hacer:

\`\`\`javascript
// En Zoho Deluge
if (payload.get("accion") == "crear") {
    // Crear nuevo registro en Zoho CRM
    response = zoho.crm.createRecord("Onboardings", dataMap);
} else {
    // Actualizar registro existente usando el RUT como identificador
    rut = payload.get("metadata").get("rut");
    response = zoho.crm.updateRecord("Onboardings", recordId, dataMap);
}
\`\`\`

---

## 3. Política de Gatillantes

### Gatillante de persistencia
- **Automático**: Cualquier cambio en el estado dispara un guardado en localStorage
- **Sin acción del usuario requerida**

### Gatillante de eventos Zoho
- **started**: Automático al detectar RUT de empresa (una sola vez, accion="crear")
- **progress**: Manual al hacer click en "Siguiente" (accion="actualizar")
- **complete**: Manual al hacer click en "Completar y enviar" (accion="actualizar")

### Gatillante único de envío final
- **SOLO** el botón "Completar y enviar" en el paso de Resumen
- Este es el único momento donde se envían datos sensibles completos
- Requiere confirmación visual del resultado (éxito/error)

---

## 4. Política de Reanudación

### Algoritmo de cálculo del primer paso incompleto

\`\`\`
1. Si empresa no tiene razón social o RUT → Paso 0 (Empresa)
2. Si no hay admins con datos completos → Paso 1 (Admin)
3. Si no hay trabajadores (no admin) → Paso 2 (Trabajadores)
4. Si paso 3 no está en completedSteps → Paso 3 (Configuración)
5. Si configureNow = false → Paso 7 (Resumen)
6. Si paso 4 no está en completedSteps → Paso 4 (Turnos)
7. Si no hay planificaciones → Paso 5 (Planificaciones)
8. Si paso 6 no está en completedSteps → Paso 6 (Asignación)
9. Default → Paso 7 (Resumen)
\`\`\`

### Prioridad de fuentes de datos
1. localStorage (datos más recientes del usuario)
2. Token desencriptado (datos iniciales de Zoho CRM)
3. Valores por defecto

---

## 5. Estructura de Archivos

\`\`\`
lib/
  onboarding-persistence.ts  # Tipos, funciones de persistencia, helpers
  zoho-tracking.ts           # Funciones de sincronización con Zoho
  crypto.ts                  # Encriptación/desencriptación de tokens

hooks/
  use-onboarding-persistence.ts  # Hook principal que orquesta todo

components/
  onboarding-turnos.tsx      # Componente principal (usa el hook)

app/api/
  generate-link/route.ts     # Genera links con token encriptado
  decrypt-token/route.ts     # Desencripta tokens
  submit-to-zoho/route.ts    # Envía datos a Zoho Flow
\`\`\`

---

## 6. Variables de Entorno

| Variable | Uso | Requerida |
|----------|-----|-----------|
| `ENCRYPTION_SECRET` | Clave para encriptar/desencriptar tokens | Sí |
| `ZOHO_FLOW_TEST_URL` | URL del webhook de Zoho Flow (todos los eventos) | Sí |
| `NEXT_PUBLIC_BASE_URL` | URL base de la aplicación | Sí |

---

## 7. Limitaciones Conocidas

1. **Continuación cross-device requiere mismo link**: El usuario debe usar exactamente el mismo link con token para continuar en otro dispositivo.

2. **localStorage tiene límite de 5MB**: Para onboardings con muchos trabajadores, podría ser un problema. Solución futura: comprimir datos o usar IndexedDB.

3. **Eventos de tracking son "fire and forget"**: Si Zoho está caído, se pierden los eventos de progreso (pero no los datos del usuario).

4. **Un solo onboarding por token**: Si el usuario necesita hacer otro onboarding, necesita un nuevo link desde Zoho CRM.

---

## 8. Preparación para Múltiples Empresas (Futuro)

La estructura actual ya soporta extensión:

\`\`\`typescript
// Futuro: empresa puede ser un array
interface OnboardingData {
  onboardingId: string
  empresas: EmpresaData[]  // Cambiar de 'empresa' a 'empresas'
  // ... resto igual
}
\`\`\`

La clave está en que `onboardingId` es independiente de los datos de empresa, permitiendo múltiples razones sociales bajo un mismo onboarding.
