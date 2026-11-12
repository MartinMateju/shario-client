import { describe, expect, it } from "vitest";
import {
  WORKSPACE_WORKFLOW_QUESTIONS,
  buildWorkspaceWorkflowIntent,
  getWorkflowQuestionProgress,
  getWorkspaceWorkflowAnswers,
  hasStoredWorkspaceWorkflowAnswers,
} from "@/components/views/settings/workspaceWorkflowQuestions";
const answers = {
  sharedStudio: true,
  classes: false,
  memberships: false,
  vouchers: true,
  inventory: false,
};
describe("shared-space workspace checklist", () => {
  it("builds time-based guidance from generic workflow answers", () => {
    expect(buildWorkspaceWorkflowIntent(answers)).toEqual({
      definitionVersion: 2,
      pricingMode: "time",
      answers,
    });
    expect(WORKSPACE_WORKFLOW_QUESTIONS.map(({ id }) => id)).toEqual(
      Object.keys(answers),
    );
  });
  it("completes without a specialist pricing choice", () => {
    const configuration = { intent: { answers } };
    expect(getWorkspaceWorkflowAnswers(configuration)).toEqual(answers);
    expect(hasStoredWorkspaceWorkflowAnswers(configuration)).toBe(true);
    expect(getWorkflowQuestionProgress(answers, {})).toEqual({
      completed: 5,
      total: 5,
      complete: true,
      next: null,
    });
  });
  it("skips modules outside the tenant entitlement", () => {
    expect(
      getWorkflowQuestionProgress(answers, {
        memberships: { entitled: false },
      }),
    ).toEqual({ completed: 4, total: 4, complete: true, next: null });
  });
  it("hydrates generic configuration without stored answers", () => {
    expect(
      getWorkspaceWorkflowAnswers({
        modules: { bookings: { selected: true }, inventory: { enabled: true } },
      }),
    ).toMatchObject({ sharedStudio: true, inventory: true });
  });
});
