import { supabase } from "@/integrations/supabase/client";

export type Team = {
  id: string;
  hub_id: string;
  name: string;
  description: string | null;
  lead_id: string | null;
  lead_profile?: { display_name: string | null; email: string | null } | null;
};

export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  profile?: { display_name: string | null; email: string | null } | null;
};

export async function fetchTeams(hubId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, hub_id, name, description, lead_id, lead:profiles!teams_lead_id_fkey(display_name, email)")
    .eq("hub_id", hubId)
    .order("created_at", { ascending: true });
  if (error) {
    // fallback if fk not named
    const { data: d2, error: e2 } = await supabase
      .from("teams")
      .select("id, hub_id, name, description, lead_id")
      .eq("hub_id", hubId)
      .order("created_at", { ascending: true });
    if (e2) throw e2;
    return (d2 ?? []) as Team[];
  }
  return (data ?? []).map((r: unknown) => {
    const row = r as { id: string; hub_id: string; name: string; description: string | null; lead_id: string | null; lead?: { display_name: string | null; email: string | null } | null };
    return { ...row, lead_profile: row.lead ?? null };
  });
}

export async function fetchTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, hub_id, name, description, lead_id")
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw error;
  return data as Team | null;
}

export async function createTeam(input: { hubId: string; name: string; description?: string; leadId?: string | null }) {
  const { data, error } = await supabase
    .from("teams")
    .insert({
      hub_id: input.hubId,
      name: input.name,
      description: input.description ?? null,
      lead_id: input.leadId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Team;
}

export async function updateTeam(teamId: string, patch: Partial<Pick<Team, "name" | "description" | "lead_id">>) {
  const { error } = await supabase.from("teams").update(patch).eq("id", teamId);
  if (error) throw error;
}

export async function deleteTeam(teamId: string) {
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw error;
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("id, team_id, user_id, profiles(display_name, email)")
    .eq("team_id", teamId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    team_id: r.team_id,
    user_id: r.user_id,
    profile: (r.profiles as unknown as { display_name: string | null; email: string | null }) ?? null,
  }));
}

export async function addTeamMember(teamId: string, userId: string) {
  const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: userId });
  if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
}

export async function removeTeamMember(memberId: string) {
  const { error } = await supabase.from("team_members").delete().eq("id", memberId);
  if (error) throw error;
}
