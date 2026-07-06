import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, GripVertical, Download, Check, X } from 'lucide-react';
import {
  fetchForm, fetchFormFields, updateFormStatus, updateForm, deleteForm,
  addField, deleteField,
  fetchApplications, fetchMyApplication, fetchApplicationAnswers, submitApplication, decideApplication, getFileUrl,
  type FieldType, type FormField, type FormStatus, type Application,
} from '@/lib/forms';
import { fetchHubMembers } from '@/lib/hubs';
import { fetchTeams } from '@/lib/teams';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File upload' },
];

export default function FormDetail() {
  const { hubId, formId } = useParams<{ hubId: string; formId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const formQuery = useQuery({
    queryKey: ['form', formId],
    queryFn: () => fetchForm(formId!),
    enabled: !!formId,
  });

  const fieldsQuery = useQuery({
    queryKey: ['form-fields', formId],
    queryFn: () => fetchFormFields(formId!),
    enabled: !!formId,
  });

  const membersQuery = useQuery({
    queryKey: ['hub-members', hubId],
    queryFn: () => fetchHubMembers(hubId!),
    enabled: !!hubId,
  });

  const teamsQuery = useQuery({
    queryKey: ['teams', hubId],
    queryFn: () => fetchTeams(hubId!),
    enabled: !!hubId,
  });

  const isAdmin = membersQuery.data?.find((m) => m.user_id === user?.id)?.role === 'admin';

  if (formQuery.isLoading) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-muted-foreground">Loading…</div>;
  }

  if (!formQuery.data) {
    return <div className="mx-auto max-w-4xl px-6 py-10">Form not found.</div>;
  }

  const form = formQuery.data;
  const fields = fieldsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link 
        to={`/hubs/${hubId}/forms`} 
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All forms
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">{form.title}</h1>
          {form.description && <p className="mt-2 text-muted-foreground">{form.description}</p>}
        </div>
        <StatusControl 
          isAdmin={isAdmin} 
          formId={formId!} 
          status={form.status} 
          onDone={() => qc.invalidateQueries({ queryKey: ['form', formId] })} 
        />
      </div>

      {isAdmin ? (
        <Tabs defaultValue="build" className="mt-8">
          <TabsList>
            <TabsTrigger value="build">Build</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="build" className="mt-6">
            <FieldsEditor formId={formId!} fields={fields} />
          </TabsContent>
          <TabsContent value="applications" className="mt-6">
            <ApplicationsList formId={formId!} fields={fields} />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <FormSettings 
              form={form} 
              onSaved={() => qc.invalidateQueries({ queryKey: ['form', formId] })} 
            />
          </TabsContent>
        </Tabs>
      ) : (
        <ApplicantView 
          form={form} 
          fields={fields} 
          teams={teams} 
          hubId={hubId!} 
          userId={user!.id} 
        />
      )}
    </div>
  );
}

