import { Link } from "react-router";

/**
 * Terms of Service. A plain, public page: what Podium is, what you may
 * do with it, and the limits of the service.
 */
export default function Terms() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link
        to="/"
        className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        ← Back to Podium
      </Link>
      <h1 className="font-display mt-6 text-3xl font-normal tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: November 18, 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold">What Podium is</h2>
          <p className="mt-2 text-muted-foreground">
            Podium turns a hackathon page into a live mission board and
            coaches you toward a winning entry. It reads the rules you give
            it, tracks requirements and deadlines, scores your project against
            the rubric, and drafts your submission. The agent&apos;s scores and
            suggestions are guidance, not a guarantee of any result.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Your content</h2>
          <p className="mt-2 text-muted-foreground">
            You own what you put into Podium: your boards, requirements,
            scores, drafts and project details. You are responsible for what
            you import and for the accuracy of what you submit to a hackathon.
            Do not import pages or content you do not have the right to use.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Acceptable use</h2>
          <p className="mt-2 text-muted-foreground">
            Use Podium for hackathons and the work around them. Do not use it
            to break the law, to harass anyone, to scrape or abuse other
            services, or to try to access another user&apos;s boards. We may
            suspend accounts that do.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">The demo account</h2>
          <p className="mt-2 text-muted-foreground">
            The demo (guest@podium.app) is shared and reset on every visit.
            Anything on a demo board can be seen by the next visitor and will
            be wiped, so do not put private or sensitive information there.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Availability</h2>
          <p className="mt-2 text-muted-foreground">
            Podium is provided as is, without warranty. The service may be
            unavailable during maintenance or if the hosting provider has an
            outage. We are not liable for missed deadlines, lost entries or
            any loss from using the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Changes</h2>
          <p className="mt-2 text-muted-foreground">
            These terms may change. The date at the top shows the latest
            version. Continued use after a change means you accept the new
            terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions about these terms: salaudeenadebayo90@gmail.com.
          </p>
        </section>
      </div>
    </div>
  );
}
