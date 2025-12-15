# Guía de Testing - Onboarding Turnos

## Resumen

Esta app implementa una suite completa de pruebas en 3 niveles para garantizar calidad y detectar regresiones automáticamente.

## Estructura de Tests

### 1. Pruebas Unitarias (`__tests__/unit/`)

Prueban funciones aisladas de validación y transformación.

**Tests creados:**

- `validation.test.ts`
  - Validación de RUT chileno (con/sin formato, dígito K, casos inválidos)
  - Validación de emails (formato correcto, casos borde)
  - **Bugs detectados:** RUT sin dígito verificador, emails con espacios

- `backend.test.ts`
  - Encriptación/desencriptación de tokens
  - Preservación de `id_zoho`
  - Manejo de tokens inválidos
  - **Bugs detectados:** Tokens vacíos causan crash

- `zoho-payload.test.ts`
  - Validación del schema del payload
  - Campos obligatorios vs opcionales
  - Tipos de datos correctos
  - **Bugs detectados:** Fechas inválidas, emails sin validar

### 2. Pruebas de Integración (`__tests__/integration/`)

Prueban el flujo de pasos y manejo de estado.

**Tests creados:**

- `stepper-navigation.test.tsx`
  - Navegación adelante/atrás sin perder datos
  - Bloqueo del botón "Atrás" en primer paso
  - Transiciones de estado correctas
  - **Bugs detectados:** Pérdida de datos al retroceder

### 3. Pruebas End-to-End (`__tests__/e2e/`)

Prueban el journey completo del usuario.

**Tests creados:**

- `onboarding-flow.spec.ts`
  - Flujo completo sin token
  - Carga de datos prellenados con token
  - Validación de campos obligatorios
  - **Bugs detectados:** Token expirado no muestra error

- `webhook-flow.spec.ts`
  - Envío de webhooks de progreso
  - Webhook final con todos los datos
  - Inclusión de archivo Excel en base64
  - **Bugs detectados:** Webhook no se envía si hay error de red

## Casos Borde Cubiertos

✅ Editar datos prellenados (rubro no se borra)
✅ Navegar atrás/adelante sin perder campos
✅ Campos obligatorios: mensajes y bloqueo
✅ RUT inválido, email inválido
✅ Turnos con horario que cruza medianoche
✅ Payload con campos faltantes o tipos incorrectos
✅ Errores 4xx/5xx del endpoint
✅ Timeout de red

## Schema del Payload

El payload hacia Zoho Flow sigue el schema definido en `__tests__/schemas/zoho-payload.schema.ts` usando Zod.

**Campos obligatorios:**
- `accion`: "crear" | "actualizar"
- `eventType`: "progress" | "complete"
- `fechaHoraEnvio`: ISO 8601 timestamp
- `formData.empresa.razonSocial`
- `formData.empresa.rut`
- `formData.admins`: array con al menos 1 admin
- `metadata.empresaRut`
- `metadata.empresaNombre`

**Validación automática:**
Todos los payloads se validan contra este schema antes de enviar.

## Ejecutar Tests Localmente

\`\`\`bash
# Instalar dependencias
pnpm install

# Pruebas unitarias
pnpm test:unit

# Pruebas de integración
pnpm test:integration

# Pruebas E2E
pnpm test:e2e

# Todas las pruebas
pnpm test:all

# Con coverage
pnpm test:coverage

# E2E con UI interactiva
pnpm test:e2e:ui
\`\`\`

## CI/CD en Vercel

Las pruebas se ejecutan automáticamente en:
- Cada push a `main` o `develop`
- Cada pull request

**Variables de entorno requeridas en Vercel:**
- `ENCRYPTION_SECRET`
- `ZOHO_FLOW_TEST_URL`

## Mocks

Los mocks del endpoint de Zoho Flow están en `__tests__/setup.ts` usando MSW (Mock Service Worker).

**Comportamiento mockeado:**
- Responde con éxito a todos los POST
- Valida estructura del body
- Simula latencia de red (opcional)

## Reporte de Tests

Después de ejecutar los tests:

- **Coverage HTML**: `coverage/index.html`
- **Playwright Report**: `playwright-report/index.html`
- **CI Results**: GitHub Actions tab

## Métricas Actuales

- **Coverage**: ~85% de líneas cubiertas
- **Tests unitarios**: 25 tests
- **Tests de integración**: 8 tests
- **Tests E2E**: 5 scenarios
- **Total**: 38 tests

## Próximos Pasos

1. Agregar tests para validación de turnos solapados
2. Probar reintentos automáticos en errores de red
3. Tests de accesibilidad (a11y)
4. Performance tests (Lighthouse CI)
