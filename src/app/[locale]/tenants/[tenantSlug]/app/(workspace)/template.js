import TransitionPage from "@/components/transitions/TransitionPage";

export default function WorkspaceTemplate({ children }) {
  return (
    <TransitionPage scope="workspace" animateOnPathnameChange>
      {children}
    </TransitionPage>
  );
}
