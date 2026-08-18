// Used by usePushNotifications (vendor push — buyers have no push
// notifications of their own) — converts a VAPID public key for
// PushManager.subscribe's applicationServerKey, which requires a raw
// ArrayBuffer, not the base64url string the key ships as.
export function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer;
}

/** True if an existing subscription was created with the same VAPID key
 *  we sign with now — a subscription bound to a rotated (old) key 403s
 *  forever on the backend, so it must be dropped and re-created. When the
 *  browser doesn't expose the key we can't compare, so assume a match
 *  rather than needlessly churn the subscription on every load. */
export function subscriptionMatchesKey(
  sub: PushSubscription,
  vapidKey: string,
): boolean {
  const existing = sub.options.applicationServerKey;
  if (!existing) return true;
  const current = new Uint8Array(urlBase64ToUint8Array(vapidKey));
  const a = new Uint8Array(existing);
  if (a.length !== current.length) return false;
  return a.every((byte, i) => byte === current[i]);
}
