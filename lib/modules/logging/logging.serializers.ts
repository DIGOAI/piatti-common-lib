import { StdSerializedResults } from 'pino-http';

export const httpReqSerializer = (req: StdSerializedResults['req']) => ({
  id: req.id,
  method: req.method,
  url: req.url,
  query: req.query,
  params: req.params,
  headers: {
    host: req.headers['host'],
    accept: req.headers['accept'],
    'accept-language': req.headers['accept-language'],
    'user-agent': req.headers['user-agent'],
    'x-request-id': req.headers['x-request-id'],
    connection: req.headers['connection'],
  },
  remoteAddress: req.remoteAddress,
  remotePort: req.remotePort,
});

export const httpResSerializer = (res: StdSerializedResults['res']) => ({
  ...res,
});
