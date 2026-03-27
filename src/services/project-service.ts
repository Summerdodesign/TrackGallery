import { supabase } from './supabase';
import type { UserProfile } from './supabase';

export interface ProjectRecord {
  id: string;
  user_id: string;
  project_name: string;
  data: string; // JSON stringified project data
  thumbnail: string;
  created_at: string;
  updated_at: string;
  username?: string; // joined from profiles for admin view
}

export async function saveProject(userId: string, projectId: string | null, projectName: string, data: object, thumbnail: string): Promise<{ id: string | null; error: string | null }> {
  const jsonData = JSON.stringify(data);

  if (projectId) {
    // Update existing
    const { error } = await supabase.from('projects').update({
      project_name: projectName,
      data: jsonData,
      thumbnail,
      updated_at: new Date().toISOString(),
    }).eq('id', projectId);
    if (error) return { id: null, error: error.message };
    return { id: projectId, error: null };
  }

  // Insert new
  const { data: result, error } = await supabase.from('projects').insert({
    user_id: userId,
    project_name: projectName,
    data: jsonData,
    thumbnail,
  }).select('id').single();

  if (error) return { id: null, error: error.message };
  return { id: result.id, error: null };
}

export async function loadProjects(user: UserProfile): Promise<{ projects: ProjectRecord[]; error: string | null }> {
  let query = supabase.from('projects').select('*, profiles(username)').order('updated_at', { ascending: false });

  // Non-admin users only see their own projects
  if (user.role !== 'admin') {
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query;
  if (error) return { projects: [], error: error.message };

  const projects: ProjectRecord[] = (data || []).map((p: Record<string, unknown>) => ({
    ...p,
    username: (p.profiles as Record<string, string>)?.username,
  })) as ProjectRecord[];

  return { projects, error: null };
}

export async function deleteProject(projectId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  return { error: error?.message ?? null };
}
