# Refix India Institute · Owner dashboard

A hardware-repair training institute workspace with a separate Android learner app. The shared Fastify/SQLite backend stays in this repository. Start here: [LOCAL_SETUP.md](LOCAL_SETUP.md).

```sh
npm ci
npm ci --prefix ../Qubit-lms-proto-app
npm run dev:all
```

Owner: http://localhost:7311 · learner preview: http://localhost:7312 · API: http://localhost:7310/api/v1/health

Demo owner: `admin@qubit.demo` / `QubitDemo2026!`. Demo learner: `learner@qubit.demo` with the same password.

The workspace includes:

- Real learner, payment, online-presence, renewal and course-engagement analytics.
- Account activation, deactivation and blocking; device sign-outs; audited, time-limited complimentary access.
- INR packages, manual payment/receipt verification, approval/rejection, cancellation/restore and a CSV subscription ledger.
- Repair-course authoring, video/image/PDF/Word uploads, private playback, duplication, archive/restore, draft curriculum ordering/removal and immutable published versions.
- Capacity-checked training batches, trainer schedules and learner membership; membership does not bypass package access.
- Written practical submissions with trainer decisions, scores and feedback visible in the learner app.
- Staff accounts, custom permissions, support, question bank, live-session links, institute settings, audit and backups.

Six demo programs cover mobile, laptop/computer repairs, electronics, soldering and workshop operations. Generated workshop photos, two original short visual demo classes, a PDF workbook and a diagnosis diagram are bundled. They demonstrate the prototype and are not a complete training syllabus or verified client assets.

`npm test` runs backend regressions. `npm run test:e2e` exercises both interfaces, uploads, approvals, video/PDF rendering, offline expiry and practical reviews. `npm run build` and `npm run format:check` validate the web source. Payments are manually reviewed; production payment processing and outbound messaging are not connected.

[Download the Android prototype](https://github.com/infinixsys/Qubit-lms-proto-app/releases/download/android-prototype-refix-2026-10-22/Refix-India-Institute-debug.apk) · [Release notes](https://github.com/infinixsys/Qubit-lms-proto-app/releases/tag/android-prototype-refix-2026-10-22).
