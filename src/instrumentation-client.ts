// This file configures the initialization of Sentry on the client.
 // The added config here will be used whenever a users loads a page in their browser.
 // https://docs.sentry.io/platforms/javascript/guides/nextjs/

 import * as Sentry from "@sentry/nextjs";

 Sentry.init({
   dsn: "https://3afd755197a4fd101abb82b2cc4f612d@o4512044365447168.ingest.de.sentry.io/4512111626616912",
   enabled: process.env.NODE_ENV === "production",

   // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
   // This is the modern replacement for the webpack plugin's tunnelRoute option.
   tunnel: "/monitoring",

   // Add optional integrations for additional features
   integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 0.05 : 1,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === "development" ? 0 : 0.1,

   // Define how likely Replay events are sampled when an error occurs.
   replaysOnErrorSampleRate: 1.0,

   dataCollection: {
     // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
     // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
     // userInfo: false,
     // httpBodies: [],
   },
 });

 export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
