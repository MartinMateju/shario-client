import WaitlistOfferPage from "@/components/waitlists/WaitlistOfferPage";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function PublicWaitlistOfferRoute() {
  return <WaitlistOfferPage />;
}
