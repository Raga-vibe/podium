import { Link } from "react-router";

/**
 * Custom 404 page. React Router renders this catch-all route for any
 * unknown path, instead of the framework's generic error screen.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-5xl font-normal text-muted-foreground">
        404
      </p>
      <h1 className="font-display mt-4 text-2xl font-normal tracking-tight">
        This page is not on the board
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The link you followed does not lead anywhere in Podium. It may have
        been moved, or the address may have a typo.
      </p>
      <div className="mt-6 flex gap-2">
        <Link
          to="/"
          className="h-10 rounded-full bg-[#ff4800] px-5 font-semibold text-white hover:bg-[#ff5e23] inline-flex items-center"
        >
          Go to Podium
        </Link>
        <Link
          to="/home"
          className="h-10 rounded-full border border-border px-5 font-medium hover:bg-white/5 inline-flex items-center"
        >
          My boards
        </Link>
      </div>
    </div>
  );
}
