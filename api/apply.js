
const { randomBytes } = require('node:crypto');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'Alleen POST toegestaan.'
    });
  }

  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(503).json({
      error: 'Website is nog niet volledig ingesteld.'
    });
  }

  // Controleer het inlogtoken
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({
      error: 'Log eerst in met Discord.'
    });
  }

  try {
    const token = match[1];

    const authResponse = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`
      }
    });

    if (!authResponse.ok) {
      return res.status(401).json({
        error: 'Je Discord-sessie is verlopen. Log opnieuw in.'
      });
    }

    const user = await authResponse.json();

    // Alleen geverifieerde Discord-identiteiten toestaan
    const discordIdentity = (user.identities || []).find(
      identity => identity.provider === 'discord'
    );

    if (!discordIdentity) {
      return res.status(403).json({
        error: 'Je moet inloggen met Discord.'
      });
    }

    const discordId = String(
      discordIdentity.id ||
      discordIdentity.identity_data?.provider_id ||
      discordIdentity.identity_data?.sub ||
      ''
    );

    if (!/^\d{15,22}$/.test(discordId)) {
      return res.status(403).json({
        error: 'Je Discord-account kon niet worden gecontroleerd.'
      });
    }

    const discord =
      discordIdentity.identity_data?.full_name ||
      discordIdentity.identity_data?.name ||
      discordIdentity.identity_data?.user_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      'Discord-gebruiker';

    const data = req.body || {};

    // Honeypot tegen spambots
    if (data.website) {
      return res.status(200).json({ ok: true });
    }

    const minecraft =
      typeof data.minecraft === 'string'
        ? data.minecraft.trim()
        : '';

    const reason =
      typeof data.reason === 'string'
        ? data.reason.trim()
        : '';

    if (!/^[a-zA-Z0-9_]{3,16}$/.test(minecraft)) {
      return res.status(400).json({
        error: 'Minecraft-naam moet 3–16 tekens zijn.'
      });
    }

    if (reason.length < 10 || reason.length > 1000) {
      return res.status(400).json({
        error: 'Reden moet tussen 10 en 1000 tekens zijn.'
      });
    }

    const id = randomBytes(4).toString('hex');

    const response = await fetch(
      `${url}/rest/v1/whitelist_applications`,
      {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          id,
          minecraft,
          discord: String(discord).slice(0, 80),
          discord_id: discordId,
          reason,
          status: 'pending'
        })
      }
    );

    if (response.status === 409) {
      return res.status(409).json({
        error: 'Voor deze Minecraft-naam bestaat al een aanvraag.'
      });
    }

    if (!response.ok) {
      console.error('Supabase insert failed:', response.status);
      return res.status(500).json({
        error: 'Opslaan mislukt. Probeer later opnieuw.'
      });
    }

    return res.status(201).json({
      ok: true,
      message: 'Je aanvraag is ontvangen!'
    });

  } catch (error) {
    console.error('Application error:', error.message);

    return res.status(500).json({
      error: 'Verbindingsfout. Probeer later opnieuw.'
    });
  }
};
