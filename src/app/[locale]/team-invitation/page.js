import { Suspense } from "react";
import TeamInvitationPage from "@/components/auth/TeamInvitationPage";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function InvitationPage() {
  return (
    <Suspense>
      <TeamInvitationPage />
    </Suspense>
  );
}
