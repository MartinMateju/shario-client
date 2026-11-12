import CustomerInvoicesPage from "@/components/views/invoices/CustomerInvoicesPage";
import { notFound } from "next/navigation";
import { NATIVE_INVOICES_ENABLED } from "@/config/features";

export default function PortalInvoicesPage() {
  if (!NATIVE_INVOICES_ENABLED) notFound();

  return <CustomerInvoicesPage />;
}
