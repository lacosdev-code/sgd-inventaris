const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('inventaris_utama')
    .select('*, technicians ( name )')
    .order('id', { ascending: true });
  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("SUCCESS. Data count:", data.length);
  }
}
check();