function StatusControl({ isAdmin, formId, status, onDone }: { 
  isAdmin: boolean; 
  formId: string; 
  status: FormStatus; 
  onDone: () => void;
}) {
  const mut = useMutation({
    mutationFn: (s: FormStatus) => updateFormStatus(formId, s),
    onSuccess: () => { 
      toast.success('Status updated'); 
      onDone(); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const colors: Record<FormStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    open: 'bg-emerald-500/15 text-emerald-700',
    closed: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="flex items-center gap-3">
      <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${colors[status]}`}>
        {status}
      </span>
      {isAdmin && (
        <div className="flex gap-2">
          {status !== 'open' && (
            <Button size="sm" onClick={() => mut.mutate('open')}>Publish</Button>
          )}
          {status === 'open' && (
            <Button size="sm" variant="outline" onClick={() => mut.mutate('closed')}>Close</Button>
          )}
          {status === 'closed' && (
            <Button size="sm" variant="outline" onClick={() => mut.mutate('draft')}>Reopen as draft</Button>
          )}
        </div>
      )}
    </div>
  );
}

function FieldsEditor({ formId, fields }: { formId: string; fields: FormField[] }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState('');

  const addMut = useMutation({
    mutationFn: () => addField({
      form_id: formId, 
      label, 
      field_type: type, 
      required,
      options: type === 'select' ? options.split(',').map((s) => s.trim()).filter(Boolean) : [],
      position: fields.length,
    }),
    onSuccess: () => {
      setLabel('');
      setOptions('');
      setRequired(false);
      qc.invalidateQueries({ queryKey: ['form-fields', formId] });
      toast.success('Field added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteField(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-fields', formId] }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-serif text-xl">Add field</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === 'select' && (
            <div className="sm:col-span-2">
              <Label>Options (comma-separated)</Label>
              <Input 
                value={options} 
                onChange={(e) => setOptions(e.target.value)} 
                placeholder="Small, Medium, Large" 
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox checked={required} onCheckedChange={(v) => setRequired(!!v)} id="req" />
            <Label htmlFor="req">Required</Label>
          </div>
        </div>
        <Button 
          onClick={() => addMut.mutate()} 
          disabled={!label || addMut.isPending} 
          className="mt-4"
        >
          <Plus className="mr-1 h-4 w-4" /> Add field
        </Button>
      </div>

      <div>
        <h3 className="font-serif text-xl mb-3">Fields ({fields.length})</h3>
        {fields.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            No fields yet.
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {f.label}
                      {f.required && <span className="ml-1 text-destructive">*</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {f.field_type}
                      {f.options.length > 0 && ` · ${f.options.join(', ')}`}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteMut.mutate(f.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FormSettings({ form, onSaved }: { 
  form: { id: string; title: string; description: string | null; allow_team_selection: boolean }; 
  onSaved: () => void;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description ?? '');
  const [allowTeam, setAllowTeam] = useState(form.allow_team_selection);

  const saveMut = useMutation({
    mutationFn: () => updateForm(form.id, { title, description, allow_team_selection: allowTeam }),
    onSuccess: () => { 
      toast.success('Saved'); 
      onSaved(); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => deleteForm(form.id),
    onSuccess: () => { 
      toast.success('Deleted'); 
      navigate(-1);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={allowTeam} onCheckedChange={setAllowTeam} id="teamsel" />
        <Label htmlFor="teamsel">Ask applicants to pick a team</Label>
      </div>
      <div className="flex justify-between pt-4">
        <Button 
          variant="destructive" 
          onClick={() => {
            if (confirm('Delete this form?')) delMut.mutate();
          }}
        >
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Save</Button>
      </div>
    </div>
  );
}

function ApplicationsList({ formId, fields }: { formId: string; fields: FormField[] }) {
  const qc = useQueryClient();
  const appsQuery = useQuery({
    queryKey: ['applications', formId],
    queryFn: () => fetchApplications(formId),
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const decideMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) => 
      decideApplication(id, status),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['applications', formId] }); 
      toast.success('Updated'); 
    },
  });

  if (appsQuery.isLoading) return <div className="text-muted-foreground">Loading…</div>;
  const apps = appsQuery.data ?? [];

  if (apps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
        No applications yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {apps.map((a) => (
        <ApplicationRow
          key={a.id}
          app={a}
          fields={fields}
          expanded={expanded === a.id}
          onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
          onDecide={(s) => decideMut.mutate({ id: a.id, status: s })}
        />
      ))}
    </div>
  );
}

function ApplicationRow({ app, fields, expanded, onToggle, onDecide }: {
  app: Application;
  fields: FormField[];
  expanded: boolean;
  onToggle: () => void;
  onDecide: (s: 'accepted' | 'rejected') => void;
}) {
  const answersQuery = useQuery({
    queryKey: ['answers', app.id],
    queryFn: () => fetchApplicationAnswers(app.id),
    enabled: expanded,
  });

  const statusColor = {
    submitted: 'bg-muted text-muted-foreground',
    accepted: 'bg-emerald-500/15 text-emerald-700',
    rejected: 'bg-destructive/15 text-destructive',
  }[app.status];

  return (
    <div className="rounded-xl border border-border bg-card">
      <button onClick={onToggle} className="flex w-full items-center justify-between p-4 text-left">
        <div>
          <div className="font-medium">
            {app.applicant?.display_name ?? app.applicant?.email ?? 'Applicant'}
          </div>
          <div className="text-xs text-muted-foreground">
            {app.team?.name && `Team: ${app.team.name} · `}
            {new Date(app.submitted_at).toLocaleString()}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${statusColor}`}>
          {app.status}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {answersQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading answers…</div>
          ) : (
            (answersQuery.data ?? []).map((ans) => {
              const field = fields.find((f) => f.id === ans.field_id);
              return (
                <div key={ans.id}>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {field?.label ?? 'Field'}
                  </div>
                  {ans.file_path ? (
                    <FileLink path={ans.file_path} name={ans.file_name ?? 'file'} />
                  ) : (
                    <div className="text-sm">
                      {ans.value_text || <span className="text-muted-foreground italic">empty</span>}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {app.status === 'submitted' && (
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => onDecide('accepted')}>
                <Check className="mr-1 h-4 w-4" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDecide('rejected')}>
                <X className="mr-1 h-4 w-4" /> Reject
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileLink({ path, name }: { path: string; name: string }) {
  async function open() {
    try {
      const url = await getFileUrl(path);
      window.open(url, '_blank');
    } catch (e) { 
      toast.error((e as Error).message); 
    }
  }

  return (
    <button onClick={open} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
      <Download className="h-3 w-3" /> {name}
    </button>
  );
}

function ApplicantView({ form, fields, teams, hubId, userId }: {
  form: { id: string; title: string; status: FormStatus; allow_team_selection: boolean };
  fields: FormField[];
  teams: { id: string; name: string }[];
  hubId: string;
  userId: string;
}) {
  const qc = useQueryClient();
  const myAppQuery = useQuery({
    queryKey: ['my-app', form.id, userId],
    queryFn: () => fetchMyApplication(form.id, userId),
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [teamId, setTeamId] = useState<string>('');

  const submitMut = useMutation({
    mutationFn: () => submitApplication({
      formId: form.id,
      applicantId: userId,
      hubId,
      teamId: teamId || null,
      answers: fields.map((f) => ({
        field_id: f.id,
        value_text: f.field_type === 'file' ? null : (values[f.id] ?? ''),
        file: f.field_type === 'file' ? files[f.id] ?? null : null,
      })),
    }),
    onSuccess: () => { 
      toast.success('Application submitted'); 
      qc.invalidateQueries({ queryKey: ['my-app', form.id, userId] }); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (myAppQuery.isLoading) {
    return <div className="mt-6 text-muted-foreground">Loading…</div>;
  }

  if (myAppQuery.data) {
    const app = myAppQuery.data;
    const colors = {
      submitted: 'bg-muted text-muted-foreground',
      accepted: 'bg-emerald-500/15 text-emerald-700',
      rejected: 'bg-destructive/15 text-destructive',
    }[app.status];

    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
        <div className="font-serif text-2xl">You've applied</div>
        <p className="mt-2 text-muted-foreground">
          Submitted {new Date(app.submitted_at).toLocaleString()}
        </p>
        <div className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-medium uppercase ${colors}`}>
          {app.status}
        </div>
      </div>
    );
  }

  if (form.status !== 'open') {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
        This form isn't accepting applications right now.
      </div>
    );
  }

  return (
    <form 
      className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6" 
      onSubmit={(e) => { 
        e.preventDefault(); 
        submitMut.mutate(); 
      }}
    >
      {form.allow_team_selection && teams.length > 0 && (
        <div>
          <Label>
            Pick a team <span className="text-destructive">*</span>
          </Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a team…" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {fields.map((f) => (
        <div key={f.id}>
          <Label>
            {f.label}
            {f.required && <span className="text-destructive">*</span>}
          </Label>
          {f.field_type === 'textarea' ? (
            <Textarea 
              required={f.required} 
              value={values[f.id] ?? ''} 
              onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} 
            />
          ) : f.field_type === 'select' ? (
            <Select 
              value={values[f.id] ?? ''} 
              onValueChange={(v) => setValues({ ...values, [f.id]: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : f.field_type === 'checkbox' ? (
            <div className="mt-2 flex items-center gap-2">
              <Checkbox 
                checked={values[f.id] === 'true'} 
                onCheckedChange={(v) => setValues({ ...values, [f.id]: v ? 'true' : 'false' })} 
                id={f.id} 
              />
              <Label htmlFor={f.id} className="font-normal">Yes</Label>
            </div>
          ) : f.field_type === 'file' ? (
            <Input 
              type="file" 
              required={f.required} 
              onChange={(e) => setFiles({ ...files, [f.id]: e.target.files?.[0] ?? null })} 
            />
          ) : (
            <Input
              type={f.field_type === 'number' ? 'number' : f.field_type === 'email' ? 'email' : 'text'}
              required={f.required}
              value={values[f.id] ?? ''}
              onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
            />
          )}
        </div>
      ))}
      <Button type="submit" disabled={submitMut.isPending} className="w-full">
        Submit application
      </Button>
    </form>
  );
}