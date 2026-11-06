import LandingPage from "@/components/landing/LandingPage";

export function meta() {
  return [
    { title: "Podium — Turn any hackathon page into a live mission board" },
    {
      name: "description",
      content:
        "Paste a hackathon URL and Podium's agent reads the rules, deadlines, requirements and rubric into a board you share. Get coached toward a winning entry, then draft the submission.",
    },
    {
      property: "og:title",
      content: "Podium — Turn any hackathon page into a live mission board",
    },
    {
      property: "og:description",
      content:
        "Paste a hackathon URL and Podium's agent reads the rules, deadlines, requirements and rubric into a board you share.",
    },
    { name: "twitter:card", content: "summary" },
    {
      name: "twitter:title",
      content: "Podium — Turn any hackathon page into a live mission board",
    },
    {
      name: "twitter:description",
      content:
        "Paste a hackathon URL and Podium's agent reads the rules, deadlines, requirements and rubric into a board you share.",
    },
  ];
}

export default function IndexRoute() {
  return <LandingPage />;
}
