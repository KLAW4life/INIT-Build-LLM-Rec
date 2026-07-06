import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, FileText } from 'lucide-react';
import { fetchForms, createForm, type FormStatus } from '@/lib/forms';
import { fetchHubMembers } from '@/lib/hubs';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const statusBadge: Record<FormStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  open: 'bg-emerald-500/15 text-emerald-700',
  closed: 'bg-muted text-muted-foreground',
};

export default function FormsList() {
  const { hubId } = useParams<{ hubId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const formsQuery = useQuery({
    queryKey: ['forms', hubId],
    queryFn: () => fetchForms(hubId!),
    enabled: !!hubId,
  });

  const membersQuery = useQuery({
    queryKey: ['hub-members', hubId],
    queryFn: () => fetchHubMembers(hubId!),
    enabled: !!hubId,
  });

  const isAdmin = membersQuery.data?.find((m) => m.user_id === user?.id)?.role === 'admin';

  const createMut = useMutation({
    mutationFn: () => createForm({ 
      hubId: hubId!, 
      title, 
      description, 
      createdBy: user!.id 
    }),
    onSuccess: () => {
      toast.success('Form created');
      setOpen(false);
      setTitle('');
      setDescription('');
      qc.invalidateQueries({ queryKey: ['forms', hubId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const forms = formsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl">Forms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Applications, sign-ups, and intake for your hub.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> New form
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create form</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Team application" 
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                  />
                </div>
                <Button 
                  onClick={() => createMut.mutate()} 
                  disabled={!title || createMut.isPending} 
                  className="w-full"
                >
                  Create draft
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-8 grid gap-3">
        {formsQuery.isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : forms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No forms yet.{isAdmin && ' Create the first one to start collecting applications.'}
          </div>
        ) : (
          forms.map((f) => (
            <Link
              key={f.id}
              to={`/hubs/${hubId}/forms/${f.id}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 hover:border-primary/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{f.title}</div>
                  {f.description && <div className="text-sm text-muted-foreground">{f.description}</div>}
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${statusBadge[f.status]}`}>
                {f.status}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}