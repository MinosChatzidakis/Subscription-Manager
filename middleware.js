import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. Define the routes that are allowed to be seen without logging in.
// We need to leave the sign-in and sign-up pages public so users can actually log in!
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // 2. If the user visits a route that is NOT in the public list above,
  // trigger auth.protect() to instantly block them and redirect to the login screen.
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk's auto-proxy path
    "/__clerk/:path*",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
