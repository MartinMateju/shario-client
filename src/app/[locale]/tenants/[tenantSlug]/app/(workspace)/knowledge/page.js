import PermissionBoundary from "@/components/auth/PermissionBoundary";
import KnowledgeManagementPage from "@/components/knowledge/KnowledgeManagementPage";
import { PERMISSIONS } from "@/config/permissions";

export default function KnowledgePage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.KNOWLEDGE_VIEW}>
      <KnowledgeManagementPage showPageHeader={false} />
    </PermissionBoundary>
  );
}
