-- Purga de correos personales en onboarding despues de N dias desde fecha_creacion
-- Objetivo: minimizar datos de contacto personal en admins/trabajadores
-- Safe to run multiple times (idempotent).

CREATE INDEX IF NOT EXISTS idx_onboardings_fecha_creacion ON onboardings(fecha_creacion);

CREATE OR REPLACE FUNCTION purge_onboarding_personal_emails(
  p_limit INTEGER DEFAULT 500,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE(processed_count INTEGER)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row RECORD;
  v_datos JSONB;
  v_new_datos JSONB;
  v_admins JSONB;
  v_trabajadores JSONB;
  v_count INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT id, datos_actuales
    FROM onboardings
    WHERE deleted_at IS NULL
      AND anonymized_at IS NULL
      AND fecha_creacion <= NOW() - make_interval(days => GREATEST(p_days, 1))
    ORDER BY fecha_creacion ASC
    LIMIT GREATEST(p_limit, 1)
  LOOP
    v_datos := COALESCE(v_row.datos_actuales, '{}'::jsonb);

    -- Admins: limpiar email y correo si existen
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'object' THEN
            jsonb_set(
              jsonb_set(elem, '{email}', to_jsonb(''::text), true),
              '{correo}',
              to_jsonb(''::text),
              true
            )
          ELSE elem
        END
      ),
      '[]'::jsonb
    )
    INTO v_admins
    FROM jsonb_array_elements(COALESCE(v_datos -> 'admins', '[]'::jsonb)) AS elem;

    -- Trabajadores: limpiar correo y email si existen
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'object' THEN
            jsonb_set(
              jsonb_set(elem, '{correo}', to_jsonb(''::text), true),
              '{email}',
              to_jsonb(''::text),
              true
            )
          ELSE elem
        END
      ),
      '[]'::jsonb
    )
    INTO v_trabajadores
    FROM jsonb_array_elements(COALESCE(v_datos -> 'trabajadores', '[]'::jsonb)) AS elem;

    v_new_datos := jsonb_set(
      jsonb_set(v_datos, '{admins}', v_admins, true),
      '{trabajadores}',
      v_trabajadores,
      true
    );

    IF v_new_datos IS DISTINCT FROM v_datos THEN
      UPDATE onboardings
      SET
        datos_actuales = v_new_datos,
        fecha_ultima_actualizacion = NOW(),
        compliance_metadata = COALESCE(compliance_metadata, '{}'::jsonb) || jsonb_build_object(
          'personal_email_purged_at', NOW(),
          'personal_email_retention_days', GREATEST(p_days, 1)
        )
      WHERE id = v_row.id;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  processed_count := v_count;
  RETURN NEXT;
END;
$$;

