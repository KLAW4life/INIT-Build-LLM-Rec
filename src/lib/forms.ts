import { supabase } from "@/integrations/supabase/client";

export type FieldType = "text" | "textarea" | "number" | "email" | "select" | "checkbox" | "file";
export type FormStatus = "draft" | "open" | "closed";
export type ApplicationStatus = "submitted" | "accepted" | "rejected";

export type FormRow = {
  id: string;
  hub_id: string;
  title: string;
  description: string | null;
  status: FormStatus;
  allow_team_selection: boolean;
  created_by: string;
  created_at: string;
  published_at: string | null;
  closed_at: string | null;
};

export type FormField = {
  id: string;
  form_id: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  options: string[];
  position: number;
};

export async function fetchForms(hubId: string): Promise<FormRow[]> {
  const { data, error } = await supabase
    .from("forms")
    .select("*")
    .eq("hub_id", hubId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FormRow[];
}

export async function fetchForm(formId: string): Promise<FormRow | null> {
  const { data, error } = await supabase.from("forms").select("*").eq("id", formId).maybeSingle();
  if (error) throw error;
  return data as FormRow | null;
}

export async function fetchFormFields(formId: string): Promise<FormField[]> {
  const { data, error } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...(r as Omit<FormField, "options">),
    options: Array.isArray(r.options) ? (r.options as string[]) : [],
  }));
}

export async function createForm(input: { hubId: string; title: string; description?: string; createdBy: string }) {
  const { data, error } = await supabase
    .from("forms")
    .insert({
      hub_id: input.hubId,
      title: input.title,
      description: input.description ?? null,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data as FormRow;
}

export async function updateFormStatus(formId: string, status: FormStatus) {
  const patch: { status: FormStatus; published_at?: string; closed_at?: string } = { status };
  if (status === "open") patch.published_at = new Date().toISOString();
  if (status === "closed") patch.closed_at = new Date().toISOString();
  const { error } = await supabase.from("forms").update(patch).eq("id", formId);
  if (error) throw error;
}

export async function updateForm(formId: string, patch: Partial<Pick<FormRow, "title" | "description" | "allow_team_selection">>) {
  const { error } = await supabase.from("forms").update(patch).eq("id", formId);
  if (error) throw error;
}

export async function deleteForm(formId: string) {
  const { error } = await supabase.from("forms").delete().eq("id", formId);
  if (error) throw error;
}

export async function addField(input: Omit<FormField, "id">) {
  const { data, error } = await supabase
    .from("form_fields")
    .insert({
      form_id: input.form_id,
      label: input.label,
      field_type: input.field_type,
      required: input.required,
      options: input.options,
      position: input.position,
    })
    .select()
    .single();
  if (error) throw error;
  return data as FormField;
}

export async function updateField(fieldId: string, patch: Partial<Omit<FormField, "id" | "form_id">>) {
  const { error } = await supabase.from("form_fields").update(patch).eq("id", fieldId);
  if (error) throw error;
}

export async function deleteField(fieldId: string) {
  const { error } = await supabase.from("form_fields").delete().eq("id", fieldId);
  if (error) throw error;
}

// ============ APPLICATIONS ============
export type Application = {
  id: string;
  form_id: string;
  applicant_id: string;
  team_id: string | null;
  status: ApplicationStatus;
  submitted_at: string;
  applicant?: { display_name: string | null; email: string | null } | null;
  team?: { name: string } | null;
};

export type ApplicationAnswer = {
  id: string;
  application_id: string;
  field_id: string;
  value_text: string | null;
  file_path: string | null;
  file_name: string | null;
};

export async function fetchApplications(formId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from("form_applications")
    .select("id, form_id, applicant_id, team_id, status, submitted_at, profiles!form_applications_applicant_id_fkey(display_name, email), teams(name)")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false });
  if (error) {
    const { data: d2, error: e2 } = await supabase
      .from("form_applications")
      .select("*")
      .eq("form_id", formId);
    if (e2) throw e2;
    return (d2 ?? []) as Application[];
  }
  return (data ?? []).map((r: unknown) => {
    const row = r as { id: string; form_id: string; applicant_id: string; team_id: string | null; status: ApplicationStatus; submitted_at: string; profiles?: { display_name: string | null; email: string | null } | null; teams?: { name: string } | null };
    return { ...row, applicant: row.profiles ?? null, team: row.teams ?? null };
  });
}

export async function fetchTeamApplications(teamId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from("form_applications")
    .select("id, form_id, applicant_id, team_id, status, submitted_at, profiles!form_applications_applicant_id_fkey(display_name, email)")
    .eq("team_id", teamId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: unknown) => {
    const row = r as { id: string; form_id: string; applicant_id: string; team_id: string | null; status: ApplicationStatus; submitted_at: string; profiles?: { display_name: string | null; email: string | null } | null };
    return { ...row, applicant: row.profiles ?? null };
  });
}

export async function fetchMyApplication(formId: string, userId: string): Promise<Application | null> {
  const { data, error } = await supabase
    .from("form_applications")
    .select("*")
    .eq("form_id", formId)
    .eq("applicant_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Application | null;
}

export async function fetchApplicationAnswers(applicationId: string): Promise<ApplicationAnswer[]> {
  const { data, error } = await supabase
    .from("form_answers")
    .select("*")
    .eq("application_id", applicationId);
  if (error) throw error;
  return (data ?? []) as ApplicationAnswer[];
}

export async function submitApplication(input: {
  formId: string;
  applicantId: string;
  hubId: string;
  teamId: string | null;
  answers: { field_id: string; value_text?: string | null; file?: File | null }[];
}) {
  const { data: app, error } = await supabase
    .from("form_applications")
    .insert({
      form_id: input.formId,
      applicant_id: input.applicantId,
      team_id: input.teamId,
    })
    .select()
    .single();
  if (error) throw error;

  const answerRows: {
    application_id: string;
    field_id: string;
    value_text: string | null;
    file_path: string | null;
    file_name: string | null;
  }[] = [];

  for (const a of input.answers) {
    let file_path: string | null = null;
    let file_name: string | null = null;
    if (a.file) {
      const path = `${input.hubId}/${input.formId}/${app.id}/${a.field_id}-${a.file.name}`;
      const { error: uploadErr } = await supabase.storage.from("form-uploads").upload(path, a.file, { upsert: true });
      if (uploadErr) throw uploadErr;
      file_path = path;
      file_name = a.file.name;
    }
    answerRows.push({
      application_id: app.id,
      field_id: a.field_id,
      value_text: a.value_text ?? null,
      file_path,
      file_name,
    });
  }

  if (answerRows.length > 0) {
    const { error: ansErr } = await supabase.from("form_answers").insert(answerRows);
    if (ansErr) throw ansErr;
  }
  return app as Application;
}

export async function decideApplication(applicationId: string, status: ApplicationStatus) {
  const { error } = await supabase
    .from("form_applications")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (error) throw error;
}

export async function getFileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("form-uploads").createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
