import { env } from "@/config/env";
import app from "@/app";
import { startMarketDataRefreshLoop } from "@/services/marketData.service";

app.listen(Number(env.PORT), () => {
  console.log(`Finsight API running on http://localhost:${env.PORT}`);
  // Runs independently of any request — see marketData.service.ts for the
  // isolation guarantees (never throws, never blocks, degrades gracefully
  // with no API key configured).
  startMarketDataRefreshLoop();
});
