import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  const res1 = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', 'ing.ballesteros16@gmail.com');

  if (res1.error) {
    console.error('Error fetching from usuarios:', res1.error);
  } else {
    console.log('User in usuarios:', res1.data);
  }

  const res2 = await supabase
    .from('usuarios_gestor')
    .select('*')
    .eq('email', 'ing.ballesteros16@gmail.com');

  if (res2.error) {
    console.error('Error fetching from usuarios_gestor:', res2.error);
  } else {
    console.log('User in usuarios_gestor:', res2.data);
  }
}

checkUsers();
