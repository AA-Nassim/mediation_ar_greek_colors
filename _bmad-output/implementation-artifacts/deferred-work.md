# Deferred Work

## Story 1.5 Review — Deferred Findings

1. **currentStream leak on Tracking→Error / Lost→Error**: `onEnter(Error)` does not clean up `currentStream`. The stream reference is overwritten on retry without stopping tracks. Pre-existing issue surfaced by Story 1.5 review.
2. **Resources leaked on Tracking→Unsupported / Lost→Unsupported**: Terminal Unsupported state has no cleanup for frameCapture interval, frameWorker, or currentStream. Pre-existing pattern — all non-Camera states lack cleanup.
3. **Deadlock on #awaitingAck**: If the worker crashes or drops a message, `#awaitingAck` stays `true` forever with no timeout or recovery mechanism. Should be addressed when Epic 2 worker inference is implemented.
