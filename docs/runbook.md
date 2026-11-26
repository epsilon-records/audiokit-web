# Runbook

## Cut-over rollback (audiokit.ai serves the app)

Since the cut-over (PR #93), the `audiokit` Netlify site builds the app in `console/` and serves
audiokit.ai. The former console site (`console.audiokit.ai`) no longer exists (AudioKit 0092), so
there is no old host to fall back to. Recovery means putting a previous `audiokit` deploy or the
previous commit back.

1. **Fastest: restore the previous deploy, then lock it.** In the `audiokit` site's Deploys list
   in Netlify, publish the last good production deploy that was built after the cut-over (one
   that serves `/login`, `/auth/callback`, `/credits` and `/settings/billing`). Do not publish a
   pre-cut-over (static-site) deploy unless the board has first made `console.audiokit.ai` (or a
   new host, with the static build rebuilt so its Sign in link points there) serve sign-in, and
   set the billing variables in step 3 to that host. The Sign in link is baked into that build and
   points at `console.audiokit.ai`, so naming a host is not enough. After publishing, check that
   the Sign in link reaches the working host, that a magic link signs in, and that a Stripe
   return lands back in the console. Select Lock publishing as soon as the restored deploy is
   live: first confirm in the Deploys list that it is the one marked live (not a preview, and not
   a newer build that replaced it). Until the lock is set, nothing may be pushed to `main`, because
   a new push builds and publishes over the restored deploy. This changes production settings, so
   it needs the Oracle or Nate; coding agents don't do it.
2. **Then fix the source, and don't revert the cut-over merge.** Revert or fix only the offending
   change on `main` through a PR. Do not revert the cut-over merge (`00194b4`) as a rollback: it
   restores the static-site build, which has no `/login`, `/auth/callback`, `/credits` or
   `/settings/billing`, and its Sign in link points at `console.audiokit.ai`, which no longer
   exists. Customers could then not sign in or return from billing. A revert of that merge is safe
   only on the same condition as step 1: `console.audiokit.ai` serves sign-in again, or the
   static build is rebuilt so its Sign in link points at the board's named working host, and the
   billing variables in step 3 point at that host. When the fix is merged, a locked site does not deploy it by itself: unlock the site or
   publish the new deploy manually.
3. **Billing variables.** Magic links, Stripe Checkout and the Stripe portal send customers to
   URLs built from variables on the billing service, which this repo does not change:
   `CONSOLE_BASE_URL` (now `https://audiokit.ai`), `STRIPE_CHECKOUT_SUCCESS_URL`,
   `STRIPE_CHECKOUT_CANCEL_URL`, and `STRIPE_PORTAL_RETURN_URL` (unset; derives
   `https://audiokit.ai/settings/billing`). They point at audiokit.ai, which is where the
   rollback also serves, so a rollback of the Netlify deploy needs no change to them as long as
   the restored deploy serves `/auth/callback`, `/credits` and `/settings/billing`. A rollback to a
   build that lacks those routes (the static site) is not made safe by changing these variables
   alone: that build's own Sign in link points at `console.audiokit.ai`, which is gone. It needs a
   host that serves sign-in and that the build's Sign in link actually reaches (step 1). That host
   must already serve `/settings/billing` (and `/auth/callback` and `/credits`) before the
   billing variables are pointed at it, or customers land on a missing page from a magic link or
   a Stripe return. Only then point the variables at it. Unknown:
   what that host would be, because nothing in this repo says how `console.audiokit.ai` would be
   recreated.
4. **Verify.** After restoring a post-cut-over deploy, request a magic link on
   `https://audiokit.ai/login`, open it, and confirm `/auth/callback` lands in the console; load
   `/`, `/pricing/` and `/docs/`. After a static-build rollback, `/login` does not exist on that
   build: use its Sign in link, sign in on the working host the board named, and confirm the
   callback lands on that same host. Check both Stripe returns on that host: complete a Checkout
   and confirm its return lands on `/credits` there, and open the billing portal and confirm its
   return lands on `/settings/billing` there. Then load `/`, `/pricing/` and `/docs/`.
