import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://inorwdtvjkzguqipttry.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlub3J3ZHR2amt6Z3VxaXB0dHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1OTM2MTEsImV4cCI6MjA5MDE2OTYxMX0.WRQgmO3UX5mbDE6a8new8f0p81VN9iBnmG2lfKBqqkY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
}
