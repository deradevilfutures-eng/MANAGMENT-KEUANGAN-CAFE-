-- Cover foreign keys used by branch-scoped operational tables.
CREATE INDEX IF NOT EXISTS idx_transactions_branch_fk ON public.transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by_fk ON public.transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_fk ON public.inventory_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_fk ON public.employees(branch_id);
