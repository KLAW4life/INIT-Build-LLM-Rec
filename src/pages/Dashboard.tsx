import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, ArrowRight, KeyRound, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchMyHubs, createHub, joinHubByCode } from '@/lib/hubs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const hubsQuery = useQuery({
    queryKey: ['my-hubs', user?.id],
    queryFn: () => fetchMyHubs(user!.id),
    enabled: !!user,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createHub({ name, description: desc, ownerId: user!.id }),
    onSuccess: (hub) => {
      toast.success('Hub created');
      setCreateOpen(false);
      setName('');
      setDesc('');
      qc.invalidateQueries({ queryKey: ['my-hubs'] });
      navigate(`/hubs/${hub.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const joinMutation = useMutation({
    mutationFn: () => joinHubByCode(joinCode, user!.id),
    onSuccess: (hub) => {
      toast.success(`Joined ${hub.name}`);
      setJoinOpen(false);
      setJoinCode('');
      qc.invalidateQueries({ queryKey: ['my-hubs'] });
      navigate(`/hubs/${hub.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hubs = hubsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-5xl">Your hubs</h1>
          <p className="mt-2 text-muted-foreground">
            Workspaces you own or belong to.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <KeyRound className="h-4 w-4" /> Join with code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Join a hub</DialogTitle>
                <DialogDescription>
                  Enter the code your admin shared with you.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="code">Hub code</Label>
                <Input
                  id="code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-1234"
                  className="font-mono uppercase tracking-wider"
                />
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => joinMutation.mutate()} 
                  disabled={!joinCode || joinMutation.isPending}
                >
                  {joinMutation.isPending ? 'Joining…' : 'Join hub'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New hub
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Create a hub</DialogTitle>
                <DialogDescription>
                  You'll be the admin. A join code is generated automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="hub-name">Hub name</Label>
                  <Input
                    id="hub-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Product Team"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="hub-desc">Description (optional)</Label>
                  <Textarea
                    id="hub-desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="What is this hub for?"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!name.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create hub'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-10">
        {hubsQuery.isLoading ? (
          <div className="text-muted-foreground">Loading hubs…</div>
        ) : hubs.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} onJoin={() => setJoinOpen(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hubs.map(({ hub, role }) => (
              <Link
                key={hub.id}
                to={`/hubs/${hub.id}`}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-serif text-2xl leading-tight">{hub.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      role === 'admin'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {role}
                  </span>
                </div>
                {hub.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {hub.description}
                  </p>
                )}
                <div className="mt-6 flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">
                    {hub.join_code}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Users className="h-6 w-6" />
      </div>
      <h3 className="font-serif text-3xl">No hubs yet</h3>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">
        Create your first hub as an admin, or join an existing one with a code from your team.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" /> Create a hub
        </Button>
        <Button variant="outline" onClick={onJoin}>
          <KeyRound className="h-4 w-4" /> Join with code
        </Button>
      </div>
    </div>
  );
}