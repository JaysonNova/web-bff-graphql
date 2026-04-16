import { createServer, type Server as HttpServer } from "node:http";

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import {
  ApolloServerPluginInlineTraceDisabled,
  ApolloServerPluginLandingPageDisabled
} from "@apollo/server/plugin/disabled";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { expressMiddleware } from "@as-integrations/express5";
import express, { type Express } from "express";

import { mergeGraphqlConfig, type GraphqlConfig } from "./config.js";
import { createGraphqlContext, type GraphqlContext } from "./context.js";
import { formatGraphqlError } from "./errors.js";
import { createBffTracePlugin } from "./plugins/bff-trace.js";
import { buildGraphqlSchema } from "./schema.js";

type CreateGraphqlAppInput = {
  config?: Partial<GraphqlConfig>;
  fetchImpl?: typeof fetch;
};

export type GraphqlApp = {
  app: Express;
  config: GraphqlConfig;
  httpServer: HttpServer;
  executeOperation(request: {
    query: string;
    variables?: Record<string, unknown>;
    operationName?: string;
  }, headers?: Record<string, string>): Promise<Awaited<ReturnType<ApolloServer<GraphqlContext>["executeOperation"]>>>;
  healthcheck(): {
    ok: true;
    service: "graphql";
  };
  readiness(): {
    ok: true;
    service: "graphql";
    ready: true;
  };
  stop(): Promise<void>;
};

function createHealthPayload() {
  return {
    ok: true as const,
    service: "graphql" as const
  };
}

function createReadinessPayload() {
  return {
    ...createHealthPayload(),
    ready: true as const
  };
}

export async function createGraphqlApp(input: CreateGraphqlAppInput = {}): Promise<GraphqlApp> {
  const config = mergeGraphqlConfig(input.config);
  const app = express();
  const httpServer = createServer(app);
  const apollo = new ApolloServer<GraphqlContext>({
    schema: buildGraphqlSchema(),
    introspection: config.enableIntrospection,
    formatError: formatGraphqlError,
    plugins: [
      ApolloServerPluginDrainHttpServer({
        httpServer
      }),
      createBffTracePlugin(),
      ApolloServerPluginInlineTraceDisabled(),
      config.enableSandbox ? ApolloServerPluginLandingPageLocalDefault() : ApolloServerPluginLandingPageDisabled()
    ]
  });

  await apollo.start();

  app.disable("x-powered-by");
  app.get("/health", (_request, response) => {
    response.json(createHealthPayload());
  });
  app.get("/ready", (_request, response) => {
    response.json(createReadinessPayload());
  });
  app.use(config.graphqlPath, express.json(), expressMiddleware(apollo, {
    context: async ({ req }) =>
      createGraphqlContext({
        config,
        fetchImpl: input.fetchImpl ?? fetch,
        request: req
      })
  }));

  return {
    app,
    config,
    httpServer,
    async executeOperation(request, headers = {}) {
      const normalizedHeaders = Object.fromEntries(
        Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
      );

      return apollo.executeOperation(
        {
          query: request.query,
          variables: request.variables,
          operationName: request.operationName
        },
        {
          contextValue: await createGraphqlContext({
            config,
            fetchImpl: input.fetchImpl ?? fetch,
            request: {
              body: {
                operationName: request.operationName
              },
              header(name) {
                return normalizedHeaders[name.toLowerCase()];
              }
            }
          })
        }
      );
    },
    healthcheck() {
      return createHealthPayload();
    },
    readiness() {
      return createReadinessPayload();
    },
    async stop() {
      await apollo.stop();

      if (!httpServer.listening) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}
