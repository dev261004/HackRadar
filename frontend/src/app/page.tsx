import { OpportunityExplorer } from "@/components/opportunity-explorer";

export default function Home() {
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

      <OpportunityExplorer />
    </main>
  );
}
