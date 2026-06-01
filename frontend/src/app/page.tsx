import { OpportunityExplorer } from "@/components/opportunity-explorer";
import { getOpportunities } from "@/lib/api";

export default async function Home() {
  const opportunities = await getOpportunities();

  return (
    <main>
      <header className="appHeader">
        <div>
          <p>HackRadar</p>
          <h1>Developer opportunities, gathered into one radar.</h1>
        </div>
        <div className="sourceStrip" aria-label="Supported MVP sources">
          <span>Devfolio</span>
          <span>HackerEarth</span>
          <span>Unstop</span>
        </div>
      </header>

      <OpportunityExplorer opportunities={opportunities} />
    </main>
  );
}
