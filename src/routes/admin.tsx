import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isCurrentUserAdmin } from "@/lib/admin";

export const Route = createFileRoute("/admin")({
  component: AdminGate,
});

function AdminGate() {
  const navigate = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const isAdmin = await isCurrentUserAdmin();
      if (!isAdmin) {
        navigate({ to: "/home", replace: true });
        return;
      }
      setOk(true);
    })();
  }, [navigate]);
  if (ok === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return <Outlet />;
}
