"use client";

import { useMemo, useState } from "react";
import {
  opportunitySources,
  opportunityTypes,
  type Opportunity,
  type OpportunitySource,
  type OpportunityType
} from "@/lib/opportunity";

type SourceFilter = "all" | OpportunitySource;
type TypeFilter = "all" | OpportunityType;

interface OpportunityExplorerProps {
  opportunities: Opportunity[];
}

const sourceLabels: Record<SourceFilter, string> = {
  all: "All sources",
  devfolio: "Devfolio",
  hackerearth: "HackerEarth",
  unstop: "Unstop"
};

const typeLabels: Record<TypeFilter, string> = {
  all: "All types",
  hackathon: "Hackathons",
  "coding-contest": "Coding contests",
  "ai-competition": "AI competitions",
  "hiring-challenge": "Hiring challenges",
  other: "Other"
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not listed";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function normalizeLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function OpportunityExplorer({ opportunities }: OpportunityExplorerProps) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");

  const filteredOpportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      const matchesSource = source === "all" || opportunity.source === source;
      const matchesType = type === "all" || opportunity.type === type;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          opportunity.title,
          opportunity.organizer,
          opportunity.location,
          opportunity.source,
          opportunity.type,
          ...opportunity.tags
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesSource && matchesType && matchesQuery;
    });
  }, [opportunities, query, source, type]);

  return (
    <section className="explorer" aria-label="Opportunity discovery">
      <div className="toolbar">
        <div className="searchField">
          <label htmlFor="opportunity-search">Search</label>
          <input
            id="opportunity-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, platform, tag, or location"
          />
        </div>

        <div className="filterGroup" aria-label="Source filter">
          {(["all", ...opportunitySources] as SourceFilter[]).map((item) => (
            <button
              className={source === item ? "active" : ""}
              key={item}
              type="button"
              onClick={() => setSource(item)}
            >
              {sourceLabels[item]}
            </button>
          ))}
        </div>

        <div className="filterGroup" aria-label="Type filter">
          {(["all", ...opportunityTypes] as TypeFilter[]).map((item) => (
            <button
              className={type === item ? "active" : ""}
              key={item}
              type="button"
              onClick={() => setType(item)}
            >
              {typeLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="resultMeta">
        <strong>{filteredOpportunities.length}</strong>
        <span>opportunities</span>
      </div>

      <div className="opportunityGrid">
        {filteredOpportunities.map((opportunity) => (
          <article className="opportunityCard" key={opportunity.id}>
            <div className="cardTopline">
              <span>{sourceLabels[opportunity.source]}</span>
              <span className={`status ${opportunity.status}`}>{normalizeLabel(opportunity.status)}</span>
            </div>
            <h2>{opportunity.title}</h2>
            <div className="cardFacts">
              <span>{normalizeLabel(opportunity.type)}</span>
              <span>{opportunity.isOnline ? "Online" : opportunity.location}</span>
            </div>
            <dl>
              <div>
                <dt>Organizer</dt>
                <dd>{opportunity.organizer}</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{formatDate(opportunity.registrationDeadline)}</dd>
              </div>
              <div>
                <dt>Starts</dt>
                <dd>{formatDate(opportunity.startsAt)}</dd>
              </div>
            </dl>
            <div className="tagList">
              {opportunity.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <a href={opportunity.url} rel="noreferrer" target="_blank">
              View opportunity
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
