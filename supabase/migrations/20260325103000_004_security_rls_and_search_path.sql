-- Security hardening for Supabase exposure:
-- 1) Enable RLS on public tables exposed by PostgREST
-- 2) Restrict anon/authenticated direct access
-- 3) Keep service_role operational access
-- 4) Fix mutable search_path warnings on PL/pgSQL functions

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'onboardings',
    'onboarding_consents',
    'data_subject_requests',
    'onboarding_excels',
    'onboarding_history'
  ]
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tbl);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', tbl);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  seq_name TEXT;
BEGIN
  FOR seq_name IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'S'
      AND (
        c.relname LIKE 'onboarding_%'
        OR c.relname LIKE 'data_subject_requests_%'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM anon, authenticated', seq_name);
    EXECUTE format('GRANT ALL ON SEQUENCE public.%I TO service_role', seq_name);
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.onboardings') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'onboardings'
        AND policyname = 'p_onboardings_service_role_all'
    ) THEN
      EXECUTE 'DROP POLICY p_onboardings_service_role_all ON public.onboardings';
    END IF;

    EXECUTE '
      CREATE POLICY p_onboardings_service_role_all
      ON public.onboardings
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    ';
  END IF;

  IF to_regclass('public.onboarding_consents') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'onboarding_consents'
        AND policyname = 'p_onboarding_consents_service_role_all'
    ) THEN
      EXECUTE 'DROP POLICY p_onboarding_consents_service_role_all ON public.onboarding_consents';
    END IF;

    EXECUTE '
      CREATE POLICY p_onboarding_consents_service_role_all
      ON public.onboarding_consents
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    ';
  END IF;

  IF to_regclass('public.data_subject_requests') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'data_subject_requests'
        AND policyname = 'p_data_subject_requests_service_role_all'
    ) THEN
      EXECUTE 'DROP POLICY p_data_subject_requests_service_role_all ON public.data_subject_requests';
    END IF;

    EXECUTE '
      CREATE POLICY p_data_subject_requests_service_role_all
      ON public.data_subject_requests
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    ';
  END IF;

  IF to_regclass('public.onboarding_excels') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'onboarding_excels'
        AND policyname = 'p_onboarding_excels_service_role_all'
    ) THEN
      EXECUTE 'DROP POLICY p_onboarding_excels_service_role_all ON public.onboarding_excels';
    END IF;

    EXECUTE '
      CREATE POLICY p_onboarding_excels_service_role_all
      ON public.onboarding_excels
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    ';
  END IF;

  IF to_regclass('public.onboarding_history') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'onboarding_history'
        AND policyname = 'p_onboarding_history_service_role_all'
    ) THEN
      EXECUTE 'DROP POLICY p_onboarding_history_service_role_all ON public.onboarding_history';
    END IF;

    EXECUTE '
      CREATE POLICY p_onboarding_history_service_role_all
      ON public.onboarding_history
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('public.set_default_onboarding_retention()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.set_default_onboarding_retention() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.mark_onboarding_access(uuid,inet,text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.mark_onboarding_access(uuid,inet,text) SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.anonymize_onboarding(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.anonymize_onboarding(uuid) SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.run_onboarding_retention(integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.run_onboarding_retention(integer) SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.prune_onboarding_history(integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.prune_onboarding_history(integer) SET search_path = public, pg_temp';
  END IF;
END $$;

