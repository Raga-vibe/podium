import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAgent } from "@/lib/podium";

/** The OpenServ SERV Hackathon 02 page, pre-filled in the import box. */
const OPENSERV_HACKATHON_URL = "https://www.openserv.ai/hackathon-2";

/**
 * Paste a hackathon URL. The UI never fetches or interprets the page itself:
 * it asks the agent to run rules-extraction, which calls fetch-hackathon-page
 * and save-hackathon. The board fills in live when the agent saves it.
 *
 * The input starts filled with the OpenServ Hackathon 02 page, so a judge
 * only has to press Import hackathon. Hermes lives on the board itself as
 * a starter board, not as a button here.
 */
export function ImportBar() {
  const [url, setUrl] = useState(OPENSERV_HACKATHON_URL);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          disabled={sent}
          className="h-11 bg-amber-400 px-5 font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
        >
          {sent ? "Import sent…" : "Import hackathon"}
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
          saves the rules, no refresh needed.{" "}
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-2"
            onClick={() => setSent(false)}
          >
            Try again
          </button>{" "}
          if nothing shows up.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          or paste{" "}
          <span className="font-medium text-foreground">builder.io/hackathon</span>{" "}
          or any Devpost hackathon page.
        </p>
      )}
    </div>
  );
}
