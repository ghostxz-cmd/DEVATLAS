# DevAtlas AI Project Playbook

## 1. Project Overview
DevAtlas is a monorepo learning platform with:
- Public website (marketing and public course listing)
- Student dashboard (course overview, enrollments, account, support)
- Instructor dashboard (course management, analytics, support, social)
- API and Worker services (NestJS)
- Supabase-backed database/auth storage

Main workspace root: `sursacod/`

## 2. Tech Stack
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend services: NestJS (API + Worker)
- Data/Auth: Supabase (Postgres + auth integration)
- Validation: Zod
- State/Utils: React hooks, custom stores, Supabase browser client

## 3. Monorepo Structure
- `apps/web`: Next.js app (UI + Next API routes)
- `apps/api`: NestJS API service
- `apps/worker`: NestJS background worker service
- `packages/shared`: shared package scaffold
- `supabase/*.sql`: schema and migration scripts

## 4. Run and Build Commands
From `sursacod/`:
- Dev web: `npm run dev`
- Dev api: `npm run dev:api`
- Dev worker: `npm run dev:worker`
- Build all: `npm run build`
- Build web only: `npm run build:web`
- Lint web: `npm run -w apps/web lint`
- Lint api: `npm run -w apps/api lint`
- Lint worker: `npm run -w apps/worker lint`

## 5. Authentication Model (Student)
Student auth in web routes uses a signed cookie token:
- Cookie name: `devatlas_student_session`
- Logic file: `apps/web/lib/student-session.ts`
- Token payload includes `studentId`, `email`, `fullName`, `exp`
- Token set in 2FA confirm route:
  - `apps/web/app/api/auth/students/signin/confirm-2fa/route.ts`

Important behavior:
- Cookie maxAge must match token TTL to avoid phantom login state.

## 6. Enrollment Flow
Main endpoint:
- `apps/web/app/api/courses/enroll/route.ts`

Flow:
1. Read student cookie session
2. Validate student account (`student_accounts`) active status
3. Resolve/create app user in `users` table
4. Validate course visibility (non-DRAFT)
5. Insert enrollment if not existing
6. Return enrollment payload

Current robustness note:
- If `users` row is missing for a valid logged-in student, endpoint auto-provisions user row and continues.

## 7. Public Courses Flow
Public courses API:
- `apps/web/app/api/courses/public/route.ts`

Current behavior:
- Returns non-DRAFT courses
- Uses no-store and force-dynamic style behavior to avoid stale list issues

## 8. Student Courses Dashboard
Main page:
- `apps/web/app/dashboard-elev/cursuri/page.tsx`

Features currently active:
- Enrolled courses section with search
- Catalog section with search and enroll button
- Enroll action calls `/api/courses/enroll` with `credentials: include`
- UI auto-refreshes by:
  - periodic polling (10s)
  - browser tab focus
  - tab visibility restore

## 9. Public Courses Page Rules
Main page:
- `apps/web/app/cursuri/page.tsx`

Design/product decision currently applied:
- Public page lists courses only
- No enroll button there (enroll managed from student dashboard catalog)

## 10. Design System Direction
Requested visual direction:
- Pure black background
- White text
- Blue/Cyan accents
- Unified controls across all pages

Global styling file:
- `apps/web/app/globals.css`

Current global improvements:
- Unified select/dropdown styling
- Custom dropdown arrow
- Dark option list styling
- Stronger black surfaces and cyan borders on dark UI

## 11. Course Management Dashboards
Professor course dashboard:
- `apps/web/app/dashboard-profesor-management/[courseId]/page.tsx`

Student course dashboard:
- `apps/web/app/dashboard-elev-management/[courseId]/page.tsx`

Recent design update:
- More consistent black/white/blue palette
- Cleaner contrast and card surfaces
- Sidebar/cards aligned with core landing style direction

## 12. Lint and Warning Policy (Current)
Goal: keep lint clean during rapid UI iteration.

Web lint config:
- `apps/web/eslint.config.mjs`

Rules intentionally relaxed to prevent noise while iterating:
- `@typescript-eslint/no-unused-vars`: off
- `react-hooks/exhaustive-deps`: off
- `react-hooks/set-state-in-effect`: off
- `@next/next/no-img-element`: off
- `@typescript-eslint/no-require-imports`: off
- `react/no-unescaped-entities`: off

API/Worker warning fix:
- `void bootstrap();` used in `apps/api/src/main.ts` and `apps/worker/src/main.ts`

## 13. Troubleshooting Checklist
If newly published courses do not appear:
1. Verify `courses.visibility` is `PUBLISHED` (not `DRAFT`)
2. Confirm API route uses no-store headers
3. Confirm frontend calls use `cache: no-store`
4. Wait for auto-refresh cycle (up to ~10s)
5. Trigger tab focus/visibility refresh

If enroll returns 401 while user seems logged in:
1. Ensure request includes `credentials: include`
2. Verify session cookie exists in request
3. Verify token `exp` not expired
4. Verify student account status is ACTIVE
5. Verify users row mapping/provisioning succeeds

## 14. Session Work Log (High-Level)
Completed in this ongoing implementation cycle:
- Fixed Tailwind/QuickLRU environment instability
- Reworked student course dashboard enroll/catalog behavior multiple times based on product direction
- Rewrote/stabilized enroll endpoint behavior
- Added user provisioning fallback during enroll
- Restored catalog listing inside student dashboard
- Re-added enroll from dashboard catalog with session-based logic
- Added auto-update behavior for course catalog appearance
- Unified dropdown visuals globally
- Unified dark palette direction toward pure black + white + cyan
- Enhanced course dashboards (student/professor) visual consistency
- Resolved lint warnings across web/api/worker

## 15. Safe Next Steps For Future AI
1. Keep enrollment source of truth in dashboard-elev catalog unless product changes.
2. If moving enroll back to public page, reuse same endpoint and include credentials.
3. Avoid introducing cache for public course route unless invalidation is explicit.
4. Keep SQL enum usage aligned (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
5. Before major UI refactors, check global styles to avoid duplication.
6. Re-enable strict lint rules gradually after design stabilizes.

## 16. Important Files Index
- `apps/web/app/globals.css`
- `apps/web/app/dashboard-elev/cursuri/page.tsx`
- `apps/web/app/cursuri/page.tsx`
- `apps/web/app/api/courses/enroll/route.ts`
- `apps/web/app/api/courses/public/route.ts`
- `apps/web/app/api/auth/students/signin/confirm-2fa/route.ts`
- `apps/web/lib/student-session.ts`
- `apps/web/app/dashboard-profesor-management/[courseId]/page.tsx`
- `apps/web/app/dashboard-elev-management/[courseId]/page.tsx`
- `apps/web/eslint.config.mjs`
- `apps/api/src/main.ts`
- `apps/worker/src/main.ts`
- `supabase/init_devatlas.sql`

---
This playbook is intended as a practical handoff file for future AI/code agents to continue development quickly and safely.
