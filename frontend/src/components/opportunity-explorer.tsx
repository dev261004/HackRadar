"use client";

import { useEffect, useMemo, useState } from "react";
import { getOpportunitiesFeed, type OpportunitiesDataSource } from "@/lib/api";
import {
  opportunitySources,
  opportunityTypes,
  type Opportunity,
  type OpportunitySource,
  type OpportunityType
} from "@/lib/opportunity";

type SourceFilter = "all" | OpportunitySource;
type TypeFilter = "all" | OpportunityType;
type QuickView = "all" | "recent" | "closing";
type SortMode = "deadline-asc" | "deadline-desc" | "recent" | "updated";

const recentWindowMs = 14 * 24 * 60 * 60 * 1000;
const closingWindowMs = 14 * 24 * 60 * 60 * 1000;

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

const quickViewLabels: Record<QuickView, string> = {
  all: "All",
  recent: "Recently added",
  closing: "Closing soon"
};

const dataSourceLabels: Record<OpportunitiesDataSource, string> = {
  database: "Database data",
  mock: "Mock data",
  fallback: "Local fallback"
};

function formatDate(value: string | null | undefined) {
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

function timeValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function recentAddedTime(opportunity: Opportunity) {
  return timeValue(opportunity.createdAt) ?? timeValue(opportunity.firstSeenAt) ?? timeValue(opportunity.updatedAt);
}

function isRecentlyAdded(opportunity: Opportunity, now: number) {
  const addedAt = recentAddedTime(opportunity);
  return addedAt !== null && addedAt <= now && now - addedAt <= recentWindowMs;
}

function isClosingSoon(opportunity: Opportunity, now: number) {
  const deadline = timeValue(opportunity.registrationDeadline);
  return deadline !== null && deadline >= now && deadline - now <= closingWindowMs;
}

function matchesSearch(opportunity: Opportunity, query: string) {
  if (query.length === 0) {
    return true;
  }

  return [
    opportunity.title,
    opportunity.summary,
    opportunity.description,
    opportunity.organizer,
    opportunity.organizerName,
    opportunity.location,
    opportunity.locationText,
    opportunity.country,
    opportunity.city,
    opportunity.source,
    opportunity.type,
    ...opportunity.tags,
    ...(opportunity.skills ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function sortOpportunities(opportunities: Opportunity[], sortMode: SortMode) {
  return [...opportunities].sort((left, right) => {
    if (sortMode === "recent") {
      return (recentAddedTime(right) ?? 0) - (recentAddedTime(left) ?? 0);
    }

    if (sortMode === "updated") {
      return (timeValue(right.updatedAt) ?? 0) - (timeValue(left.updatedAt) ?? 0);
    }

    const leftDeadline = timeValue(left.registrationDeadline);
    const rightDeadline = timeValue(right.registrationDeadline);
    const missingDeadline = sortMode === "deadline-asc" ? Number.POSITIVE_INFINITY : 0;

    return sortMode === "deadline-asc"
      ? (leftDeadline ?? missingDeadline) - (rightDeadline ?? missingDeadline)
      : (rightDeadline ?? missingDeadline) - (leftDeadline ?? missingDeadline);
  });
}

export function OpportunityExplorer() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [dataSource, setDataSource] = useState<OpportunitiesDataSource>("fallback");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [country, setCountry] = useState("all");
  const [city, setCity] = useState("all");
  const [quickView, setQuickView] = useState<QuickView>("all");
  const [sortMode, setSortMode] = useState<SortMode>("deadline-asc");

  useEffect(() => {
    let isMounted = true;

    async function loadOpportunities() {
      setIsLoading(true);
      const feed = await getOpportunitiesFeed();

      if (!isMounted) {
        return;
      }

      setOpportunities(feed.data);
      setDataSource(feed.meta.dataSource);
      setLoadError(feed.meta.error ?? null);
      setIsLoading(false);
    }

    void loadOpportunities();

    return () => {
      isMounted = false;
    };
  }, []);

  const now = useMemo(() => Date.now(), [opportunities]);

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

  const viewFilteredOpportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      const matchesType = type === "all" || opportunity.type === type;
      const matchesCountry = country === "all" || opportunity.country === country;
      const matchesCity = city === "all" || opportunity.city === city;
      const matchesQuickView =
        quickView === "all" ||
        (quickView === "recent" && isRecentlyAdded(opportunity, now)) ||
        (quickView === "closing" && isClosingSoon(opportunity, now));

      return (
        matchesType &&
        matchesCountry &&
        matchesCity &&
        matchesQuickView &&
        matchesSearch(opportunity, normalizedQuery)
      );
    });
  }, [opportunities, query, type, country, city, quickView, now]);

  const sourceCounts = useMemo(() => {
    const counts: Record<SourceFilter, number> = {
      all: viewFilteredOpportunities.length,
      devfolio: 0,
      hackerearth: 0,
      unstop: 0
    };

    for (const opportunity of viewFilteredOpportunities) {
      counts[opportunity.source] += 1;
    }

    return counts;
  }, [viewFilteredOpportunities]);

  const filteredOpportunities = useMemo(() => {
    const filtered =
      source === "all"
        ? viewFilteredOpportunities
        : viewFilteredOpportunities.filter((opportunity) => opportunity.source === source);

    return sortOpportunities(filtered, sortMode);
  }, [viewFilteredOpportunities, source, sortMode]);

  const hasNoLoadedData = !isLoading && opportunities.length === 0;
  const hasNoMatches = !isLoading && opportunities.length > 0 && filteredOpportunities.length === 0;

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

        <div className="filterGroup viewFilter" aria-label="View filter">
          {(Object.keys(quickViewLabels) as QuickView[]).map((item) => (
            <button
              className={quickView === item ? "active" : ""}
              key={item}
              type="button"
              onClick={() => {
                setQuickView(item);

                if (item === "recent") {
                  setSortMode("recent");
                }

                if (item === "closing") {
                  setSortMode("deadline-asc");
                }
              }}
            >
              {quickViewLabels[item]}
            </button>
          ))}
        </div>

        <div className="filterGroup sourceFilter" aria-label="Source filter">
          {(["all", ...opportunitySources] as SourceFilter[]).map((item) => (
            <button
              className={source === item ? "active" : ""}
              key={item}
              type="button"
              onClick={() => setSource(item)}
            >
              <span>{sourceLabels[item]}</span>
              <strong>{sourceCounts[item]}</strong>
            </button>
          ))}
        </div>

        <div className="filterGroup typeFilter" aria-label="Type filter">
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

        <div className="selectFilters utilityFilters">
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

          <label>
            <span>Sort</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="deadline-asc">Deadline first</option>
              <option value="deadline-desc">Deadline latest</option>
              <option value="recent">Recently added</option>
              <option value="updated">Recently updated</option>
            </select>
          </label>
        </div>
      </div>

      <div className="resultBar">
        <div className="resultMeta">
          <strong>{isLoading ? "..." : filteredOpportunities.length}</strong>
          <span>opportunities</span>
        </div>
        <span className={`dataBadge ${dataSource}`}>{isLoading ? "Loading data" : dataSourceLabels[dataSource]}</span>
      </div>

      {loadError ? <p className="fallbackNotice">Backend data was not available. Showing fallback records.</p> : null}

      {isLoading ? (
        <div className="loadingGrid" aria-label="Loading opportunities">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="skeletonCard" key={index}>
              <span />
              <strong />
              <p />
              <p />
              <em />
            </div>
          ))}
        </div>
      ) : null}

      {hasNoLoadedData ? (
        <div className="emptyState">
          <h2>No opportunities loaded yet</h2>
          <p>Run a source sync or check the backend connection, then refresh this page.</p>
        </div>
      ) : null}

      {hasNoMatches ? (
        <div className="emptyState">
          <h2>No matches found</h2>
          <p>Try a different source, type, location, or search term.</p>
        </div>
      ) : null}

      {!isLoading && filteredOpportunities.length > 0 ? (
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
                <div>
                  <dt>Added</dt>
                  <dd>{formatDate(opportunity.createdAt)}</dd>
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
      ) : null}
    </section>
  );
}
