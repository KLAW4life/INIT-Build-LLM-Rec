import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Shield, User as UserIcon } from 'lucide-react';
import { fetchHub, fetchHubMembers } from '@/lib/hubs';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export default function HubOverview() {
  const { hubId } = useParams<{ hubId: string }>();
  const { user } = useAuth();

  const hubQuery = useQuery({
    queryKey: ['hub', hubId],
    queryFn: () => fetchHub(hubId!),
    enabled: !!hubId,
  });

  const membersQuery = useQuery({
    queryKey: ['hub-members', hubId],
    queryFn: () => fetchHubMembers(hubId!),
    enabled: !!hubId,
  });

  if (hubQuery.isLoading || membersQuery.isLoading) {
    return <div className="mx-auto max-w-6xl px-6 py-10 text-muted-foreground">Loading…</div>;
  }

  if (!hubQuery.data) {
    return <div className="mx-auto max-w-6xl px-6 py-10">Hub not found.</div>;
  }

  const hub = hubQuery.data;
  const members = membersQuery.data ?? [];
  const meRole = members.find((m) => m.user_id === user?.id)?.role;
  const isAdmin = meRole === 'admin';

  function copyCode() {
    navigator.clipboard.writeText(hub.join_code);
    toast.success('Join code copied');
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-5xl">{hub.name}</h1>
            {isAdmin && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                admin
              </span>
            )}
          </div>
          {hub.description && (
            <p className="mt-3 max-w-2xl text-muted-foreground">{hub.description}</p>
          )}
        </div>

        <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Invite code
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-mono text-2xl tracking-wider">{hub.join_code}</span>
            <Button size="sm" variant="outline" onClick={copyCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Share this code so people can join your hub.
          </p>
        </div>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Link
          to={`/hubs/${hubId}/forms`}
          className="rounded-2xl border border-border bg-card p-6 hover:border-primary/50"
        >
          <div className="font-serif text-2xl">Forms</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Build application forms and collect submissions.
          </p>
        </Link>
        <Link
          to={`/hubs/${hubId}/teams`}
          className="rounded-2xl border border-border bg-card p-6 hover:border-primary/50"
        >
          <div className="font-serif text-2xl">Teams</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Create teams and let leads pick their members.
          </p>
        </Link>
        <Link
          to={`/hubs/${hubId}/roles`}
          className="rounded-2xl border border-border bg-card p-6 hover:border-primary/50"
        >
          <div className="font-serif text-2xl">Roles</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Define custom roles and page permissions.
          </p>
        </Link>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Members</h2>
          <span className="text-sm text-muted-foreground">{members.length} total</span>
        </div>
        <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {members.length === 0 ? (
            <div className="p-6 text-muted-foreground">No members yet.</div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    {m.role === 'admin' ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <UserIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {m.profile?.display_name ?? m.profile?.email ?? 'Member'}
                      {m.user_id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.profile?.email}</div>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium ${
                    m.role === 'admin' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {m.role}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}