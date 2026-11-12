export const WORKSPACE_PRICING_MODES = ["time"];

export const WORKSPACE_WORKFLOW_QUESTIONS = [
  {
    id: "sharedStudio",
    answerModule: "bookings",
    requiredModules: ["bookings"],
  },
  { id: "classes", answerModule: "courses", requiredModules: ["courses"] },
  {
    id: "memberships",
    answerModule: "memberships",
    requiredModules: ["memberships"],
  },
  { id: "vouchers", answerModule: "vouchers", requiredModules: ["vouchers"] },
  {
    id: "inventory",
    answerModule: "inventory",
    requiredModules: ["inventory"],
  },
];

export const isWorkflowAnswerComplete = (question, answer) =>
  question.options
    ? question.options.includes(answer)
    : typeof answer === "boolean";

export const isWorkflowQuestionAvailable = (question, modules = {}) =>
  question.requiredModules.every(
    (moduleName) => modules[moduleName]?.entitled !== false,
  );

export const getWorkspaceWorkflowAnswers = (configuration = {}) => {
  const storedAnswers = configuration?.intent?.answers ?? {};
  const modules = configuration?.modules ?? {};
  const effectiveModules = configuration?.effectiveModules ?? {};
  return Object.fromEntries(
    WORKSPACE_WORKFLOW_QUESTIONS.flatMap((question) => {
      if (question.id === "pricingMode") {
        const mode = configuration?.intent?.pricingMode;
        // Shared spaces charge for booked time.
        return WORKSPACE_PRICING_MODES.includes(mode)
          ? [[question.id, mode]]
          : [];
      }
      if (typeof storedAnswers[question.id] === "boolean")
        return [[question.id, storedAnswers[question.id]]];
      const state = modules[question.answerModule];
      return [
        [
          question.id,
          Boolean(
            state?.selected ??
            state?.enabled ??
            effectiveModules[question.answerModule],
          ),
        ],
      ];
    }),
  );
};

export const hasStoredWorkspaceWorkflowAnswers = (configuration = {}) =>
  WORKSPACE_WORKFLOW_QUESTIONS.every((question) =>
    isWorkflowAnswerComplete(
      question,
      question.id === "pricingMode"
        ? configuration?.intent?.pricingMode
        : configuration?.intent?.answers?.[question.id],
    ),
  );

export const buildWorkspaceWorkflowIntent = (answers) => ({
  definitionVersion: 2,
  answers: {
    ...Object.fromEntries(
      WORKSPACE_WORKFLOW_QUESTIONS.filter(({ options }) => !options).map(
        ({ id }) => [id, answers[id] === true],
      ),
    ),
  },
  pricingMode: "time",
});

export const getWorkflowQuestionProgress = (answers, modules) => {
  const availableQuestions = WORKSPACE_WORKFLOW_QUESTIONS.filter((question) =>
    isWorkflowQuestionAvailable(question, modules),
  );
  const completed = availableQuestions.filter((question) =>
    isWorkflowAnswerComplete(question, answers?.[question.id]),
  ).length;
  return {
    completed,
    total: availableQuestions.length,
    complete: completed === availableQuestions.length,
    next:
      availableQuestions.find(
        (question) =>
          !isWorkflowAnswerComplete(question, answers?.[question.id]),
      ) ?? null,
  };
};
