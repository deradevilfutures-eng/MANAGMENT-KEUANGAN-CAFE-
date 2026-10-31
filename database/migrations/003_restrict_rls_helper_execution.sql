-- Racik Phase 1 / Migration 003: harden platform helper function grants.
-- Supabase may install this event-trigger helper on some projects. Keep this
-- migration portable to local PostgreSQL where the helper may not exist.

DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM authenticated';
  END IF;
END
$$;
