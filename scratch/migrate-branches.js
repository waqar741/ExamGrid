const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE branches ADD COLUMN IF NOT EXISTS available_shift_types JSONB DEFAULT \'["MORNING", "AFTERNOON", "FULL_DAY"]\'::jsonb;'
  });
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}
run();
