const { randomBytes } = require('node:crypto');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({error:'Alleen POST toegestaan.'}); }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({error:'Website is nog niet volledig ingesteld.'});
  const data = req.body || {};
  if (data.website) return res.status(200).json({ok:true}); // honeypot
  const minecraft = typeof data.minecraft === 'string' ? data.minecraft.trim() : '';
  const discord = typeof data.discord === 'string' ? data.discord.trim() : '';
  const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(minecraft)) return res.status(400).json({error:'Minecraft-naam moet 3–16 tekens zijn (letters, cijfers of _).'});
  if (discord.length < 2 || discord.length > 80 || /[\x00-\x1f]/.test(discord)) return res.status(400).json({error:'Vul een geldige Discord-naam in.'});
  if (reason.length < 10 || reason.length > 1000) return res.status(400).json({error:'Reden moet tussen 10 en 1000 tekens zijn.'});
  try {
    const base = url.replace(/\/$/, '');
    const headers = { apikey:key, Authorization:`Bearer ${key}` };
    // Prevent a second request for the same Minecraft username (case-insensitive via separate DB index).
    const id = randomBytes(4).toString('hex');
    const response = await fetch(`${base}/rest/v1/whitelist_applications`, {
      method:'POST', headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({id,minecraft,discord,reason,status:'pending'})
    });
    if (response.status === 409) return res.status(409).json({error:'Voor deze Minecraft-naam bestaat al een aanvraag.'});
    if (!response.ok) { console.error('Supabase insert failed:',response.status); return res.status(500).json({error:'Opslaan mislukt. Probeer later opnieuw.'}); }
    return res.status(201).json({ok:true,message:'Je aanvraag is ontvangen!'});
  } catch (e) { console.error('Application error:',e.message); return res.status(500).json({error:'Verbindingsfout. Probeer later opnieuw.'}); }
};
