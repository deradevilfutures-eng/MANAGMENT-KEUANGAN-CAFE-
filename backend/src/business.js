import { authenticateAccessToken, getUserMemberships } from './auth.js';

const cleanText = (value, max = 160) => String(value ?? '').trim().slice(0, max);
const number = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function requireAuth(pool) {
  return (req, res, next) => authenticateAccessToken(pool, req, res, next);
}

function requireOrganization(pool) {
  return async (req, res, next) => {
    try {
      const organizationId = cleanText(req.get('x-organization-id'), 64);
      if (!organizationId) return res.status(400).json({ error: 'organization_required' });
      const memberships = await getUserMemberships(pool, req.auth.userId);
      const membership = memberships?.find((m) => m.organizationId === organizationId);
      if (!membership) return res.status(403).json({ error: 'organization_access_denied' });
      req.context = { organizationId, membership };
      return next();
    } catch (error) { return next(error); }
  };
}

function requireBranch(pool) {
  return async (req, res, next) => {
    try {
      const branchId = cleanText(req.get('x-branch-id') || req.query.branchId || req.body?.branchId, 64);
      if (!branchId) return res.status(400).json({ error: 'branch_required' });
      const { organizationId, membership } = req.context;
      const isOwner = membership.role === 'owner';
      if (isOwner) {
        const check = await pool.query(
          'SELECT id FROM branches WHERE id=$1 AND organization_id=$2 AND is_active=TRUE',
          [branchId, organizationId],
        );
        if (!check.rowCount) return res.status(403).json({ error: 'branch_access_denied' });
      } else if (!membership.branches.some((b) => b.id === branchId)) {
        return res.status(403).json({ error: 'branch_access_denied' });
      }
      req.context.branchId = branchId;
      return next();
    } catch (error) { return next(error); }
  };
}

