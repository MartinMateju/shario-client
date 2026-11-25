import PlatformLegalPage from "@/components/legal/PlatformLegalPage";
import { buildPlatformLegalMetadata } from "@/components/legal/platformLegalMetadata";

export function generateMetadata({ params }) {
  return buildPlatformLegalMetadata({ documentKey: "privacy", params });
}

export default function PrivacyPage() {
  return <PlatformLegalPage documentKey="privacy" />;
}
