# Qubit Coaching · Owner dashboard & API

A working Indian coaching prototype with a separate Android learner app in [Qubit-lms-proto-app](https://github.com/infinixsys/Qubit-lms-proto-app). The shared Fastify/SQLite API stays in this repository.

Start with [LOCAL_SETUP.md](LOCAL_SETUP.md) for Windows setup, APK connection, accounts, backups and limitations.

```sh
npm ci
npm run dev:all
```

Install the adjacent app's dependencies first. API uses 7310; owner dashboard 7311; learner preview 7312. Node 24 is required. Owner demo: `admin@qubit.demo` / `QubitDemo2026!`.

## Coaching operations

- Live database counts for accounts, active paid learners, recent online presence, pending payment/approval/activation and upcoming renewals.
- INR packages with course access and validity, recorded payment verification, explicit subscription approval, renewal scheduling, cancellations and separate account activation.
- Learner search, progress, assessments, active/inactive/blocked states and immediate session revocation.
- Course drafts, faculty/batch/language, uploaded cover photos, reading/video/image/document lessons, review and publishing, immutable versions and explicit upgrades for enrolled learners.
- Private multipart media uploads, byte-range video playback, PDF rendering, Word text previews and original-file downloads. Access is rechecked against account, package, tenant and course version.
- Staff accounts, custom roles, owner-confirmed grants, permission enforcement, announcements, question bank, assignments/feedback, live-class links, support and audit history.
- Clean navy/teal navigation with bundled Inter, Plus Jakarta Sans and Devanagari fonts, and realistic generated Indian course photos.

`npm test` exercises authentication, tenant boundaries, approvals, assets, subscription expiry, blocking, staff roles, course versions, quizzes and Windows paths. `npm run test:e2e` covers both products, real video/PDF/Word delivery, offline reading and accessibility checks.

This is a local prototype. Payments are verified manually; no bank, email, push or production AI provider is connected. Demo content and public credentials are included for exploration. See the setup guide before release or deployment.
