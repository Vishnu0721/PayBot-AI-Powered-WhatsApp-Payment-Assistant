const clients = new Map();

export function addSseClient(sellerId, res) {
  const list = clients.get(sellerId) || [];
  list.push(res);
  clients.set(sellerId, list);

  return () => {
    const next = (clients.get(sellerId) || []).filter((item) => item !== res);
    if (next.length) clients.set(sellerId, next);
    else clients.delete(sellerId);
  };
}

export function emitToSeller(sellerId, event, data) {
  const list = clients.get(sellerId) || [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of list) {
    res.write(payload);
  }
}

export function emitPaymentUpdate(payment) {
  if (!payment?.sellerId) return;
  emitToSeller(payment.sellerId, 'payment.updated', payment.toPublic ? payment.toPublic() : payment);
}
