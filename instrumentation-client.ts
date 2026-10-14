// Client-side instrumentation entrypoint (Sentry Next.js SDK v8+). Loading this
// module initializes the browser SDK; `onRouterTransitionStart` instruments
// App Router navigations.
import "./sentry.client.config";

export { onRouterTransitionStart } from "./sentry.client.config";
