-- Racik initial PostgreSQL schema (Phase 1 foundation)
-- Apply to a new database only. Review and back up before production migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  code TEXT NOT NULL, name TEXT NOT NULL, address TEXT, phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code), UNIQUE (id, organization_id)
);
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email), UNIQUE (id, organization_id)
);
CREATE TABLE IF NOT EXISTS roles (
  id SMALLSERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL
);
INSERT INTO roles (code, name) VALUES
  ('owner', 'Owner'), ('manager', 'Manager'), ('cashier', 'Cashier'), ('staff', 'Staff')
ON CONFLICT (code) DO NOTHING;
CREATE TABLE IF NOT EXISTS user_branch_access (
  user_id UUID NOT NULL, organization_id UUID NOT NULL, branch_id UUID NOT NULL,
  role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, branch_id),
  FOREIGN KEY (user_id, organization_id) REFERENCES users(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id, organization_id) REFERENCES branches(id, organization_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS dining_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  table_code TEXT NOT NULL, display_name TEXT NOT NULL,
  capacity SMALLINT NOT NULL DEFAULT 2 CHECK (capacity > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, table_code), UNIQUE (id, branch_id)
);
CREATE TABLE IF NOT EXISTS table_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_org_active ON branches (organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_branch_access_branch ON user_branch_access (branch_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_access_user_org ON user_branch_access (user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_access_role ON user_branch_access (role_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_access_branch_org ON user_branch_access (branch_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_dining_tables_branch_active ON dining_tables (branch_id, is_active);
CREATE INDEX IF NOT EXISTS idx_table_qr_tokens_table ON table_qr_tokens (table_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch ON audit_logs (branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_user_id);

-- Server-only tables: RLS is enabled; browser roles receive no policies.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branch_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Orders, menu, inventory, and finance tables are introduced in later phases.
