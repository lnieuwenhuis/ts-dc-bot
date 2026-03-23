import { IncomingMessage, ServerResponse, createServer } from 'http';
import { parse as parseUrl } from 'url';
import { decodeToken } from './auth.js';

type Params = Record<string, string>;
type Query = Record<string, string>;

export interface Context {
  req: IncomingMessage;
  res: ServerResponse;
  params: Params;
  query: Query;
  body: unknown;
}

type Handler = (ctx: Context) => Promise<void> | void;

interface Route {
  method: string;
  pattern: string; // e.g. '/api/guilds/:id'
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  get(pattern: string, handler: Handler) { this.routes.push({ method: 'GET', pattern, handler }); }
  post(pattern: string, handler: Handler) { this.routes.push({ method: 'POST', pattern, handler }); }
  patch(pattern: string, handler: Handler) { this.routes.push({ method: 'PATCH', pattern, handler }); }

  private match(pattern: string, pathname: string): Params | null {
    const patternParts = pattern.split('/');
    const pathParts = pathname.split('/');
    if (patternParts.length !== pathParts.length) return null;
    const params: Params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }

  private setCors(res: ServerResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  json(res: ServerResponse, status: number, data: unknown) {
    this.setCors(res);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private async readBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve({}); }
      });
    });
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      this.setCors(res);
      res.writeHead(204);
      res.end();
      return;
    }

    const parsed = parseUrl(req.url ?? '/', true);
    const pathname = parsed.pathname ?? '/';
    const query: Query = Object.fromEntries(
      Object.entries(parsed.query).map(([k, v]) => [k, String(v ?? '')])
    );

    // Health check
    if (pathname === '/health' || pathname === '/') {
      this.setCors(res);
      res.writeHead(200);
      res.end('OK');
      return;
    }

    // JWT auth for /api/* routes
    if (pathname.startsWith('/api/')) {
      const authHeader = req.headers['authorization'] ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        this.json(res, 401, { error: 'Missing authorization token' });
        return;
      }
      const secret = process.env.JWT_SECRET ?? 'default_secret';
      try {
        decodeToken(token, secret);
      } catch {
        this.json(res, 401, { error: 'Invalid or expired token' });
        return;
      }
    }

    const method = req.method ?? 'GET';
    const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await this.readBody(req) : {};

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = this.match(route.pattern, pathname);
      if (params !== null) {
        try {
          await route.handler({ req, res, params, query, body });
        } catch (err) {
          console.error('Route error:', err);
          this.json(res, 500, { error: 'Internal server error' });
        }
        return;
      }
    }

    this.json(res, 404, { error: 'Not found' });
  }

  listen(port: number | string) {
    const server = createServer((req, res) => this.handle(req, res));
    server.listen(port, () => console.log(`API server listening on port ${port}`));
    return server;
  }
}

export const router = new Router();
