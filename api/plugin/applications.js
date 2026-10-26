
const { authenticate, supabase } = require('../../lib/plugin-db');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Alleen GET toegestaan.'
    });
  }

  if (!authenticate(req, res)) return;

  try {
    const response = await supabase(
      'whitelist_applications?select=id,minecraft,discord,discord_id,reason,status,created,reviewer,reviewed&order=created.desc&limit=1000'
    );

    if (!response.ok) {
      console.error('Supabase list', response.status);

      return res.status(502).json({
        error: 'Databasefout.'
      });
    }

    return res.status(200).json({
      applications: await response.json()
    });

  } catch (error) {
    console.error('List error', error);

    return res.status(502).json({
      error: 'Database niet bereikbaar.'
    });
  }
};