export function registerBusinessRoutes(app, { pool }) {
  const auth = requireAuth(pool);
  const org = requireOrganization(pool);
  const branch = requireBranch(pool);
  const scoped = [auth, org, branch];

  app.get('/api/bootstrap', auth, org, async (req, res, next) => {
    try {
      const { organizationId, membership } = req.context;
      const result = membership.role === 'owner'
        ? await pool.query('SELECT id, code, name FROM branches WHERE organization_id=$1 AND is_active=TRUE ORDER BY name', [organizationId])
        : { rows: membership.branches };
      return res.json({
        organization: { id: organizationId, name: membership.organizationName },
        role: membership.role,
        branches: result.rows,
      });
    } catch (error) { next(error); }
  });

  app.get('/api/summary', ...scoped, async (req, res, next) => {
    try {
      const { organizationId, branchId } = req.context;
      const [totals, stock, recent] = await Promise.all([
        pool.query(`SELECT
          COALESCE(SUM(amount) FILTER (WHERE type='income'),0) AS income,
          COALESCE(SUM(amount) FILTER (WHERE type='expense'),0) AS expense,
          COUNT(*)::int AS transaction_count
          FROM transactions WHERE organization_id=$1 AND branch_id=$2`, [organizationId, branchId]),
        pool.query(`SELECT COALESCE(SUM(quantity*unit_cost),0) AS stock_value,
          COUNT(*) FILTER (WHERE quantity <= minimum_quantity)::int AS low_stock
          FROM inventory_items WHERE organization_id=$1 AND branch_id=$2 AND is_active=TRUE`, [organizationId, branchId]),
        pool.query(`SELECT id,type,category,description,amount,occurred_on
          FROM transactions WHERE organization_id=$1 AND branch_id=$2
          ORDER BY occurred_on DESC, created_at DESC LIMIT 8`, [organizationId, branchId]),
      ]);
      return res.json({ totals: totals.rows[0], inventory: stock.rows[0], recent: recent.rows });
    } catch (error) { next(error); }
  });

  app.get('/api/transactions', ...scoped, async (req,res,next)=>{
    try {
      const r=await pool.query(`SELECT id,type,category,description,amount,occurred_on
        FROM transactions WHERE organization_id=$1 AND branch_id=$2
        ORDER BY occurred_on DESC,created_at DESC LIMIT 500`,[req.context.organizationId,req.context.branchId]);
      res.json({items:r.rows});
    } catch(e){next(e);}
  });
  app.post('/api/transactions', ...scoped, async (req,res,next)=>{
    try {
      const type=req.body?.type;
      const category=cleanText(req.body?.category,80);
      const description=cleanText(req.body?.description,240);
      const amount=number(req.body?.amount,-1);
      const occurredOn=cleanText(req.body?.occurredOn,10);
      if(!['income','expense'].includes(type)||!category||!description||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn))
        return res.status(400).json({error:'invalid_transaction'});
      const r=await pool.query(`INSERT INTO transactions
        (organization_id,branch_id,type,category,description,amount,occurred_on,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id,type,category,description,amount,occurred_on`,
        [req.context.organizationId,req.context.branchId,type,category,description,amount,occurredOn,req.auth.userId]);
      res.status(201).json({item:r.rows[0]});
    }catch(e){next(e);}
  });
  app.delete('/api/transactions/:id', ...scoped, async(req,res,next)=>{
    try {
      const r=await pool.query('DELETE FROM transactions WHERE id=$1 AND organization_id=$2 AND branch_id=$3 RETURNING id',
        [req.params.id,req.context.organizationId,req.context.branchId]);
      if(!r.rowCount)return res.status(404).json({error:'not_found'});
      res.status(204).end();
    }catch(e){next(e);}
  });

  app.get('/api/inventory', ...scoped, async(req,res,next)=>{
    try{
      const r=await pool.query(`SELECT id,name,category,quantity,unit,minimum_quantity,unit_cost
        FROM inventory_items WHERE organization_id=$1 AND branch_id=$2 AND is_active=TRUE ORDER BY name`,
        [req.context.organizationId,req.context.branchId]);
      res.json({items:r.rows});
    }catch(e){next(e);}
  });
  app.post('/api/inventory', ...scoped, async(req,res,next)=>{
    try{
      const name=cleanText(req.body?.name,120),category=cleanText(req.body?.category||'Bahan baku',80);
      const unit=cleanText(req.body?.unit||'pcs',24),quantity=number(req.body?.quantity,-1);
      const minimum=number(req.body?.minimumQuantity,-1),cost=number(req.body?.unitCost,-1);
      if(!name||quantity<0||minimum<0||cost<0)return res.status(400).json({error:'invalid_inventory_item'});
      const r=await pool.query(`INSERT INTO inventory_items
        (organization_id,branch_id,name,category,quantity,unit,minimum_quantity,unit_cost)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id,name,category,quantity,unit,minimum_quantity,unit_cost`,
        [req.context.organizationId,req.context.branchId,name,category,quantity,unit,minimum,cost]);
      res.status(201).json({item:r.rows[0]});
    }catch(e){next(e);}
  });
  app.patch('/api/inventory/:id', ...scoped, async(req,res,next)=>{
    try{
      const quantity=number(req.body?.quantity,-1),minimum=number(req.body?.minimumQuantity,-1),cost=number(req.body?.unitCost,-1);
      if(quantity<0||minimum<0||cost<0)return res.status(400).json({error:'invalid_inventory_item'});
      const r=await pool.query(`UPDATE inventory_items SET quantity=$1,minimum_quantity=$2,unit_cost=$3,updated_at=now()
        WHERE id=$4 AND organization_id=$5 AND branch_id=$6 AND is_active=TRUE
        RETURNING id,name,category,quantity,unit,minimum_quantity,unit_cost`,
        [quantity,minimum,cost,req.params.id,req.context.organizationId,req.context.branchId]);
      if(!r.rowCount)return res.status(404).json({error:'not_found'});
      res.json({item:r.rows[0]});
    }catch(e){next(e);}
  });
  app.delete('/api/inventory/:id', ...scoped, async(req,res,next)=>{
    try{
      const r=await pool.query(`UPDATE inventory_items SET is_active=FALSE,updated_at=now()
        WHERE id=$1 AND organization_id=$2 AND branch_id=$3 AND is_active=TRUE RETURNING id`,
        [req.params.id,req.context.organizationId,req.context.branchId]);
      if(!r.rowCount)return res.status(404).json({error:'not_found'});
      res.status(204).end();
    }catch(e){next(e);}
  });

  app.get('/api/employees', ...scoped, async(req,res,next)=>{
    try{
      const r=await pool.query(`SELECT id,full_name,position,phone,monthly_salary,is_active
        FROM employees WHERE organization_id=$1 AND branch_id=$2 ORDER BY full_name`,
        [req.context.organizationId,req.context.branchId]);
      res.json({items:r.rows});
    }catch(e){next(e);}
  });
  app.post('/api/employees', ...scoped, async(req,res,next)=>{
    try{
      const name=cleanText(req.body?.fullName,120),position=cleanText(req.body?.position||'Staff',80);
      const phone=cleanText(req.body?.phone,40),salary=number(req.body?.monthlySalary,-1);
      if(!name||salary<0)return res.status(400).json({error:'invalid_employee'});
      const r=await pool.query(`INSERT INTO employees
        (organization_id,branch_id,full_name,position,phone,monthly_salary)
        VALUES($1,$2,$3,$4,$5,$6)
        RETURNING id,full_name,position,phone,monthly_salary,is_active`,
        [req.context.organizationId,req.context.branchId,name,position,phone,salary]);
      res.status(201).json({item:r.rows[0]});
    }catch(e){next(e);}
  });
  app.patch('/api/employees/:id/status', ...scoped, async(req,res,next)=>{
    try{
      if(typeof req.body?.isActive!=='boolean')return res.status(400).json({error:'invalid_status'});
      const r=await pool.query(`UPDATE employees SET is_active=$1,updated_at=now()
        WHERE id=$2 AND organization_id=$3 AND branch_id=$4 RETURNING id,is_active`,
        [req.body.isActive,req.params.id,req.context.organizationId,req.context.branchId]);
      if(!r.rowCount)return res.status(404).json({error:'not_found'});
      res.json({item:r.rows[0]});
    }catch(e){next(e);}
  });
  app.delete('/api/employees/:id', ...scoped, async(req,res,next)=>{
    try{
      const r=await pool.query('DELETE FROM employees WHERE id=$1 AND organization_id=$2 AND branch_id=$3 RETURNING id',
        [req.params.id,req.context.organizationId,req.context.branchId]);
      if(!r.rowCount)return res.status(404).json({error:'not_found'});
      res.status(204).end();
    }catch(e){next(e);}
  });
}
