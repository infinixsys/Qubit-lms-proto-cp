import { createApp } from "./app.mjs";
const app = await createApp({ logger: true });
await app.listen({
  port: Number(process.env.PORT || 4000),
  host: process.env.API_HOST || "127.0.0.1",
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
