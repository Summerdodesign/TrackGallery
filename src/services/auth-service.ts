import { supabase } from './supabase';
import type { UserProfile, UserRole } from './supabase';

export async function signUp(username: string, password: string, role: UserRole): Promise<{ user: UserProfile | null; error: string | null }> {
  // Use email-style auth with username@trackgallery.local
  const email = `${username.toLowerCase()}@trackgallery.local`;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: '注册失败' };

  // Save profile with role
  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    username,
    role,
  });
  if (profileError) return { user: null, error: profileError.message };

  return { user: { id: data.user.id, username, role }, error: null };
}

export async function signIn(username: string, password: string): Promise<{ user: UserProfile | null; error: string | null }> {
  const email = `${username.toLowerCase()}@trackgallery.local`;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: '用户名或密码错误' };
  if (!data.user) return { user: null, error: '登录失败' };

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) return { user: null, error: '用户信息获取失败' };

  return { user: { id: profile.id, username: profile.username, role: profile.role }, error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  return { id: profile.id, username: profile.username, role: profile.role };
}
