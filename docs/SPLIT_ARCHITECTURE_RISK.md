# Separación Total Geo/Nubox - Riesgos y Mitigaciones

## Decisión de arquitectura

Separación completa por:

- Repositorio.
- Proyecto Vercel.
- Endpoint Zoho Flow.
- Chat/contexto de desarrollo.
- Base de datos (objetivo final: proyecto Supabase dedicado por app).

## Riesgos relevantes

1. Riesgo de divergencia funcional no controlada.
   Impacto: medianamente alto (comportamientos distintos no intencionados).
   Mitigación: checklist de release compartido y pruebas de regresión por flujo.

2. Riesgo de incumplimiento legal por asimetría entre repos.
   Impacto: alto.
   Mitigación: mantener los mismos controles de compliance como baseline en ambos repos y auditar por release.

3. Riesgo de operación duplicada (más costo y overhead).
   Impacto: medio.
   Mitigación: núcleo de buenas prácticas documentado y automatizado en CI.

4. Riesgo de despliegue en proyecto equivocado.
   Impacto: alto.
   Mitigación: validación explícita de `projectId`, entorno y URL objetivo antes de deploy.

5. Riesgo de cruce de datos entre apps.
   Impacto: crítico.
   Mitigación: separar base de datos y endpoints; mientras exista transición, etiquetar por `source_app` y segmentar accesos.

## Estado operativo recomendado

- Geo se mantiene en su repo/proyecto actual.
- Nubox opera en repo/proyecto dedicados.
- Cualquier mejora común se decide explícitamente si se porta o no entre repos.

