import PlatformLegalPage from "@/components/legal/PlatformLegalPage";
import { buildPlatformLegalMetadata } from "@/components/legal/platformLegalMetadata";

export function generateMetadata({ params }) {
  return buildPlatformLegalMetadata({ documentKey: "terms", params });
}

export default function TermsPage() {
  return <PlatformLegalPage documentKey="terms" />;
}
