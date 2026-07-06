import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Users } from 'lucide-react';
import { fetchTeams, createTeam } from '@/lib/teams';
import { fetchHubMembers } from '@/lib/hubs';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function TeamsList() {
  const { hubId } = useParams<{ hubId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState<string>('');

  const teamsQuery = useQuery({
    queryKey: ['teams', hubId],
    queryFn: () => fetchTeams(hubId!),
    enabled: !!hubId,
  });

  const membersQuery = useQuery({
    queryKey: ['hub-members', hubId],
    queryFn: () => fetchHubMembers(hubId!),
    enabled: !!hubId,
  });

  const isAdmin = membersQuery.data?.find((m) => m.user_id === user?.id)?.role === 'admin';

  const createMut = useMutation({
    mutationFn: () => createTeam({ 
      hubId: hubId!, 
      name, 
      description, 
      leadId: leadId || null 
    }),
    onSuccess: () => {
      toast.success('Team created');
      setOpen(false);
      setName('');
      setDescription('');
      setLeadId('');
      qc.invalidateQueries({ queryKey: ['teams', hubId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const teams = teamsQuery.data ?? [];
  const members = membersQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Applicants pick a team; team leads pick their members.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> New team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                  <Label>Team lead</Label>
                  <Select value={leadId} onValueChange={setLeadId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional…" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.profile?.display_name ?? m.profile?.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        )}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {teamsQuery.isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : teams.length === 0 ? (
          <div className="sm:col-span-2 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No teams yet.
          </div>
        ) : (
          teams.map((t) => (
            <Link
              key={t.id}
              to={`/hubs/${hubId}/teams/${t.id}`}
              className="rounded-2xl border border-border bg-card p-5 hover:border-primary/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Lead: {t.lead_profile?.display_name ?? t.lead_profile?.email ?? (t.lead_id ? 'assigned' : 'none')}
                  </div>
                </div>
              </div>
              {t.description && (
                <p className="mt-3 text-sm text-muted-foreground">{t.description}</p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}