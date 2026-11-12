import PermissionBoundary from "@/components/auth/PermissionBoundary";
import InvoicesView from "@/components/invoices/InvoicesView";
import { PERMISSIONS } from "@/config/permissions";
import { notFound } from "next/navigation";
import { NATIVE_INVOICES_ENABLED } from "@/config/features";

export default function FinanceInvoicesPage() {
  if (!NATIVE_INVOICES_ENABLED) notFound();

  return (
    <PermissionBoundary permission={PERMISSIONS.INVOICES_VIEW}>
      <InvoicesView showPageHeader={false} />
    </PermissionBoundary>
  );
}
