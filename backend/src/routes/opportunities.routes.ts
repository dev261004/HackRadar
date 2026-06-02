import { Router } from "express";
import { listOpportunities, getOpportunityById } from "../repositories/opportunities.repository.js";
import {
  opportunityModes,
  opportunitySources,
  opportunityStatuses,
  opportunityTypes,
  type OpportunityMode,
  type OpportunitySource,
  type OpportunityStatus,
  type OpportunityType
} from "../types/opportunity.js";

export const opportunitiesRouter = Router();

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

function isOpportunitySource(value: string): value is OpportunitySource {
  return opportunitySources.includes(value as OpportunitySource);
}

function isOpportunityType(value: string): value is OpportunityType {
  return opportunityTypes.includes(value as OpportunityType);
}

function isOpportunityStatus(value: string): value is OpportunityStatus {
  return opportunityStatuses.includes(value as OpportunityStatus);
}

function isOpportunityMode(value: string): value is OpportunityMode {
  return opportunityModes.includes(value as OpportunityMode);
}

opportunitiesRouter.get("/", async (req, res) => {
  const source = firstQueryValue(req.query.source);
  const type = firstQueryValue(req.query.type);
  const status = firstQueryValue(req.query.status);
  const mode = firstQueryValue(req.query.mode);
  const country = firstQueryValue(req.query.country)?.trim();
  const city = firstQueryValue(req.query.city)?.trim();
  const query = firstQueryValue(req.query.q)?.trim().toLowerCase();

  const result = await listOpportunities({
    q: query,
    source: source && isOpportunitySource(source) ? source : undefined,
    type: type && isOpportunityType(type) ? type : undefined,
    status: status && isOpportunityStatus(status) ? status : undefined,
    mode: mode && isOpportunityMode(mode) ? mode : undefined,
    country: country || undefined,
    city: city || undefined
  });

  res.json({
    data: result.data,
    meta: {
      count: result.data.length,
      dataSource: result.dataSource,
      sources: opportunitySources,
      types: opportunityTypes,
      statuses: opportunityStatuses,
      modes: opportunityModes
    }
  });
});

opportunitiesRouter.get("/:id", async (req, res) => {
  const opportunity = await getOpportunityById(req.params.id);

  if (!opportunity) {
    res.status(404).json({
      error: "Opportunity not found"
    });
    return;
  }

  res.json({
    data: opportunity
  });
});
