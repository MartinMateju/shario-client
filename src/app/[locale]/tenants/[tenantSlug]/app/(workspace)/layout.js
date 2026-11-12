import TenantDashboardShell from "@/components/dashboard/TenantDashboardShell";
import AiWorkspaceProvider from "@/components/ai/AiWorkspaceProvider";

export default function WorkspaceLayout({ children }) {
  return (
    <AiWorkspaceProvider>
      <TenantDashboardShell>{children}</TenantDashboardShell>
    </AiWorkspaceProvider>
  );
}
