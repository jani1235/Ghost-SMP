const {authenticate,supabase} = require('../../lib/plugin-db');
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'Alleen POST toegestaan.'});
  if (!authenticate(req,res)) return;
  const id = String(req.query.id || '');
  const status = req.body?.status, reviewer = req.body?.reviewer;
  if (!/^[a-f0-9]{8}$/.test(id) || !['approved','denied'].includes(status) ||
      typeof reviewer !== 'string' || !/^[a-zA-Z0-9_]{1,32}$/.test(reviewer))
    return res.status(400).json({error:'Ongeldige aanvraag.'});
  try {
    const path = 'whitelist_applications?id=eq.'+id+'&status=eq.pending';
    const response = await supabase(path, {method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify({status,reviewer,reviewed:new Date().toISOString()})});
    if (!response.ok) {console.error('Supabase review',response.status);return res.status(502).json({error:'Databasefout.'});}
    const rows=await response.json();
    if (!rows.length) return res.status(409).json({error:'Aanvraag bestaat niet of is al beoordeeld.'});
    return res.status(200).json({ok:true,application:rows[0]});
  } catch(e) {console.error('Review error',e);return res.status(502).json({error:'Database niet bereikbaar.'});}
};
