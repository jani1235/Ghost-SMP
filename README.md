# GhostSMP website op Vercel

## Upload naar GitHub
Upload `index.html` en de map `api/` naar de hoofdmap van je bestaande GitHub-repository. Je hoeft de Paper-plugin nu niet te verwijderen. De bestaande `worker.js` en `wrangler.toml` worden niet gebruikt door Vercel.

## Supabase
Open SQL Editor en voer `database-extra.sql` uit. De 14 bestaande aanvragen blijven bestaan. De nieuwe website leest geen privéaanvragen terug.

## Vercel instellingen
Open Project > Settings > Environment Variables en voeg toe:
- `SUPABASE_URL`: Project Settings > API > Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase > Project Settings > API Keys > **service_role** (secret), NIET de anon key.

Selecteer Production (en Preview alleen indien gewenst). Herdeploy via Deployments > Redeploy of commit een nieuwe wijziging.

## Test
Open de Vercel-URL, vul het formulier in en controleer in Supabase Table Editor of er een nieuwe rij met status `pending` is toegevoegd.

## Veiligheid / volgende fase
De service-role key blijft uitsluitend in Vercel server environment variables. Zet nooit secrets of spelersgegevens in GitHub. Deze eerste versie heeft eenvoudige veldvalidatie en een honeypot, maar nog geen robuuste rate limiting of CAPTCHA. Voor publieke lancering is Turnstile en rate limiting aan te raden. De Paper-plugin is **nog niet gekoppeld aan deze Vercel API**; dit vereist een afzonderlijke beveiligde staff-/plugin-API.
