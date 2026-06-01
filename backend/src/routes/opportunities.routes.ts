import { Router } from "express";
import { mockOpportunities } from "../data/mockOpportunities.js";
import {
  opportunitySources,
  opportunityTypes,
  type OpportunitySource,
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

opportunitiesRouter.get("/", (req, res) => {
  const source = firstQueryValue(req.query.source);
  const type = firstQueryValue(req.query.type);
  const query = firstQueryValue(req.query.q)?.trim().toLowerCase();

  let opportunities = mockOpportunities;

  if (source && isOpportunitySource(source)) {
    opportunities = opportunities.filter((opportunity) => opportunity.source === source);
  }

  if (type && isOpportunityType(type)) {
    opportunities = opportunities.filter((opportunity) => opportunity.type === type);
  }

  if (query) {
    opportunities = opportunities.filter((opportunity) => {
      const searchableText = [
        opportunity.title,
        opportunity.organizer,
        opportunity.location,
        opportunity.source,
        opportunity.type,
        ...opportunity.tags
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }

  res.json({
    data: opportunities,
    meta: {
      count: opportunities.length,
      sources: opportunitySources,
      types: opportunityTypes
    }
  });
});

opportunitiesRouter.get("/:id", (req, res) => {
  const opportunity = mockOpportunities.find((item) => item.id === req.params.id);

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
