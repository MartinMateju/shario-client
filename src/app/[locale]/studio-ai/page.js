import StudioAiMarketingPage from "@/components/Marketing/StudioAiMarketingPage";
import { buildMarketingPageMetadata } from "@/components/Marketing/marketingPageMetadata";

export function generateMetadata({ params }) {
  return buildMarketingPageMetadata({
    pageKey: "studioAi",
    params,
    pathname: "/studio-ai",
  });
}

export default function StudioAiPage() {
  return <StudioAiMarketingPage />;
}
