import { Link } from "react-router";

/**
 * Privacy Policy. A plain, public page: what Podium collects, why, and
 * how to ask for deletion. No tracking, no ads, no third-party analytics.
 */
export default function Privacy() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link
        to="/"
        className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        ← Back to Podium
      </Link>
      <h1 className="font-display mt-6 text-3xl font-normal tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: November 18, 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold">What we collect</h2>
          <p className="mt-2 text-muted-foreground">
            Podium collects only what it needs to run your mission boards:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Your email address and a password, to create and secure your
              account.
            </li>
            <li>
              The hackathon boards you create or import: hackathon names,
              URLs, requirements, milestones, rubric scores, project details,
              submission drafts and daily briefs.
            </li>
            <li>
              A session cookie that keeps you signed in. It is required for
              the app to work and is not used for tracking.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">What we do not collect</h2>
          <p className="mt-2 text-muted-foreground">
            Podium has no advertising, no third-party analytics and no
            cross-site tracking. We do not sell your data, and we do not share
            it with anyone except the hosting provider that runs the app and
            its database (Render), which stores it only to operate the
            service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">How your data is used</h2>
          <p className="mt-2 text-muted-foreground">
            Your boards are private to your account. The agent coach reads
            your board only to answer you and to score, draft and plan with
            you. Nothing you write is used to train a model. The demo account
            (guest@podium.app) is shared: anything put on a demo board is
            visible to the next demo visitor, and demo boards are reset on
            each visit, so do not put private information there.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Deletion</h2>
          <p className="mt-2 text-muted-foreground">
            You can delete any board from the board page, which removes its
            requirements, scores, drafts and briefs. To delete your whole
            account, email salaudeenadebayo90@gmail.com from the email on the
            account and ask for deletion.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions about this policy: salaudeenadebayo90@gmail.com.
          </p>
        </section>
      </div>
    </div>
  );
}
