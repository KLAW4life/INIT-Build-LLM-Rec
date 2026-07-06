import { Outlet, Link, useParams } from 'react-router-dom';

export default function HubShell() {
  const { hubId } = useParams<{ hubId: string }>();
  const linkClass =
    "rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground [&.active]:bg-primary [&.active]:text-primary-foreground";

  return (
    <div>
      <nav className="border-b border-border/60 bg-card/30">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 py-3">
          <Link to={`/hubs/${hubId}`} className={linkClass}>
            Overview
          </Link>
          <Link to={`/hubs/${hubId}/forms`} className={linkClass}>
            Forms
          </Link>
          <Link to={`/hubs/${hubId}/teams`} className={linkClass}>
            Teams
          </Link>
          <Link to={`/hubs/${hubId}/roles`} className={linkClass}>
            Roles
          </Link>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}