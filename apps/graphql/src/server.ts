import { createGraphqlApp } from "./app.js";

const service = await createGraphqlApp();

service.httpServer.listen(service.config.port, () => {
  console.log(
    `graphql service listening on http://localhost:${service.config.port}${service.config.graphqlPath}`
  );
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void service.stop().finally(() => {
      process.exit(0);
    });
  });
}
