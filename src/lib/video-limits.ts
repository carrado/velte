// Shared between the client (AddProductPage) and the server (Mux status-poll
// route) — file size is a generous safety net, duration is the real
// constraint. See AddProductPage's MAX_VIDEO_* comment for the reasoning.
export const MAX_VIDEO_BYTES = 400 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 90;
