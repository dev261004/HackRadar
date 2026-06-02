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
  const [country, setCountry] = useState("all");
  const [city, setCity] = useState("all");

  const countries = useMemo(() => {
    return Array.from(
      new Set(opportunities.map((opportunity) => opportunity.country).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b));
  }, [opportunities]);

  const cities = useMemo(() => {
    return Array.from(
      new Set(
        opportunities
          .filter((opportunity) => country === "all" || opportunity.country === country)
          .map((opportunity) => opportunity.city)
          .filter(Boolean) as string[]
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [opportunities, country]);

  const filteredOpportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      const matchesSource = source === "all" || opportunity.source === source;
      const matchesType = type === "all" || opportunity.type === type;
      const matchesCountry = country === "all" || opportunity.country === country;
      const matchesCity = city === "all" || opportunity.city === city;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          opportunity.title,
          opportunity.organizer,
          opportunity.location,
          opportunity.country,
          opportunity.city,
          opportunity.source,
          opportunity.type,
          ...opportunity.tags
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesSource && matchesType && matchesCountry && matchesCity && matchesQuery;
    });
  }, [opportunities, query, source, type, country, city]);

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

        <div className="selectFilters">
          <label>
            <span>Country</span>
            <select
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                setCity("all");
              }}
            >
              <option value="all">All countries</option>
              {countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>City</span>
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="all">All cities</option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
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
