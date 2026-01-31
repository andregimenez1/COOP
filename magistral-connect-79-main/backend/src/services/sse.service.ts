import { Response } from 'express';

export interface SSEClient {
  res: Response;
  userId: string;
  role: string;
}

const clients = new Set<SSEClient>();

export function addSSEClient(client: SSEClient): void {
  clients.add(client);
}

export function removeSSEClient(client: SSEClient): void {
  clients.delete(client);
}

function send(res: Response, event: string, data: unknown): void {
  try {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    res.write(`event: ${event}\ndata: ${payload}\n\n`);
  } catch {
    // ignore
  }
}

/** Envia evento apenas para cooperados (e master, se quiser). */
export function broadcastToCooperados(
  event: string,
  data: Record<string, unknown>
): void {
  for (const { res, role } of clients) {
    if (role !== 'cooperado' && role !== 'master') continue;
    send(res, event, data);
  }
}

export function broadcast(event: string, data: Record<string, unknown>): void {
  for (const { res } of clients) {
    send(res, event, data);
  }
}
