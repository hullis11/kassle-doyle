# Kassle — Action Plan (from meeting notes)

## Before anything else (from the 2026-11-03 session)
- [ ] Run `serverless deploy`. The backend changes below are written but not live yet
- [ ] Check the frontend builds (`npm run build` in `frontend/`, or watch `ng serve` for errors)
- [ ] Test: save a new screenshot, then check the admin page (accordion, lazy image load, sort arrows, disabled Admin item for non-admins)
- [ ] Commit the work (nothing from this session is committed yet)

## Phase 1 — Header / Navbar (`frontend/src/app/app.html`, `app.css`)
- [x] Full-width header that stays at the top (two rows: title bar + nav line, `sticky-top`)
- [x] Menu is a dropdown with an ordered list (Start New Game, Load Game, Admin), plus a separate Home button
- [x] User info (username, role, Log Out) on the right, on the same line as the centered KASSLE title
- [x] Role display fixed: reads `cognito:groups` from the ID token instead of the nonexistent `custom:role`
- [x] Stayed on Bootstrap 5.3 (decided not to upgrade to 6.0)
- [x] Bootstrap JS bundle loaded in `angular.json` so dropdowns/accordions work

## Phase 2 — Small frontend polish
- [x] Replace the Angular favicon in the browser tab (now `frontend/public/favicon.svg`, yellow K on black)

## Phase 3 — Admin page (`frontend/src/app/admin/`)
- [x] Sort indicator: ▲/▼ in the sorted column header
- [x] Sorted column heading changes color (yellow)
- [x] Fixed Turn column sorting (was sorting by `whoseTurn`, which games don't have; now `player`)
- [x] Screenshots shown as a Bootstrap accordion with metadata in the title (date, whose turn, gameId)
- [x] Screenshot only fetched from S3 when its accordion is opened (`@defer` + `ScreenshotImage` component's `ngOnInit`)
- [ ] Notes also mentioned making the *games table* rows accordions. Only screenshots were done; confirm whether games need it too

## Phase 4 — Backend data model (`kassle-deploy/`)
- [x] `screenshotId` is now the partition key of `kassleScreenshots` (table recreated by hand; `loadScreenshots` uses Scan + sort)
- [x] `gameId` stored on each new screenshot
- [x] New `GET /screenshoturl?key=...` endpoint returns a fresh 5-minute link for one screenshot (admin-only)
- [ ] Optional cleanup: remove the unused `QueryCommand` import in `kassle-handlers.js`

## Phase 5 — Role-based feature gating
- [x] `adminFeature = { allowedRoles: [...] }` defined in `app.ts`; Admin menu item gets Bootstrap's `disabled` class for non-admins
- [ ] Optional: route guard so non-admins can't open `/admin` by typing the URL (backend already blocks the data with 403)

## Phase 6 — CI/CD & hosting
- [ ] Look for the boss's commit with the S3 frontend deployment code (`git fetch --all`, then check branches/log)
- [ ] Move `buildspec.yml` into the deploy folder (`kassle-deploy/`) and update paths
- [ ] **Backend pipeline**: CodePipeline, Source stage (CodeConnection to GitHub, triggers on push), CodeBuild (serverless deploy)
  - Alternative: GitHub Actions can serve as the pipeline instead
- [ ] **Frontend pipeline**: CodePipeline, Source (CodeConnection), CodeBuild
  - Build generates the Angular environment file from Secrets Manager values
  - Deploy static build to an S3 bucket configured for static hosting
  - CloudFront distribution in front of S3
- [ ] Custom domain: `kassle.selwaymore.com` (Route 53/DNS record + ACM certificate in us-east-1 for CloudFront)
- [ ] Update Cognito callback/logout URLs and API CORS origins for the new domain
  - `serverless.yml`: `custom.cors` origin (one place, thanks to the `&cors` anchor) + both `GatewayResponse` blocks
  - `kassle-handlers.js`: `corsHeaders` origin

## Open questions
- "Edit assigned role top left": does this mean users/admins should be able to *change* a role from the UI?
- Should `allowedRoles` come from the backend (one list for both sides) instead of being defined in the frontend?
- GitHub Actions or AWS CodePipeline?
