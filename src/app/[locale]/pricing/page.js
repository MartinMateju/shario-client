import PricingMarketingPage from "@/components/Marketing/PricingMarketingPage";
import { buildMarketingPageMetadata } from "@/components/Marketing/marketingPageMetadata";

export function generateMetadata({ params }) {
  return buildMarketingPageMetadata({
    pageKey: "pricing",
    params,
    pathname: "/pricing",
  });
}

export default function PricingPage() {
  return <PricingMarketingPage />;
}
