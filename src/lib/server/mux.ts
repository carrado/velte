import Mux from "@mux/mux-node";

/* Server-only Mux client — MUX_TOKEN_ID/MUX_TOKEN_SECRET never reach the
   client bundle. Used by the video BFF routes to mint direct-upload URLs
   and resolve an upload to its ready playback URL. */

export const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export function muxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}
