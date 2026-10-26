# GhostSMP Whitelist v2

Een vernieuwde GhostSMP-website op **Cloudflare Workers (gratis instapniveau)** met **D1-database** en een Paper 1.21.11-plugin. De Minecraft-server hoeft geen inkomende websitepoort of Cloudflare Tunnel meer te hebben.

## Belangrijk vóór de verhuizing

1. Maak een back-up van `plugins/GhostWhitelist/applications.yml` en van de oude plugin-JAR.
2. Controleer of na 25 oktober 2026 nog aanvragen binnengekomen zijn. In `migration.json` staan precies de **14** doorgegeven aanvragen, allemaal `pending`, met originele ID's, tijdstippen, namen, Discord-namen en redenen.
3. Stop tijdelijk nieuwe aanvragen op de oude website tijdens de definitieve overstap. Importeren is idempotent op ID.
4. De oude plugin had een harde afhankelijkheid van EtheronRanks; deze nieuwe plugin heeft die niet meer.

## Cloudflare instellen

Vereist: gratis Cloudflare-account, Node.js/npm en Wrangler CLI op je eigen pc **alleen voor de installatie**. Daarna mag je pc uit.

```bash
npm install -g wrangler
wrangler login
wrangler d1 create ghostsmp-whitelist
```

Kopieer `database_id` uit de uitvoer naar `wrangler.toml`. Daarna:

```bash
wrangler d1 execute ghostsmp-whitelist --remote --file=schema.sql
wrangler secret put API_TOKEN
wrangler secret put IMPORT_TOKEN
wrangler deploy
```

Kies voor beide secrets **verschillende**, lange willekeurige waarden (minstens 32 tekens). Zet ze niet in publieke bestanden of GitHub. Noteer de API_TOKEN veilig: die moet later in de Minecraft-pluginconfig. Je krijgt een `*.workers.dev`-URL.

## Oude 14 aanvragen eenmalig importeren

Voer vanaf de map met `migration.json` dit commando uit met jouw echte URL en IMPORT_TOKEN. Voer dit uit in een privéterminal, niet in een publieke livestream:

```bash
curl -X POST "https://JOUW-WORKER.workers.dev/api/admin/import" -H "Authorization: Bearer JOUW_IMPORT_TOKEN" -H "Content-Type: application/json" --data-binary @migration.json
```

Verwachte uitvoer: `{"imported":14,"total":14}`. Bij opnieuw uitvoeren wordt `imported:0` (bestaande ID's worden overgeslagen). Na de import kun je de IMPORT_TOKEN in Cloudflare verwijderen om het import-endpoint te blokkeren.

## Domein

Cloudflare Dashboard → Workers & Pages → jouw Worker → Settings / Domains & Routes → Custom Domains → `whitelist.ghostsmp.nl`. Verwijder of vervang eerst de oude Tunnel-route/DNS-koppeling voor dit subdomein. **Wacht met overschakelen totdat import en plugin werken.** Gebruik het eigen domein ook in de pluginconfig.

## Paper-plugin

Vereist: Java 21, Gradle en Paper 1.21.11. Bouw in de `plugin`-map:

```bash
cd plugin
gradle build
```

Upload `plugin/build/libs/GhostWhitelist-2.0.0.jar` naar de `plugins`-map op je Minecraft-host. Verwijder de oude GhostWhitelist-JAR (laat `applications.yml` staan). Start de server, stop hem daarna kort, vul `plugins/GhostWhitelist/config.yml` in met de juiste `api.base-url` en geheime `api.token`, start opnieuw. De plugin vraagt elke 30 seconden aanvragen op via HTTPS.

Staffcommando's: `/gw list`, `/gw sync`, `/gw approve <id>`, `/gw deny <id>`, `/gw reload`. Alleen staff met permissie `ghostwhitelist.staff` kan ze uitvoeren.

## Grenzen en aandachtspunten

- De webformulieren zijn publiek en hebben basisvalidatie en duplicaatcontrole, maar **nog geen Turnstile/CAPTCHA of IP-rate-limiting**. Voeg Cloudflare Turnstile toe vóór een grotere publieke lancering om spam te beperken.
- De webapp heeft **geen publiek staffdashboard**; staff beoordeelt aanvragen via Minecraft-commando's.
- De plugin synchroniseert de database naar de lokale YAML. De database is voortaan de bron van waarheid; **bewerk oude lokale YAML niet meer handmatig**.
- Als een goedkeuring online lukt maar de Minecraft-server uitvalt voordat de whitelist wordt bijgewerkt, kan de speler nog niet automatisch toegevoegd zijn. Controleer in dat geval de whitelist handmatig; automatische herstelverwerking is nog niet geïmplementeerd.
- Op de nieuwe versie worden de oude Discord-webhooks niet automatisch gebruikt.
- Gratis hosting heeft limieten; 24/7 bereikbaar betekent niet 100% uptimegarantie.
- **Niet live getest**: deploy naar Cloudflare en bouw met Gradle moeten nog op jouw systemen worden uitgevoerd.
