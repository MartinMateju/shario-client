import StudiosMarketingPage from "@/components/Marketing/StudiosMarketingPage";
import { buildMarketingPageMetadata } from "@/components/Marketing/marketingPageMetadata";

export function generateMetadata({ params }) {
  return buildMarketingPageMetadata({
    pageKey: "forStudios",
    params,
    pathname: "/for-studios",
  });
}

export default function ForStudiosPage() {
  return <StudiosMarketingPage />;
}
