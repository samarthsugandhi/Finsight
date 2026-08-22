import { askOllama } from "./ollama.service";

async function main() {
  const answer = await askOllama(
    "Explain financial transactions in one short sentence."
  );

  console.log("\nQwen response:\n");
  console.log(answer);
}

main().catch(console.error);