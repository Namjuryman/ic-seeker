import http from 'node:http';
import { createConfig } from './config/env.mjs';
import { initDb, openDb as openDatabase } from './db/connection.mjs';
import * as httpHelpers from './lib/http.mjs';
import { createAuth } from './lib/auth.mjs';
import { createAdminService } from './services/admin.service.mjs';
import { createPaperService } from './services/paper.service.mjs';
import { createProfileService } from './services/profile.service.mjs';
import { createSearchService } from './services/search.service.mjs';
import { createTopicService } from './services/topic.service.mjs';
import { createGeoService } from './services/geo.service.mjs';
import { createSqliteRepository } from './repositories/sqlite.repository.mjs';
import { createAuthRoutes } from './routes/auth.routes.mjs';
import { createApiRoutes } from './routes/api.routes.mjs';
import { createStaticRoutes } from './routes/static.routes.mjs';
import { createRequestHandler } from './routes/index.mjs';

const config = await createConfig(import.meta.url);
initDb(config.dbPath);

function openDb(options = {}) {
  return openDatabase(config.dbPath, options);
}

const auth = createAuth({
  authEnabled: config.authEnabled,
  cookieName: config.cookieName,
  cookieSecret: config.cookieSecret,
  bad: httpHelpers.bad
});
const sqliteRepository = createSqliteRepository({ openDb });

const services = {
  admin: createAdminService({ repository: sqliteRepository, config }),
  paper: createPaperService({ openDb }),
  profile: createProfileService({ openDb }),
  search: createSearchService({ openDb }),
  geo: createGeoService({ openDb }),
  topic: createTopicService({ openDb })
};

const authRoutes = createAuthRoutes({
  auth,
  config,
  http: httpHelpers,
  loginFailures: new Map()
});
const apiRoutes = createApiRoutes({ services, http: httpHelpers });
const staticRoutes = createStaticRoutes({ config, http: httpHelpers });
const handleRequest = createRequestHandler({
  authRoutes,
  apiRoutes,
  staticRoutes,
  auth,
  http: httpHelpers
});

const server = http.createServer(handleRequest);

server.listen(config.port, config.bindHost, () => {
  console.log(`IC Seeker running at http://${config.bindHost}:${config.port}`);
  console.log(`Database: ${config.dbPath}`);
});
