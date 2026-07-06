import { supabase } from '@/integrations/supabase/client';

export interface Hub {
  id: string;
  name: string;
  description: string | null;
  join_code: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface HubMember {
  id: string;
  hub_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: {
    display_name: string | null;
    email: string | null;
  };
}

export interface HubWithRole {
  hub: Hub;
  role: 'admin' | 'member';
}

// Generate a random join code
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    else code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Fetch a single hub
export async function fetchHub(hubId: string): Promise<Hub> {
  const { data, error } = await supabase
    .from('hubs')
    .select('*')
    .eq('id', hubId)
    .single();

  if (error) {
    console.error('Error fetching hub:', error);
    throw new Error('Failed to fetch hub');
  }

  return data;
}

// Fetch all hubs for a user
export async function fetchMyHubs(userId: string): Promise<HubWithRole[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('hub_members')
    .select('hub_id, role')
    .eq('user_id', userId);

  if (membershipError) {
    console.error('Error fetching memberships:', membershipError);
    throw new Error('Failed to fetch your hubs');
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const hubIds = memberships.map(m => m.hub_id);
  const { data: hubs, error: hubsError } = await supabase
    .from('hubs')
    .select('*')
    .in('id', hubIds);

  if (hubsError) {
    console.error('Error fetching hubs:', hubsError);
    throw new Error('Failed to fetch hub details');
  }

  const result: HubWithRole[] = hubs.map(hub => {
    const membership = memberships.find(m => m.hub_id === hub.id);
    return {
      hub,
      role: membership?.role || 'member',
    };
  });

  return result;
}

// Fetch hub members
export async function fetchHubMembers(hubId: string): Promise<HubMember[]> {
  const { data, error } = await supabase
    .from('hub_members')
    .select(`
      *,
      profile:profiles(display_name, email)
    `)
    .eq('hub_id', hubId);

  if (error) {
    console.error('Error fetching hub members:', error);
    throw new Error('Failed to fetch hub members');
  }

  return data || [];
}

// Create a new hub
export async function createHub({ 
  name, 
  description, 
  ownerId 
}: { 
  name: string; 
  description?: string; 
  ownerId: string;
}): Promise<Hub> {
  const joinCode = generateJoinCode();

  const { data: hub, error: hubError } = await supabase
    .from('hubs')
    .insert({
      name,
      description: description || null,
      join_code: joinCode,
      owner_id: ownerId,
    })
    .select()
    .single();

  if (hubError) {
    console.error('Error creating hub:', hubError);
    throw new Error('Failed to create hub');
  }

  const { error: memberError } = await supabase
    .from('hub_members')
    .insert({
      hub_id: hub.id,
      user_id: ownerId,
      role: 'admin',
    });

  if (memberError) {
    console.error('Error adding owner to hub:', memberError);
    throw new Error('Failed to add you as a member');
  }

  return hub;
}

// Join a hub by code
export async function joinHubByCode(code: string, userId: string): Promise<Hub> {
  const { data: hub, error: hubError } = await supabase
    .from('hubs')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .single();

  if (hubError) {
    console.error('Error finding hub:', hubError);
    throw new Error('Invalid hub code');
  }

  const { data: existingMember, error: checkError } = await supabase
    .from('hub_members')
    .select('id')
    .eq('hub_id', hub.id)
    .eq('user_id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking membership:', checkError);
    throw new Error('Failed to join hub');
  }

  if (existingMember) {
    throw new Error('You are already a member of this hub');
  }

  const { error: memberError } = await supabase
    .from('hub_members')
    .insert({
      hub_id: hub.id,
      user_id: userId,
      role: 'member',
    });

  if (memberError) {
    console.error('Error adding member:', memberError);
    throw new Error('Failed to join hub');
  }

  return hub;
}