-- Racik Phase 1 / Migration 002: indexes for foreign-key lookups.
-- Safe to re-run; does not remove or rewrite application data.

CREATE INDEX IF NOT EXISTS idx_user_branch_access_user_org
  ON public.user_branch_access (user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_access_role
  ON public.user_branch_access (role_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_access_branch_org
  ON public.user_branch_access (branch_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_role
  ON public.organization_memberships (role_id);
CREATE INDEX IF NOT EXISTS idx_table_qr_tokens_table
  ON public.table_qr_tokens (table_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch
  ON public.audit_logs (branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs (actor_user_id);

-- These tables are accessed only through the trusted Node API using the
-- server-side database connection. RLS is enabled and no browser-role
-- policies are granted until a deliberate client access model is introduced.
