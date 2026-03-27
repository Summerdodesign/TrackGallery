import { supabase } from './supabase';
import type { UserProfile, UserRole } from './supabase';

export async function signUp(
  username: string, password: string, role: UserRole
): Promise<{ user: UserProfile | null; error: string | null }> {
  const email = `${username.toLowerCase()}@trackgallery.local`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, role } },
  });
  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: '注册失败' };

  return {
    user: {
      id: data.user.id,
      username,
      role,
    },
    error: null,
  };
}

export async function signIn(
  username: string, password: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  const email = `${username.toLowerCase()}@trackgallery.local`;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: '用户名或密码错误' };
  if (!data.user) return { user: null, error: '登录失败' };

  const meta = data.user.user_metadata;
  return {
    user: {
      id: data.user.id,
      username: meta?.username || username,
      role: meta?.role || 'user',
    },
    error: null,
  };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = user.user_metadata;
  return {
    id: user.id,
    username: meta?.username || user.email?.split('@')[0] || 'user',
    role: meta?.role || 'user',
  };
}
