import {createClient} from '@supabase/supabase-js';import {env} from './env';
export function serviceDB(){const e=env();if(!e.SUPABASE_URL||!e.SUPABASE_SERVICE_ROLE_KEY)throw new Error('BACKEND_UNAVAILABLE');return createClient(e.SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}})}
