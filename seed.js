const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Note: We normally need a service role key to bypass RLS, but since we haven't enabled RLS yet, anon key works if policies allow it. 
// Actually, public schema without RLS is open.

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding initial super admin...');

  // Get super_admin role
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'super_admin')
    .single();

  if (roleError || !role) {
    console.error('Error fetching role:', roleError);
    return;
  }

  const email = 'admin@examgrid.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert([{
      role_id: role.id,
      full_name: 'System Admin',
      email: email,
      password_hash: hashedPassword
    }])
    .select()
    .single();

  if (userError) {
    console.error('Error creating user:', userError);
  } else {
    console.log('Successfully created super admin user:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }
}

seed();
