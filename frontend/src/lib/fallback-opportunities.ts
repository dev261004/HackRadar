import type { Opportunity } from "./opportunity";

export const fallbackOpportunities: Opportunity[] = [
  {
    id: "devfolio-ethindia-placeholder",
    title: "ETHIndia-style Web3 Hackathon",
    source: "devfolio",
    type: "hackathon",
    organizer: "Devfolio",
    location: "India",
    isOnline: false,
    registrationDeadline: "2026-08-10T18:29:59.000Z",
    startsAt: "2026-09-01T04:30:00.000Z",
    endsAt: "2026-09-03T12:30:00.000Z",
    url: "https://devfolio.co/hackathons",
    tags: ["web3", "hackathon", "builders"],
    status: "open",
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  },
  {
    id: "hackerearth-ai-placeholder",
    title: "AI Engineering Challenge",
    source: "hackerearth",
    type: "ai-competition",
    organizer: "HackerEarth",
    location: "Online",
    isOnline: true,
    registrationDeadline: "2026-07-15T18:29:59.000Z",
    startsAt: "2026-07-20T03:30:00.000Z",
    endsAt: "2026-07-30T18:29:59.000Z",
    url: "https://www.hackerearth.com/challenges/",
    tags: ["ai", "machine-learning", "competition"],
    status: "open",
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  },
  {
    id: "unstop-hiring-placeholder",
    title: "Developer Hiring Challenge",
    source: "unstop",
    type: "hiring-challenge",
    organizer: "Unstop",
    location: "Global",
    isOnline: true,
    registrationDeadline: "2026-06-25T18:29:59.000Z",
    startsAt: "2026-06-28T04:30:00.000Z",
    endsAt: "2026-06-29T18:29:59.000Z",
    url: "https://unstop.com/hackathons",
    tags: ["hiring", "coding", "jobs"],
    status: "upcoming",
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  }
];
