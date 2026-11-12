import PermissionBoundary from "@/components/auth/PermissionBoundary";
import InvoicingSettingsPage from "@/components/views/invoices/InvoicingSettingsPage";
import { PERMISSIONS } from "@/config/permissions";
import { notFound } from "next/navigation";
import { NATIVE_INVOICES_ENABLED } from "@/config/features";

export default function WorkspaceInvoicingSettingsPage() {
  if (!NATIVE_INVOICES_ENABLED) notFound();

  return (
    <PermissionBoundary permission={PERMISSIONS.WORKSPACE_UPDATE}>
      <InvoicingSettingsPage showPageHeader={false} />
    </PermissionBoundary>
  );
}
