import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(1);
  if (error || !data.length) {
    console.error('No users found', error);
    return;
  }
  const user = data[0];
  console.log('Latest user:', user.email, user.full_name);
  console.log('Password hash:', user.password_hash);
  
  // Let's assume the user was created with password "password123" if they didn't specify, or let's test a hash
  const isValid = await bcrypt.compare('password123', user.password_hash);
  console.log('isValid password123:', isValid);
}
run();
