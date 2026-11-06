import { navigateWithAgentChatViewTransition } from "@agent-native/core/client/agent-chat";
import { useT } from "@agent-native/core/client/i18n";
import { focusAgentChat } from "@agent-native/toolkit/app/chat";
import { AgentSidebar } from "@agent-native/toolkit/app/chat";
import { type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";

import { chatThreadPath } from "@/lib/chat-paths";
import { TAB_ID } from "@/lib/tab-id";

interface AgentInspectorProps {
  children: ReactNode;
  chatHomeHandoffActive: boolean;
  chatHomeHandoffPending: boolean;
}

/** Context-aware quick prompts for the agent sidebar. */
function suggestionsForPath(pathname: string): string[] {
  if (pathname.startsWith("/hackathon/")) {
    return [
      "What's left?",
      "Fix my weakest criterion",
      "Draft my submission",
    ];
  }
  if (pathname === "/home") {
    return [
      "Import a hackathon from a URL",
      "Send today's brief",
      "What's left on my nearest deadline?",
    ];
  }
  return [
    "What can you do in Podium?",
    "Show me what's left across my hackathons",
  ];
}

/** Contextual inspector shell used on secondary chat routes. */
export function AgentInspector({
  children,
  chatHomeHandoffActive,
  chatHomeHandoffPending,
}: AgentInspectorProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();

  function openAskAgentFullscreen(threadId?: string) {
    focusAgentChat();
    navigateWithAgentChatViewTransition(navigate, chatThreadPath(threadId));
  }

  return (
    <AgentSidebar
      position="right"
      chatViewTransition
      chatViewTransitionHandoff={chatHomeHandoffPending}
      storageKey="chat"
      browserTabId={TAB_ID}
      openOnChatRunning={chatHomeHandoffActive}
      onFullscreenRequest={openAskAgentFullscreen}
      emptyStateText={t("chat.inspectEmptyState")}
      agentPageHref="/settings/agent"
      suggestions={suggestionsForPath(pathname)}
    >
      {children}
    </AgentSidebar>
  );
}
