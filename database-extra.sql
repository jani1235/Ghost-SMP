-- Voer dit uit in Supabase SQL Editor. Controleer eerst of er geen dubbele namen bestaan.
-- Unieke namen voorkomt dubbele aanvragen, ook met andere hoofdletters.
create unique index if not exists whitelist_minecraft_unique_ci
on public.whitelist_applications (lower(minecraft));
