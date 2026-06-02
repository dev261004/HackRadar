import { getPrisma } from "../lib/prisma.js";
import { syncDevfolioOpportunities } from "../sources/devfolio/devfolio.sync.js";

function getNumberArg(name: string) {
  const prefix = `--${name}=`;
  const rawValue = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);

  if (!rawValue) {
    return undefined;
  }

  const value = Number(rawValue);

  return Number.isFinite(value) ? value : undefined;
}

async function main() {
  const result = await syncDevfolioOpportunities({
    limit: getNumberArg("limit")
  });

  console.log("Devfolio sync completed");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("Devfolio sync failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
