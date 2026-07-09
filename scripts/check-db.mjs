import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://chtjqqtvvlamrdesaiwp.supabase.co';
const anonKey = 'sb_publishable_EXTrw0RP7eJ-bdFOwGC6tg_z4g7nag7';
const supabase = createClient(supabaseUrl, anonKey);

// Try with a service_role approach via RPC
// First, check what the current shop looks like in detail
const { data, error } = await supabase
  .from('shops')
  .select('*');

if (error) {
  console.error('Erro ao listar:', error.message);
  console.error('Detalhes:', JSON.stringify(error, null, 2));
  process.exit(1);
}

console.log('Dados da loja:', JSON.stringify(data, null, 2));
console.log('Colunas disponiveis:', Object.keys(data[0] || {}).join(', '));
