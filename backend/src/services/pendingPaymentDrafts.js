/** In-memory drafts waiting for a customer phone (WhatsApp / simulator). */

const drafts = new Map();
const TTL_MS = 15 * 60 * 1000;

export function setPendingDraft(sellerId, draft) {
  drafts.set(sellerId, { ...draft, at: Date.now() });
}

export function getPendingDraft(sellerId) {
  const draft = drafts.get(sellerId);
  if (!draft) return null;
  if (Date.now() - draft.at > TTL_MS) {
    drafts.delete(sellerId);
    return null;
  }
  return draft;
}

export function clearPendingDraft(sellerId) {
  drafts.delete(sellerId);
}
