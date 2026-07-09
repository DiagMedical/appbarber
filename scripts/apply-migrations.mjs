const sql = `alter table shops
  add column if not exists public_slug text,
  add column if not exists instagram text,
  add column if not exists working_hours jsonb default '{}',
  add column if not exists gallery_photos jsonb default '[]',
  add column if not exists hero_photo text;

update shops set public_slug = 'studio-lima-b3d9f2a1' where public_slug is null;`;

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN nao definido');
    process.exit(1);
  }

  const response = await fetch(
    'https://api.supabase.com/v1/projects/chtjqqtvvlamrdesaiwp/database/query',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Resposta:', text);
}

main().catch(console.error);
