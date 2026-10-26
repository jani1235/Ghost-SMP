const { timingSafeEqual } = require('node:crypto');
function authenticate(req, res) {
  const configured = process.env.GHOSTSMP_PLUGIN_TOKEN;
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!configured || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({error:'Serverconfiguratie ontbreekt.'}); return false;
  }
  const a = Buffer.from(supplied), b = Buffer.from(configured);
  if (a.length !== b.length || !timingSafeEqual(a,b)) {
    res.status(401).json({error:'Geen toegang.'}); return false;
  }
  return true;
}
async function supabase(path, opts={}) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  return fetch(base+'/rest/v1/'+path, {
    ...opts,
    headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,
      ...opts.headers},
    cache:'no-store'
  });
}
module.exports = {authenticate,supabase};
