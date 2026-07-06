import { Link } from "react-router-dom";
import { ArrowRight, Users, FileText, Sparkles, LayoutGrid } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="font-serif text-xl">BuildHub</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/auth"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              state={{ mode: "signup" }}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3" /> New — invite by hub code
          </span>
          <h1 className="mt-6 font-serif text-6xl leading-[1.05] tracking-tight md:text-7xl">
            One hub for your team's
            <br />
            <em className="text-primary">applications & matching.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Create a workspace, invite people with a code, publish application forms,
            and let team leads pick their members — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              state={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Create your hub <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              state={{ mode: "demo" }}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              Try the demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: LayoutGrid,
              title: "Hub workspaces",
              body: "Admins spin up a hub. Everyone else joins with a short code — no email chains.",
            },
            {
              icon: FileText,
              title: "Forms & applications",
              body: "Build application forms, open and close them, and collect uploads from applicants.",
            },
            {
              icon: Users,
              title: "Teams & matching",
              body: "Applicants pick the team they want. Team leads review and select their members.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-2xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          Built with Hubwise · project management for small, sharp teams
        </div>
      </footer>
    </div>
  );
}