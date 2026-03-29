# Contexto Operativo - GeoVictoria Onboarding

## Identidad de la app

- `app_id`: `geo`
- `repo`: `https://github.com/lalorirorero/v0-v0onboardingturnosmvp2main`
- `rama base`: `geo/main`
- `ruta local recomendada`: `C:\lalorirorero\repo-geo`
- `proyecto vercel`: `v0-v0onboardingturnosmvp2main` (`prj_wp91I9k1dYn8IoUlL7hTqY1zP09O`)

## Base de datos

- `proveedor`: Supabase
- `alcance actual`: base compartida histórica (en transición a separación total)
- `migraciones legales`: `supabase/migrations/20260319*` y `20260325103000_004_security_rls_and_search_path.sql`

## Controles de cumplimiento ya implementados

- Consentimientos auditables (`onboarding_consents` + endpoints compliance).
- Derechos de titulares (`data_subject_requests` + endpoint API).
- Retención y purga (`run_onboarding_retention`, `prune_onboarding_history`).
- RLS y `search_path` fijo en funciones críticas.
- Texto legal + checkboxes en onboarding.
- Secreto para endpoints de compliance (`COMPLIANCE_API_SECRET` / `CRON_SECRET`).
- Candado de contrato JSON a Zoho Flow:
  - `npm run contract:geo`
  - snapshots en `contracts/geo/*`

## Preflight obligatorio antes de cambiar código

```powershell
git rev-parse --show-toplevel
git branch --show-current
git status -sb
pnpm run contract:geo
```

## Riesgos de separación y mitigación

1. Riesgo: romper mapeo Zoho al cambiar JSON.
   Mitigación: contrato congelado (`contract:geo`) bloqueante en CI.
2. Riesgo: mezclar cambios Geo/Nubox.
   Mitigación: repos separados + chat separado + ruta local exclusiva.
3. Riesgo: drift legal entre apps.
   Mitigación: checklist de compliance por repo y revisión cruzada antes de release.
4. Riesgo: despliegue al proyecto equivocado.
   Mitigación: validar `projectId` y URL objetivo antes de deploy.

