import { getPrisma } from "../lib/prisma.js";
import { syncUnstopOpportunities } from "../sources/unstop/unstop.sync.js";

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
  const result = await syncUnstopOpportunities({
    limit: getNumberArg("limit")
  });

  console.log("Unstop sync completed");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("Unstop sync failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
