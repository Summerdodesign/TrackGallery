import { supabase } from './supabase';
import type { UserProfile } from './supabase';

export interface TrackRecord {
  id: string;
  user_id: string;
  creator_name: string;
  project_name: string;
  is_public: boolean;
  data: string;
  thumbnail: string;
  created_at: string;
  updated_at: string;
}

export async function saveTrack(
  user: UserProfile,
  trackId: string | null,
  projectName: string,
  isPublic: boolean,
  data: object,
  thumbnail: string,
): Promise<{ id: string | null; error: string | null }> {
  const jsonData = JSON.stringify(data);

  if (trackId) {
    const { error } = await supabase.from('tracks').update({
      project_name: projectName,
      is_public: isPublic,
      data: jsonData,
      thumbnail,
      updated_at: new Date().toISOString(),
    }).eq('id', trackId);
    if (error) return { id: null, error: error.message };
    return { id: trackId, error: null };
  }

  const { data: result, error } = await supabase.from('tracks').insert({
    user_id: user.id,
    creator_name: user.username,
    project_name: projectName,
    is_public: isPublic,
    data: jsonData,
    thumbnail,
  }).select('id').single();

  if (error) return { id: null, error: error.message };
  return { id: result.id, error: null };
}

export async function loadTracks(
  _user: UserProfile,
  search?: string,
): Promise<{ tracks: TrackRecord[]; error: string | null }> {
  let query = supabase
    .from('tracks')
    .select('*')
    .order('updated_at', { ascending: false });

  // Search by project name
  if (search?.trim()) {
    query = query.ilike('project_name', `%${search.trim()}%`);
  }

  // RLS handles visibility: users see own + public, admins see all
  const { data, error } = await query;
  if (error) return { tracks: [], error: error.message };
  return { tracks: (data || []) as TrackRecord[], error: null };
}

export async function deleteTrack(trackId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('tracks').delete().eq('id', trackId);
  return { error: error?.message ?? null };
}

export async function toggleTrackVisibility(
  trackId: string, isPublic: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('tracks').update({ is_public: isPublic }).eq('id', trackId);
  return { error: error?.message ?? null };
}
