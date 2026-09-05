import { addSseClient } from '../services/sse.js';
import { asyncHandler } from '../utils/http.js';

export const streamEvents = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: ready\ndata: ${JSON.stringify({ sellerId: req.sellerId })}\n\n`);

  const remove = addSseClient(req.sellerId, res);
  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: {}\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    remove();
  });
});
