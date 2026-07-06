import { supabase } from "@/integrations/supabase/client";

export type HubPage = "forms" | "teams" | "members" | "roles" | "applications";
export const ALL_PAGES: HubPage[] = ["forms", "teams", "members", "roles", "applications"];

export type CustomRole = {
  id: string;
  hub_id: string;
  name: string;
  description: string | null;
  permissions: HubPage[];
};

export async function fetchCustomRoles(hubId: string): Promise<CustomRole[]> {
  const { data, error } = await supabase
    .from("hub_custom_roles")
    .select("id, hub_id, name, description, hub_role_permissions(page)")
    .eq("hub_id", hubId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    hub_id: r.hub_id,
    name: r.name,
    description: r.description,
    permissions: ((r.hub_role_permissions as unknown as { page: HubPage }[]) ?? []).map((p) => p.page),
  }));
}

export async function createCustomRole(hubId: string, name: string, description?: string) {
  const { data, error } = await supabase
    .from("hub_custom_roles")
    .insert({ hub_id: hubId, name, description: description ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomRole(roleId: string) {
  const { error } = await supabase.from("hub_custom_roles").delete().eq("id", roleId);
  if (error) throw error;
}

export async function setRolePermissions(roleId: string, pages: HubPage[]) {
  await supabase.from("hub_role_permissions").delete().eq("role_id", roleId);
  if (pages.length === 0) return;
  const { error } = await supabase
    .from("hub_role_permissions")
    .insert(pages.map((page) => ({ role_id: roleId, page })));
  if (error) throw error;
}

export type MemberRoleAssignment = {
  id: string;
  user_id: string;
  role_id: string;
  role_name: string;
};

export async function fetchMemberRoleAssignments(hubId: string): Promise<MemberRoleAssignment[]> {
  const { data, error } = await supabase
    .from("hub_member_custom_roles")
    .select("id, user_id, role_id, hub_custom_roles(name)")
    .eq("hub_id", hubId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    role_id: r.role_id,
    role_name: (r.hub_custom_roles as unknown as { name: string })?.name ?? "",
  }));
}

export async function assignRole(hubId: string, userId: string, roleId: string) {
  const { error } = await supabase
    .from("hub_member_custom_roles")
    .insert({ hub_id: hubId, user_id: userId, role_id: roleId });
  if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
}

export async function unassignRole(assignmentId: string) {
  const { error } = await supabase.from("hub_member_custom_roles").delete().eq("id", assignmentId);
  if (error) throw error;
}
