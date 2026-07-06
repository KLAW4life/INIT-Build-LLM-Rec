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
  // First, get all hub memberships for the user
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

  // Then, get the hub details for each membership
  const hubIds = memberships.map(m => m.hub_id);
  const { data: hubs, error: hubsError } = await supabase
    .from('hubs')
    .select('*')
    .in('id', hubIds);

  if (hubsError) {
    console.error('Error fetching hubs:', hubsError);
    throw new Error('Failed to fetch hub details');
  }

  // Combine the data
  const result: HubWithRole[] = hubs.map(hub => {
    const membership = memberships.find(m => m.hub_id === hub.id);
    return {
      hub,
      role: membership?.role || 'member',
    };
  });

  return result;
}

// Fetch hub members with profiles 
export async function fetchHubMembers(hubId: string): Promise<HubMember[]> {
  try {
    // Step 1: Get all hub members
    const { data: members, error: membersError } = await supabase
      .from('hub_members')
      .select('*')
      .eq('hub_id', hubId);

    if (membersError) {
      console.error('Error fetching hub members:', membersError);
      throw new Error('Failed to fetch hub members');
    }

    if (!members || members.length === 0) {
      return [];
    }

    // Step 2: Get profiles for all members
    const userIds = members.map(m => m.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.warn('Error fetching profiles:', profilesError);
      // Return members without profiles
      return members.map(member => ({
        ...member,
        profile: undefined,
      }));
    }

    // Step 3: Combine the data
    const result: HubMember[] = members.map(member => {
      const profile = profiles?.find(p => p.id === member.user_id);
      return {
        ...member,
        profile: profile ? {
          display_name: profile.display_name,
          email: profile.email,
        } : undefined,
      };
    });

    return result;
  } catch (error) {
    console.error('Error in fetchHubMembers:', error);
    throw error;
  }
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

  // Start a transaction - create hub
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

  // Add the owner as an admin member
  const { error: memberError } = await supabase
    .from('hub_members')
    .insert({
      hub_id: hub.id,
      user_id: ownerId,
      role: 'admin',
    });

  if (memberError) {
    console.error('Error adding owner to hub:', memberError);
    // You might want to delete the hub here if member creation fails
    throw new Error('Failed to add you as a member');
  }

  return hub;
}

// Join a hub by code
export async function joinHubByCode(code: string, userId: string): Promise<Hub> {
  // Find the hub by join code
  const { data: hub, error: hubError } = await supabase
    .from('hubs')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .single();

  if (hubError) {
    console.error('Error finding hub:', hubError);
    throw new Error('Invalid hub code');
  }

  // Check if user is already a member
  const { data: existingMember, error: checkError } = await supabase
    .from('hub_members')
    .select('id')
    .eq('hub_id', hub.id)
    .eq('user_id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error checking membership:', checkError);
    throw new Error('Failed to join hub');
  }

  if (existingMember) {
    throw new Error('You are already a member of this hub');
  }

  // Add user as a member
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

// Check if user is a member of a hub
export async function isHubMember(hubId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('hub_members')
    .select('id')
    .eq('hub_id', hubId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking membership:', error);
    throw new Error('Failed to check membership');
  }

  return !!data;
}

// Check if user has a specific role in a hub
export async function hasHubRole(
  hubId: string, 
  userId: string, 
  role: 'admin' | 'member'
): Promise<boolean> {
  const { data, error } = await supabase
    .from('hub_members')
    .select('id')
    .eq('hub_id', hubId)
    .eq('user_id', userId)
    .eq('role', role)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking role:', error);
    throw new Error('Failed to check role');
  }

  return !!data;
}