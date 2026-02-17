import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avqrlyotdhxxrothetgp.supabase.co';
const supabaseKey = 'sb_publishable_U6k1iNEts-9kjcZBY9vyIA_bsliBOUQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('🔍 Testing Supabase connection...\n');

    try {
        // Test 1: Check connection
        const { data: tables, error: tableError } = await supabase
            .from('inventaris_utama')
            .select('*')
            .limit(1);

        if (tableError) {
            console.log('❌ Koneksi GAGAL:', tableError.message);
            console.log('\n📋 Kemungkinan penyebab:');
            console.log('1. Table "inventaris_utama" belum dibuat di Supabase');
            console.log('2. Anon key salah atau expired');
            console.log('3. Row Level Security (RLS) blocking access');
            return;
        }

        console.log('✅ Koneksi Supabase BERHASIL!');
        console.log('📊 Data dari table inventaris_utama:', tables);

        // Test 2: Count total items
        const { count, error: countError } = await supabase
            .from('inventaris_utama')
            .select('*', { count: 'exact', head: true });

        if (!countError) {
            console.log(`\n📈 Total items di database: ${count || 0}`);
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testConnection();
