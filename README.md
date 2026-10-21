# Qubit · Learning operations control panel

For your own computer, follow [Local setup](LOCAL_SETUP.md).

A functional development prototype based on `Qubit-LMS_PRD_TRD_v1.0.docx` and the supplied complete feature inventory. The separate learner repository is `infinixsys/Qubit-lms-proto-app`.

The control panel includes the shared learning API. Both frontends use the same persistent SQLite database, so learner work appears in the administration workspace.

## Run the two products

Requires Node **24.19.0** or a compatible Node 24 release (built-in `node:sqlite`) and npm.

```bash
# Terminal 1: API (7310) + control panel (7311)
cd /workspace/Qubit-lms-proto-cp
npm ci
npm run start

# Terminal 2: separate learner application (7312)
cd /workspace/Qubit-lms-proto-app
npm ci
npm run dev
```

Use **Enter demo workspace** in the control panel and **Explore the learner demo** in the app. No credentials need configuring for the local prototype. Native mobile instructions are in the learner repository.

Development-only accounts use `QubitDemo2026!`:

| Email | Role |
| --- | --- |
| admin@qubit.demo | Super Admin |
| tenant@qubit.demo | Tenant Admin |
| olivia@qubit.demo | Instructor |
| support@qubit.demo | Support |
| finance@qubit.demo | Finance |
| learner@qubit.demo | Learner |
| studio@qubit.demo | Learner in another tenant |

**Use synthetic data only.** These public demo accounts, local storage, and the single-machine database are intentional prototype choices. This is not a deployable production security baseline. MFA and external providers have not been configured.

To launch all three development processes with one command after installation:

```bash
npm run dev:all
```

## What works

- Separate learner and administrator cookie sessions; hashed passwords; tenant-scoped permissions; password confirmation for role changes; revocable devices.
- Course drafts, lesson authoring/reordering, review approval, publishing preflight, immutable published snapshots, and original-version access for enrolled learners.
- User search, invitation records, validated CSV preview/import, account status, restricted course access grants, and audited exports.
- Server-timed quizzes, answer-key protection, server scoring, attempt limits, idempotent submissions, and completion events.
- Learner assignment uploads and text, staff grading and feedback, and returned-work resubmission.
- Operational dashboards, question bank, media uploads, announcements, community, live-session records, certificate verification/revocation, support, privacy review requests, organisations, commercial preferences, prompts and feature controls.
- A reference-only learning assistant, explicitly labelled as a non-generative fallback. No AI API calls are made.
- Local database backup with integrity and restored-read validation.

The feature matrix lists partial implementations, provider requirements, and production work explicitly. Synthetic pilot trends and catalogue ratings/enrolment counts are labelled and are separate from actual workspace totals.

## Validation

```bash
npm test                 # isolated in-memory API integration tests
npm run typecheck
npm run build
npm run test:e2e         # launches/reuses BOTH frontends and API
npm run backup           # online SQLite snapshot + integrity/restored-read check
npm run format:check
```

Browser tests use system Chromium when installed at `/usr/bin/chromium`. Otherwise install Playwright's Chromium with `npx playwright install chromium`. The end-to-end suite creates synthetic test accounts, courses and submissions; run it against a development database. It tests the actual learner-to-admin feedback journey, publication, offline queue sync, overview accessibility, and route rendering.

## Runtime configuration

| Name | Default / purpose |
| --- | --- |
| PORT | `7310` API port |
| API_HOST | `127.0.0.1`; bind deliberately when exposing the API |
| DB_PATH | `server/../.data/qubit.sqlite` |
| ALLOWED_ORIGINS | Explicit localhost frontend and Capacitor origins in `server/app.mjs` |
| NODE_ENV | Development. Setting production alone does not harden this prototype. |

Dependencies are locked. `.data/`, uploads within the database, local backups, dependencies and build artefacts are ignored. Do not remove `.data/` unless you intend to discard the local prototype records. The first API start seeds synthetic course material and demo accounts once.

## Documentation

- [Feature coverage and boundaries](docs/FEATURE_MATRIX.md)
- [Architecture, data and API](docs/ARCHITECTURE.md)
- [Prototype review walkthrough](docs/REVIEW_GUIDE.md)
- [Production implementation backlog](docs/PRODUCTION_BACKLOG.md)

- [Validation evidence](docs/VALIDATION.md)
- [Reproducible cloud setup script](scripts/setup.sh)
