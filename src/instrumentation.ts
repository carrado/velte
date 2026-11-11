export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { startHubWsServer } = await import("@/server/hubWsServer");
      startHubWsServer();
    } catch (err) {
      console.warn(
        "[Instrumentation] Could not start Hub WebSocket server:",
        err,
      );
    }
  }
}
