import { timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';

export function registerSetupRoutes(app, { pool }) {
  app.get('/api/setup/status', async (_req,res,next)=>{
    try{
      const result=await pool.query("SELECT EXISTS(SELECT 1 FROM organization_memberships m JOIN roles r ON r.id=m.role_id WHERE r.code='owner') AS has_owner");
      res.json({available:Boolean(process.env.BOOTSTRAP_SECRET)&&!result.rows[0].has_owner});
    }catch(e){next(e);}
  });
  app.post('/api/setup/owner', async(req,res,next)=>{
    const secret=String(req.get('x-bootstrap-secret')||'');
    const expected = process.env.BOOTSTRAP_SECRET || '';
    const supplied = Buffer.from(secret);
    const expectedBytes = Buffer.from(expected);
    if(!expected || !secret || supplied.length !== expectedBytes.length || !timingSafeEqual(supplied, expectedBytes))
      return res.status(403).json({error:'setup_not_authorized'});
    const organizationName=String(req.body?.organizationName||'').trim().slice(0,120);
    const ownerName=String(req.body?.ownerName||'').trim().slice(0,120);
    const email=String(req.body?.email||'').trim().toLowerCase();
    const password=String(req.body?.password||'');
    if(!organizationName||!ownerName||!/^\S+@\S+\.\S+$/.test(email)||password.length<12||password.length>256)
      return res.status(400).json({error:'invalid_owner_details'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('racik-owner-bootstrap'))");
      const existing=await client.query("SELECT 1 FROM organization_memberships m JOIN roles r ON r.id=m.role_id WHERE r.code='owner' LIMIT 1");
      if(existing.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'owner_already_exists'});}
      const org=await client.query('INSERT INTO organizations(name) VALUES($1) RETURNING id',[organizationName]);
      const branch=await client.query(`INSERT INTO branches(organization_id,code,name)
        VALUES($1,'MAIN','Cabang Utama') RETURNING id`,[org.rows[0].id]);
      const user=await client.query(`INSERT INTO users(organization_id,full_name,email,password_hash)
        VALUES($1,$2,$3,$4) RETURNING id`,
        [org.rows[0].id,ownerName,email,await argon2.hash(password,{type:argon2.argon2id})]);
      const role=await client.query("SELECT id FROM roles WHERE code='owner'");
      await client.query('INSERT INTO organization_memberships(user_id,organization_id,role_id) VALUES($1,$2,$3)',
        [user.rows[0].id,org.rows[0].id,role.rows[0].id]);
      await client.query('INSERT INTO user_branch_access(user_id,organization_id,branch_id,role_id) VALUES($1,$2,$3,$4)',
        [user.rows[0].id,org.rows[0].id,branch.rows[0].id,role.rows[0].id]);
      await client.query('COMMIT');
      res.status(201).json({success:true,organizationId:org.rows[0].id,branchId:branch.rows[0].id});
    }catch(e){await client.query('ROLLBACK');next(e);}
    finally{client.release();}
  });
}
