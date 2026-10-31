-- Racik Phase 1 / Migration 001: organization roles and server sessions.
-- Run after database/schema.sql. Safe to re-run.

CREATE TABLE IF NOT EXISTS organization_memberships (
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id),
  FOREIGN KEY (user_id, organization_id)
    REFERENCES users(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  access_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
  ON auth_sessions (user_id, refresh_expires_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_user
  ON organization_memberships (organization_id, user_id);
