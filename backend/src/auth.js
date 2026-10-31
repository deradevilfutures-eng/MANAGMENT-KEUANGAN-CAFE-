import { randomBytes, createHash } from 'node:crypto';
import argon2 from 'argon2';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'racik_refresh';
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');
const cookieOptions = (isProduction) => ({
  httpOnly: true, secure: isProduction, sameSite: 'lax',
  path: '/api/auth', maxAge: REFRESH_TTL_MS,
});

function publicUser(row, branches) {
  return {
    id: row.id, fullName: row.full_name, username: row.username, email: row.email,
    organizationId: row.organization_id, organizationName: row.organization_name,
    role: row.role_code, branches,
  };
}

async function loadMemberships(pool, userId) {
  const result = await pool.query(
    `SELECT u.id,u.full_name,u.email,u.organization_id,o.name AS organization_name,r.code AS role_code
       FROM users u JOIN organizations o ON o.id=u.organization_id
       JOIN organization_memberships m ON m.user_id=u.id AND m.organization_id=u.organization_id
       JOIN roles r ON r.id=m.role_id
      WHERE u.id=$1 AND u.is_active=TRUE`, [userId]);
  if (!result.rowCount) return null;
  const memberships=[];
  for(const row of result.rows){
    const branchResult=row.role_code==='owner'
      ? await pool.query('SELECT id,code,name FROM branches WHERE organization_id=$1 AND is_active=TRUE ORDER BY name',[row.organization_id])
      : await pool.query(`SELECT b.id,b.code,b.name FROM user_branch_access a
          JOIN branches b ON b.id=a.branch_id
          WHERE a.user_id=$1 AND a.organization_id=$2 AND b.is_active=TRUE ORDER BY b.name`,
          [userId,row.organization_id]);
    memberships.push(publicUser(row,branchResult.rows));
  }
  return memberships;
}

