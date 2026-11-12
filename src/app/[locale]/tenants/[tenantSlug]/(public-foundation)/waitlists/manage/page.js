import PublicWaitlistManagementPage from "@/components/waitlists/PublicWaitlistManagementPage";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function PublicWaitlistManagementRoute() {
  return <PublicWaitlistManagementPage />;
}
