import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, UserMinus, UserPlus } from 'lucide-react';
import { 
  fetchTeam, fetchTeamMembers, addTeamMember, removeTeamMember, 
  updateTeam, deleteTeam 
} from '@/lib/teams';
import { fetchTeamApplications, decideApplication } from '@/lib/forms';
import { fetchHubMembers } from '@/lib/hubs';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export default function TeamDetail() {
  const { hubId, teamId } = useParams<{ hubId: string; teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const teamQuery = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId!),
    enabled: !!teamId,
  });

  const membersQuery = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: () => fetchTeamMembers(teamId!),
    enabled: !!teamId,
  });

  const hubMembersQuery = useQuery({
    queryKey: ['hub-members', hubId],
    queryFn: () => fetchHubMembers(hubId!),
    enabled: !!hubId,
  });

  const appsQuery = useQuery({
    queryKey: ['team-applications', teamId],
    queryFn: () => fetchTeamApplications(teamId!),
    enabled: !!teamId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['team-members', teamId] });
    qc.invalidateQueries({ queryKey: ['team-applications', teamId] });
  };

  const decideMut = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      applicantId 
    }: { 
      id: string; 
      status: 'accepted' | 'rejected'; 
      applicantId: string;
    }) => {
      await decideApplication(id, status);
      if (status === 'accepted') await addTeamMember(teamId!, applicantId);
    },
    onSuccess: () => { 
      toast.success('Updated'); 
      invalidate(); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeTeamMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members', teamId] });
      toast.success('Member removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => deleteTeam(teamId!),
    onSuccess: () => {
      toast.success('Team deleted');
      navigate(`/hubs/${hubId}/teams`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (teamQuery.isLoading) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-muted-foreground">Loading…</div>;
  }

  if (!teamQuery.data) {
    return <div className="mx-auto max-w-4xl px-6 py-10">Team not found.</div>;
  }

  const team = teamQuery.data;
  const isAdmin = hubMembersQuery.data?.find((m) => m.user_id === user?.id)?.role === 'admin';
  const isLead = team.lead_id === user?.id;
  const canManage = isAdmin || isLead;

  const members = membersQuery.data ?? [];
  const apps = appsQuery.data ?? [];
  const pending = apps.filter((a) => a.status === 'submitted');
  const decided = apps.filter((a) => a.status !== 'submitted');

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link 
        to={`/hubs/${hubId}/teams`} 
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All teams
      </Link>
      
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">{team.name}</h1>
          {team.description && (
            <p className="mt-2 text-muted-foreground">{team.description}</p>
          )}
        </div>
        {isAdmin && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (confirm('Delete team?')) delMut.mutate();
            }}
          >
            Delete team
          </Button>
        )}
      </div>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Members ({members.length})</h2>
        <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
          {members.length === 0 ? (
            <div className="p-6 text-muted-foreground">No members yet.</div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">
                    {m.profile?.display_name ?? m.profile?.email ?? 'Member'}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.profile?.email}</div>
                </div>
                {canManage && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => removeMut.mutate(m.id)}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {canManage && (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">Applicants ({pending.length} pending)</h2>
          {pending.length === 0 && decided.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
              No applications yet. Applicants who pick this team will show up here.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {pending.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div>
                    <div className="font-medium">
                      {a.applicant?.display_name ?? a.applicant?.email ?? 'Applicant'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Applied {new Date(a.submitted_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => decideMut.mutate({ 
                        id: a.id, 
                        status: 'accepted', 
                        applicantId: a.applicant_id 
                      })}
                    >
                      <Check className="mr-1 h-4 w-4" /> Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => decideMut.mutate({ 
                        id: a.id, 
                        status: 'rejected', 
                        applicantId: a.applicant_id 
                      })}
                    >
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
              {decided.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-4 opacity-70">
                  <div>
                    <div className="font-medium">
                      {a.applicant?.display_name ?? a.applicant?.email ?? 'Applicant'}
                    </div>
                    <div className="text-xs text-muted-foreground">{a.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <AdminLeadPicker 
          teamId={teamId!} 
          currentLeadId={team.lead_id} 
          hubId={hubId!} 
          onSaved={() => qc.invalidateQueries({ queryKey: ['team', teamId] })} 
        />
      )}
    </div>
  );
}

function AdminLeadPicker({ 
  teamId, 
  currentLeadId, 
  hubId, 
  onSaved 
}: { 
  teamId: string; 
  currentLeadId: string | null; 
  hubId: string; 
  onSaved: () => void;
}) {
  const hubMembersQuery = useQuery({
    queryKey: ['hub-members', hubId],
    queryFn: () => fetchHubMembers(hubId),
  });

  const mut = useMutation({
    mutationFn: (leadId: string | null) => updateTeam(teamId, { lead_id: leadId }),
    onSuccess: () => { 
      toast.success('Lead updated'); 
      onSaved(); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-6">
      <h3 className="font-serif text-xl">Team lead</h3>
      <p className="mt-1 text-sm text-muted-foreground">Choose who leads this team.</p>
      <div className="mt-4 space-y-2">
        {(hubMembersQuery.data ?? []).map((m) => (
          <button
            key={m.user_id}
            onClick={() => mut.mutate(m.user_id)}
            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
              currentLeadId === m.user_id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:bg-accent'
            }`}
          >
            <span>{m.profile?.display_name ?? m.profile?.email}</span>
            {currentLeadId === m.user_id && <UserPlus className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>
    </section>
  );
}