export function registerAuthRoutes(app,{pool,isProduction,loginLimiter}){
  const requireDatabase=(_req,res,next)=>pool?next():res.status(503).json({error:'database_not_configured'});
  app.post('/api/auth/login',requireDatabase,loginLimiter,async(req,res,next)=>{
    try{
      const username=String(req.body?.username||'').trim().toLowerCase();
      const organizationId=String(req.body?.organizationId||'').trim();
      const password=String(req.body?.password||'');
      if(!/^[a-z0-9._-]{3,32}$/.test(username)||!password||password.length>256||organizationId.length>64)
        return res.status(400).json({error:'invalid_credentials_format'});
      const result=organizationId
        ? await pool.query(`SELECT id,password_hash FROM users WHERE lower(username)=$1 AND organization_id=$2 AND is_active=TRUE LIMIT 1`,[username,organizationId])
        : await pool.query(`SELECT id,password_hash FROM users WHERE lower(username)=$1 AND is_active=TRUE ORDER BY created_at LIMIT 2`,[username]);
      if(!organizationId&&result.rowCount>1)return res.status(400).json({error:'organization_id_required'});
      const user=result.rows[0];
      const valid=user?await argon2.verify(user.password_hash,password).catch(()=>false):false;
      if(!valid)return res.status(401).json({error:'invalid_username_or_password'});
      const accessToken=newToken(),refreshToken=newToken();
      const accessExpiresAt=new Date(Date.now()+ACCESS_TTL_MS),refreshExpiresAt=new Date(Date.now()+REFRESH_TTL_MS);
      await pool.query(`INSERT INTO auth_sessions(user_id,access_token_hash,refresh_token_hash,access_expires_at,refresh_expires_at)
        VALUES($1,$2,$3,$4,$5)`,[user.id,hashToken(accessToken),hashToken(refreshToken),accessExpiresAt,refreshExpiresAt]);
      const memberships=await loadMemberships(pool,user.id);
      if(!memberships?.length){
        await pool.query('DELETE FROM auth_sessions WHERE refresh_token_hash=$1',[hashToken(refreshToken)]);
        return res.status(403).json({error:'account_has_no_role'});
      }
      res.cookie(COOKIE_NAME,refreshToken,cookieOptions(isProduction));
      return res.json({accessToken,tokenType:'Bearer',expiresIn:ACCESS_TTL_MS/1000,user:memberships});
    }catch(e){next(e);}
  });
  app.post('/api/auth/refresh',requireDatabase,async(req,res,next)=>{
    try{
      const oldRefresh=req.cookies?.[COOKIE_NAME];
      if(!oldRefresh)return res.status(401).json({error:'refresh_session_missing'});
      const oldHash=hashToken(oldRefresh);
      const found=await pool.query(`SELECT id,user_id FROM auth_sessions WHERE refresh_token_hash=$1
        AND revoked_at IS NULL AND refresh_expires_at>now() LIMIT 1`,[oldHash]);
      const session=found.rows[0];
      if(!session){
        res.clearCookie(COOKIE_NAME,{...cookieOptions(isProduction),maxAge:undefined});
        return res.status(401).json({error:'refresh_session_invalid'});
      }
      const accessToken=newToken(),refreshToken=newToken();
      const rotated=await pool.query(`UPDATE auth_sessions SET access_token_hash=$1,refresh_token_hash=$2,
        access_expires_at=$3,refresh_expires_at=$4,last_used_at=now()
        WHERE id=$5 AND refresh_token_hash=$6 AND revoked_at IS NULL RETURNING user_id`,
        [hashToken(accessToken),hashToken(refreshToken),new Date(Date.now()+ACCESS_TTL_MS),
          new Date(Date.now()+REFRESH_TTL_MS),session.id,oldHash]);
      if(!rotated.rowCount)return res.status(401).json({error:'refresh_session_invalid'});
      const memberships=await loadMemberships(pool,session.user_id);
      if(!memberships?.length){
        await pool.query('UPDATE auth_sessions SET revoked_at=now() WHERE id=$1',[session.id]);
        return res.status(403).json({error:'account_has_no_role'});
      }
      res.cookie(COOKIE_NAME,refreshToken,cookieOptions(isProduction));
      return res.json({accessToken,tokenType:'Bearer',expiresIn:ACCESS_TTL_MS/1000,user:memberships});
    }catch(e){next(e);}
  });
  app.post('/api/auth/logout',requireDatabase,async(req,res,next)=>{
    try{
      const token=req.cookies?.[COOKIE_NAME];
      if(token)await pool.query('UPDATE auth_sessions SET revoked_at=now() WHERE refresh_token_hash=$1 AND revoked_at IS NULL',[hashToken(token)]);
      res.clearCookie(COOKIE_NAME,{...cookieOptions(isProduction),maxAge:undefined});
      return res.status(204).end();
    }catch(e){next(e);}
  });
  app.get('/api/auth/me',requireDatabase,async(req,res,next)=>{
    try{
      const header=req.get('authorization')||'',token=header.startsWith('Bearer ')?header.slice(7):'';
      if(!token||token.length>128)return res.status(401).json({error:'access_token_missing'});
      const result=await pool.query(`SELECT user_id FROM auth_sessions WHERE access_token_hash=$1
        AND revoked_at IS NULL AND access_expires_at>now() AND refresh_expires_at>now() LIMIT 1`,[hashToken(token)]);
      if(!result.rowCount)return res.status(401).json({error:'access_token_invalid'});
      const memberships=await loadMemberships(pool,result.rows[0].user_id);
      if(!memberships?.length)return res.status(403).json({error:'account_has_no_role'});
      await pool.query('UPDATE auth_sessions SET last_used_at=now() WHERE access_token_hash=$1',[hashToken(token)]);
      return res.json({user:memberships});
    }catch(e){next(e);}
  });
}

export async function authenticateAccessToken(pool,req,res,next){
  try{
    const header=req.get('authorization')||'',token=header.startsWith('Bearer ')?header.slice(7):'';
    if(!token||token.length>128)return res.status(401).json({error:'unauthorized'});
    const r=await pool.query(`SELECT s.user_id FROM auth_sessions s JOIN users u ON u.id=s.user_id AND u.is_active=TRUE
      WHERE s.access_token_hash=$1 AND s.revoked_at IS NULL AND s.access_expires_at>now()
      AND s.refresh_expires_at>now() LIMIT 1`,[hashToken(token)]);
    if(!r.rowCount)return res.status(401).json({error:'unauthorized'});
    req.auth={userId:r.rows[0].user_id};return next();
  }catch(e){return next(e);}
}
export async function getUserMemberships(pool,userId){return loadMemberships(pool,userId);}
