import {
  OpportunityMode as PrismaOpportunityMode,
  OpportunitySourceKey as PrismaOpportunitySourceKey,
  OpportunityStatus as PrismaOpportunityStatus,
  OpportunityType as PrismaOpportunityType,
  Prisma
} from "@prisma/client";
import { mockOpportunities } from "../data/mockOpportunities.js";
import { getPrisma, isDatabaseConfigured } from "../lib/prisma.js";
import { mapOpportunityRecord } from "../mappers/opportunity.mapper.js";
import type {
  Opportunity,
  OpportunityMode,
  OpportunitySource,
  OpportunityStatus,
  OpportunityType
} from "../types/opportunity.js";

export interface OpportunityFilters {
  q?: string;
  source?: OpportunitySource;
  type?: OpportunityType;
  status?: OpportunityStatus;
  mode?: OpportunityMode;
  country?: string;
  city?: string;
}

interface OpportunityListResult {
  data: Opportunity[];
  dataSource: "database" | "mock";
}

const sourceMap: Record<OpportunitySource, PrismaOpportunitySourceKey> = {
  devfolio: PrismaOpportunitySourceKey.DEVFOLIO,
  hackerearth: PrismaOpportunitySourceKey.HACKEREARTH,
  unstop: PrismaOpportunitySourceKey.UNSTOP
};

const typeMap: Record<OpportunityType, PrismaOpportunityType> = {
  hackathon: PrismaOpportunityType.HACKATHON,
  "coding-contest": PrismaOpportunityType.CODING_CONTEST,
  "ai-competition": PrismaOpportunityType.AI_COMPETITION,
  "hiring-challenge": PrismaOpportunityType.HIRING_CHALLENGE,
  other: PrismaOpportunityType.OTHER
};

const statusMap: Record<OpportunityStatus, PrismaOpportunityStatus> = {
  upcoming: PrismaOpportunityStatus.UPCOMING,
  open: PrismaOpportunityStatus.OPEN,
  ongoing: PrismaOpportunityStatus.ONGOING,
  closed: PrismaOpportunityStatus.CLOSED
};

const modeMap: Record<OpportunityMode, PrismaOpportunityMode> = {
  online: PrismaOpportunityMode.ONLINE,
  offline: PrismaOpportunityMode.OFFLINE,
  hybrid: PrismaOpportunityMode.HYBRID,
  unknown: PrismaOpportunityMode.UNKNOWN
};

function getPublicVisibilityWhere(now: Date): Prisma.OpportunityWhereInput {
  return {
    OR: [
      {
        status: {
          not: PrismaOpportunityStatus.CLOSED
        }
      },
      {
        status: PrismaOpportunityStatus.CLOSED,
        visibleUntil: {
          gte: now
        }
      }
    ]
  };
}

function buildWhere(filters: OpportunityFilters): Prisma.OpportunityWhereInput {
  const and: Prisma.OpportunityWhereInput[] = [getPublicVisibilityWhere(new Date())];

  if (filters.source) {
    and.push({ sourceKey: sourceMap[filters.source] });
  }

  if (filters.type) {
    and.push({ type: typeMap[filters.type] });
  }

  if (filters.status) {
    and.push({ status: statusMap[filters.status] });
  }

  if (filters.mode) {
    and.push({ mode: modeMap[filters.mode] });
  }

  if (filters.country) {
    and.push({ country: { equals: filters.country, mode: "insensitive" } });
  }

  if (filters.city) {
    and.push({ city: { equals: filters.city, mode: "insensitive" } });
  }

  if (filters.q) {
    const query = filters.q;

    and.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { organizerName: { contains: query, mode: "insensitive" } },
        { locationText: { contains: query, mode: "insensitive" } },
        { country: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { tags: { has: query.toLowerCase() } },
        { skills: { has: query.toLowerCase() } }
      ]
    });
  }

  return { AND: and };
}

function matchesText(opportunity: Opportunity, query: string) {
  const searchableText = [
    opportunity.title,
    opportunity.summary,
    opportunity.description,
    opportunity.organizerName,
    opportunity.locationText,
    opportunity.country,
    opportunity.city,
    opportunity.source,
    opportunity.type,
    opportunity.mode,
    ...opportunity.tags,
    ...opportunity.skills
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

function filterMockOpportunities(filters: OpportunityFilters) {
  return mockOpportunities.filter((opportunity) => {
    const matchesSource = !filters.source || opportunity.source === filters.source;
    const matchesType = !filters.type || opportunity.type === filters.type;
    const matchesStatus = !filters.status || opportunity.status === filters.status;
    const matchesMode = !filters.mode || opportunity.mode === filters.mode;
    const matchesCountry =
      !filters.country || opportunity.country?.toLowerCase() === filters.country.toLowerCase();
    const matchesCity = !filters.city || opportunity.city?.toLowerCase() === filters.city.toLowerCase();
    const matchesQuery = !filters.q || matchesText(opportunity, filters.q);

    return (
      matchesSource &&
      matchesType &&
      matchesStatus &&
      matchesMode &&
      matchesCountry &&
      matchesCity &&
      matchesQuery
    );
  });
}

export async function listOpportunities(filters: OpportunityFilters): Promise<OpportunityListResult> {
  if (!isDatabaseConfigured()) {
    return {
      data: filterMockOpportunities(filters),
      dataSource: "mock"
    };
  }

  try {
    const opportunities = await getPrisma().opportunity.findMany({
      where: buildWhere(filters),
      orderBy: [
        {
          registrationDeadline: "asc"
        },
        {
          startsAt: "asc"
        },
        {
          createdAt: "desc"
        }
      ],
      take: 100
    });

    return {
      data: opportunities.map(mapOpportunityRecord),
      dataSource: "database"
    };
  } catch (error) {
    console.warn("Falling back to mock opportunities because the database query failed.", error);

    return {
      data: filterMockOpportunities(filters),
      dataSource: "mock"
    };
  }
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  if (!isDatabaseConfigured()) {
    return mockOpportunities.find((opportunity) => opportunity.id === id) ?? null;
  }

  try {
    const opportunity = await getPrisma().opportunity.findFirst({
      where: {
        id,
        ...getPublicVisibilityWhere(new Date())
      }
    });

    return opportunity ? mapOpportunityRecord(opportunity) : null;
  } catch (error) {
    console.warn("Falling back to mock opportunity lookup because the database query failed.", error);
    return mockOpportunities.find((opportunity) => opportunity.id === id) ?? null;
  }
}
