import ProductMarketingPage from "@/components/Marketing/ProductMarketingPage";
import { buildMarketingPageMetadata } from "@/components/Marketing/marketingPageMetadata";

export function generateMetadata({ params }) {
  return buildMarketingPageMetadata({
    pageKey: "product",
    params,
    pathname: "/product",
  });
}

export default function ProductPage() {
  return <ProductMarketingPage />;
}
