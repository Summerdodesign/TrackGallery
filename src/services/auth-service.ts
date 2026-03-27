import { supabase } from './supabase';
import type { UserProfile, UserRole } from './supabase';

/**
 * 确保 profile 存在，不存在则创建
 */
async function ensureProfile(userId: string, username: string, role: UserRole = 'user'): Promise<UserProfile | null> {
  // 先尝试读取
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existing) {
    return { id: existing.id, username: existing.username, role: existing.role };
  }

  // 不存在则插入
  const { data: created, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, username, role })
    .select()
    .single();

  if (error || !created) return null;
  return { id: created.id, username: created.username, role: created.role };
}

export async function signUp(
  username: string, password: string, role: UserRole
): Promise<{ user: UserProfile | null; error: string | null }> {
  const email = `${username.toLowerCase()}@trackgallery.local`;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: '注册失败' };

  const profile = await ensureProfile(data.user.id, username, role);
  if (!profile) {
    // Profile 创建失败但 auth 成功，直接返回基本信息
    return { user: { id: data.user.id, username, role }, error: null };
  }
  return { user: profile, error: null };
}

export async function signIn(
  username: string, password: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  const email = `${username.toLowerCase()}@trackgallery.local`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email, password,
  });
  if (error) return { user: null, error: '用户名或密码错误' };
  if (!data.user) return { user: null, error: '登录失败' };

  // 尝试获取 profile，不存在则自动创建
  const profile = await ensureProfile(data.user.id, username);
  if (!profile) {
    // 即使 profile 查询失败也让用户进去
    return { user: { id: data.user.id, username, role: 'user' }, error: null };
  }
  return { user: profile, error: null };
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

  if (!profile) {
    // 有 auth 但没 profile，用邮箱前缀作为用户名
    const username = user.email?.split('@')[0] || 'user';
    return { id: user.id, username, role: 'user' };
  }
  return { id: profile.id, username: profile.username, role: profile.role };
}
