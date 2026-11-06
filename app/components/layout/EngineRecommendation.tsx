import { agentEngineStatusUrlForChatApi } from "@agent-native/core/client/agent-chat";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const DISMISSED_KEY = "podium.builder-hint.dismissed";

const ENGINE_LABELS: Record<string, string> = {
  google: "Gemini",
  anthropic: "Claude",
  openai: "ChatGPT",
  ollama: "Ollama",
  openrouter: "OpenRouter",
};

function labelFor(engine: string): string {
  // Provider engines report as "ai-sdk:<provider>"; Builder.io is "builder".
  const id = engine.startsWith("ai-sdk:") ? engine.slice("ai-sdk:".length) : engine;
  return ENGINE_LABELS[id] ?? id;
}

/**
 * Small recommendation at the bottom of the chat for visitors whose agent
 * is not running on Builder.io. Members on the org connection never see it;
 * everyone else gets one line pointing at the Builder.io option, and it
 * stays hidden once they switch or dismiss it.
 */
export function EngineRecommendation() {
  const navigate = useNavigate();
  const [engine, setEngine] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISSED_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      // Storage unavailable: the hint still renders, just not dismissible.
    }
    let cancelled = false;
    fetch(agentEngineStatusUrlForChatApi(), { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.engine === "string") {
          setEngine(data.engine);
        }
      })
      .catch(() => {
        // Status unreadable: stay hidden rather than guess the engine.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed || !engine || engine === "builder") return null;

  return (
    <p
      className="px-3 pb-2 text-center text-xs text-muted-foreground"
      data-testid="engine-recommendation"
    >
      Powered by {labelFor(engine)}. Podium is built for Builder.io,{" "}
      <button
        type="button"
        className="font-medium text-foreground underline underline-offset-2"
        onClick={() => navigate("/settings/model")}
      >
        switch to Builder.io
      </button>{" "}
      for the full experience.
      <button
        type="button"
        aria-label="Dismiss Builder.io recommendation"
        className="ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => {
          try {
            window.localStorage.setItem(DISMISSED_KEY, "1");
          } catch {
            // Ignore storage errors; the state update still hides it.
          }
          setDismissed(true);
        }}
      >
        ×
      </button>
    </p>
  );
}
