import AiFeatureBoundary from "@/components/auth/AiFeatureBoundary";
import PermissionBoundary from "@/components/auth/PermissionBoundary";
import StudioAssistantPage from "@/components/ai/StudioAssistantPage";
import { PERMISSIONS } from "@/config/permissions";

export default function AiPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.AI_USE}>
      {/* Keep action history and pending confirmations reachable when the
          monthly generation allowance is exhausted. The page gates the
          conversational composer separately. */}
      <AiFeatureBoundary feature="settings">
        <StudioAssistantPage showPageHeader={false} />
      </AiFeatureBoundary>
    </PermissionBoundary>
  );
}
