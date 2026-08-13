/** One row on the vendor-facing Followers page — see velte-backend's
 *  getMyFollowers. Deliberately never carries phone: a vendor can see WHO
 *  follows their store, not a way to contact them outside a buyer's own
 *  choice to initiate (a request response, or "Chat" on a listing). */
export interface VendorFollower {
  name: string | null;
  username: string | null;
  followedAt: string;
}
