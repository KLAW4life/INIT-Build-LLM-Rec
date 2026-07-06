import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import { 
  fetchCustomRoles, createCustomRole, deleteCustomRole, setRolePermissions, 
  fetchMemberRoleAssignments, assignRole, unassignRole, ALL_PAGES, 
  type HubPage 
} from '@/lib/roles';
import { fetchHubMembers } from '@/lib/hubs';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function RolesPage() {
  const { hubId } = useParams<{ hubId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ['custom-roles', hubId],
    queryFn: () => fetchCustomRoles(hubId!),
    enabled: !!hubId,
  });

  const membersQuery = useQuery({
    queryKey: ['hub-members', hubId],
    queryFn: () => fetchHubMembers(hubId!),
    enabled: !!hubId,
  });

  const assignQuery = useQuery({
    queryKey: ['role-assignments', hubId],
    queryFn: () => fetchMemberRoleAssignments(hubId!),
    enabled: !!hubId,
  });

  const isAdmin = membersQuery.data?.find((m) => m.user_id === user?.id)?.role === 'admin';

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const createMut = useMutation({
    mutationFn: () => createCustomRole(hubId!, name),
    onSuccess: () => { 
      setOpen(false); 
      setName(''); 
      toast.success('Role created'); 
      qc.invalidateQueries({ queryKey: ['custom-roles', hubId] }); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCustomRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-roles', hubId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const permMut = useMutation({
    mutationFn: ({ roleId, pages }: { roleId: string; pages: HubPage[] }) => 
      setRolePermissions(roleId, pages),
    onSuccess: () => { 
      toast.success('Permissions saved'); 
      qc.invalidateQueries({ queryKey: ['custom-roles', hubId] }); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignMut = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => 
      assignRole(hubId!, userId, roleId),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['role-assignments', hubId] }); 
      toast.success('Assigned'); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unassignMut = useMutation({
    mutationFn: (id: string) => unassignRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role-assignments', hubId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 text-muted-foreground">
        Only admins can manage roles.
      </div>
    );
  }

  const roles = rolesQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const assignments = assignQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl">Roles & permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define custom roles and choose which pages they can access.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Role name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Reviewer" 
                />
              </div>
              <Button 
                onClick={() => createMut.mutate()} 
                disabled={!name || createMut.isPending} 
                className="w-full"
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <section className="mt-8 space-y-4">
        {roles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No custom roles yet.
          </div>
        ) : (
          roles.map((r) => (
            <RoleCard
              key={r.id}
              role={r}
              onSave={(pages) => permMut.mutate({ roleId: r.id, pages })}
              onDelete={() => {
                if (confirm('Delete role?')) delMut.mutate(r.id);
              }}
            />
          ))
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Assign roles</h2>
        <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {members.map((m) => {
            const memberAssigns = assignments.filter((a) => a.user_id === m.user_id);
            return (
              <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">
                    {m.profile?.display_name ?? m.profile?.email}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {memberAssigns.map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {a.role_name}
                        <button 
                          onClick={() => unassignMut.mutate(a.id)} 
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                {roles.length > 0 && (
                  <Select onValueChange={(roleId) => assignMut.mutate({ userId: m.user_id, roleId })}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="+ Assign role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles
                        .filter((r) => !memberAssigns.some((a) => a.role_id === r.id))
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function RoleCard({ 
  role, 
  onSave, 
  onDelete 
}: { 
  role: { id: string; name: string; permissions: HubPage[] }; 
  onSave: (pages: HubPage[]) => void; 
  onDelete: () => void;
}) {
  const [selected, setSelected] = useState<HubPage[]>(role.permissions);
  const dirty = selected.sort().join(',') !== role.permissions.sort().join(',');

  function toggle(page: HubPage) {
    setSelected((s) => s.includes(page) ? s.filter((p) => p !== page) : [...s, page]);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="font-medium">{role.name}</div>
        </div>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {ALL_PAGES.map((p) => (
          <label key={p} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm capitalize">
            <Checkbox checked={selected.includes(p)} onCheckedChange={() => toggle(p)} />
            {p}
          </label>
        ))}
      </div>
      {dirty && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => onSave(selected)}>Save permissions</Button>
        </div>
      )}
    </div>
  );
}