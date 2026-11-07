import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAgent } from "@/lib/podium";

/** The OpenServ SERV Hackathon 02 page, offered as a one-click try-it import. */
const OPENSERV_HACKATHON_URL = "https://www.openserv.ai/hackathon-2";

/** The Nous Research Hermes Agent Plugin Hackathon announcement on X. */
const HERMES_HACKATHON_URL =
  "https://x.com/nousresearch/status/2118094256438936062";

/**
 * Paste a hackathon URL. The UI never fetches or interprets the page itself:
 * it asks the agent to run rules-extraction, which calls fetch-hackathon-page
 * and save-hackathon. The board fills in live when the agent saves it.
 */
export function ImportBar() {
  const [url, setUrl] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function tryOpenserv() {
    setError(null);
    askAgent(
      `Import this hackathon page into Podium using the rules-extraction skill: ${OPENSERV_HACKATHON_URL}. Extract the rules, deadlines, requirements, rubric and prizes, then save the hackathon.`,
      { url: OPENSERV_HACKATHON_URL, skill: "rules-extraction" },
    );
    setSent(true);
  }

  function tryHermes() {
    setError(null);
    askAgent(
      `Import this hackathon announcement into Podium using the rules-extraction skill: ${HERMES_HACKATHON_URL}. Extract the rules, deadlines, requirements, rubric and prizes, then save the hackathon.`,
      { url: HERMES_HACKATHON_URL, skill: "rules-extraction" },
    );
    setSent(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    let parsed: URL;
    try {
      parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    } catch {
      setError("That does not look like a URL. Paste the full hackathon page link.");
      return;
    }
    setError(null);
    askAgent(
      `Import this hackathon page into Podium using the rules-extraction skill: ${parsed.toString()}. Extract the rules, deadlines, requirements, rubric and prizes, then save the hackathon.`,
      { url: parsed.toString(), skill: "rules-extraction" },
    );
    setSent(true);
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 sm:flex-row"
        aria-label="Import a hackathon"
      >
        <Input
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="Paste a hackathon URL, e.g. builder.io/hackathon"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setSent(false);
          }}
          aria-label="Hackathon page URL"
          className="h-11 flex-1 bg-card"
        />
        <Button
          type="submit"
          className="h-11 bg-amber-400 px-5 font-semibold text-zinc-950 hover:bg-amber-300"
        >
          Import hackathon
        </Button>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {sent && !error ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Agent is reading the page now. The board appears here as soon as it
          saves the rules, no refresh needed.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Try it:</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={tryOpenserv}
          >
            OpenServ Hackathon 02
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={tryHermes}
          >
            Hermes Plugin Hackathon
          </Button>
          <span>
            or paste{" "}
            <span className="font-medium text-foreground">builder.io/hackathon</span>{" "}
            or any Devpost hackathon page.
          </span>
        </div>
      )}
    </div>
  );
}
