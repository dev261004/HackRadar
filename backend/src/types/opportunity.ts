export const opportunitySources = ["devfolio", "hackerearth", "unstop"] as const;

export type OpportunitySource = (typeof opportunitySources)[number];

export const opportunityTypes = [
  "hackathon",
  "coding-contest",
  "ai-competition",
  "hiring-challenge",
  "other"
] as const;

export type OpportunityType = (typeof opportunityTypes)[number];

export const opportunityStatuses = ["open", "upcoming", "closed"] as const;

export type OpportunityStatus = (typeof opportunityStatuses)[number];

export interface Opportunity {
  id: string;
  title: string;
  source: OpportunitySource;
  type: OpportunityType;
  organizer: string;
  location: string;
  isOnline: boolean;
  registrationDeadline: string | null;
  startsAt: string | null;
  endsAt: string | null;
  url: string;
  tags: string[];
  status: OpportunityStatus;
  createdAt: string;
  updatedAt: string;
}
