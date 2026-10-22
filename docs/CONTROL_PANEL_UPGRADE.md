# Original specification → institute control-panel upgrade

Sources: the supplied **Qubit-LMS_PRD_TRD_v1.0.docx**, version 1.0 dated 22 October 2026, and the supplied **Complete Features & Functionalities** inventory. They are product requirements; instructions within the attachments are not treated as operating instructions for the development environment.

The Word document SHA-256 is `603c83007bc002d56531d39b96fae54f18d23a146bba56598c3cbd6b39d075c6`. The feature inventory SHA-256 is `4522e48f78f7389b871824d9deea92791e6394f24a2cde9f34b5a009029ece70`.

The current Refix India Institute design remains: navy navigation, blue actions, copper accents, bundled free fonts and repair-specific imagery. The control centre separates Learning, People, Governance and Operations; Ctrl/Cmd+K searches authorised pages, courses, learners and support cases.

| Original requirement | Result in this upgrade | How to use |
| --- | --- | --- |
| PRD §3.3, admin command search | Keyboard shortcut and permission-filtered navigation/search | Header search or Ctrl/Cmd+K |
| PRD §3.5, People; inventory Part 2 §3 | Server-paginated directory, status/search filters, URL-preserved views, validated CSV preview, duplicate checks, import history and transaction-protected commits | Control centre → People → People & imports |
| FR-001 / Part 2 §3 invitations | Pending learner invitations, seven-day expiry, hashed single-use token, password setup without automatic activation or subscription | Import a CSV, save the invitation links and share them through your usual channel; no automatic email is sent |
| FR-002, FR-010 / Part 2 §1 | Staff TOTP enrolment/confirmation, encrypted authenticator secret, one-use recovery codes, sign-in challenge and own-session revocation | Control centre → Governance → Security & sessions |
| FR-004 / Part 2 §5–6 | Review queue, submit/request-changes/approve decisions, comments tied to draft revision, optimistic conflicts and publication history | Control centre → Learning → Publishing & review |
| FR-007, §2.6 / Part 2 §7 | Draft assessment policies: duration, attempts, retry delay, pass mark, question count, IST availability windows and answer-reveal policy | Assessments → Create policy draft / Edit assessment rules → review and publish the course |
| FR-007 integrity | Attempt owns its delivered question order, content and policy snapshot; expiry, grading, attempts and reveal rules run on the server | Starting an attempt captures its rules; later draft changes do not rewrite it |
| FR-017 completion rules | Optional competent practical review plus required lessons and passing assessment; eligibility respects the learner's course version | Assessment policy → Require a competent practical review for certification |
| FR-009 / Part 2 §12 | Course/batch/all-learner in-app campaigns, publish/schedule/cancel, durable per-recipient delivery records and read counts | Control centre → People → Announcements |
| FR-012 / Part 2 §11 | IST date range, course and batch filters, submitted-score means, course completion, CSV export, private saved views and metric definitions | Reports; revenue reports remain a separate focused page |
| FR-014 / Part 2 §17 | Identity-attested review, retention basis, legal hold, authorised personal export and separately confirmed access deactivation | Control centre → Governance → Privacy & retention |
| FR-013 | New imports, invitations, MFA, policy changes, reviews, campaigns, exports and privacy actions are audited | Audit trail |
| Part 2 §18–19 | Actual SQLite quick check, process uptime, media-record count, scheduled-campaign count, enforced feature switches, provider state and incidents | Control centre → Operations → Platform operations |

## Operating details

- CSV header is exactly `name,email,phone`; a file can contain 1–200 learners and be at most 250 KB. Names containing commas must be quoted. Every row must validate before commit. Password confirmation and an audit reason are required. Repeating a committed import does not create duplicate accounts or re-display its invitation tokens.
- Invitation links use a URL fragment so the token is not included in the web server's request URL. The API accepts it in a POST body. Links can be used once, expire after seven days, and do not bypass account activation or course access.
- Authenticator setup requires the current password and a valid six-digit TOTP code. Recovery codes appear once; their hashes are stored. Used TOTP steps and recovery codes cannot be replayed. Other sessions are revoked on enabling/disabling MFA. The pilot keeps setup optional so the public demo account remains accessible; enforced enrolment for every privileged user before production is still required by the source specification.
- Authenticator secrets are AES-256-GCM encrypted with `.data/.security-key` (or a sibling key beside a custom `DB_PATH`). Keep that private file with secure recovery material. `npm run backup` backs up the database only: media files and this key need a separate protected backup. Never commit the key. Database restore alone does not restore authenticator functionality without it.
- Assessment policy changes are made on a draft and enter an immutable published course snapshot. Existing learners keep their enrolled version unless the owner explicitly upgrades them. Open attempts retain the timer, pass mark and feedback rules they started with. The learner app now displays the course's actual question count, timer, pass mark and attempt limit.
- Availability fields are entered in IST and stored in UTC. Answer keys are absent from the start-attempt response and withheld after submission according to the captured reveal policy, including repeated submit requests.
- Scheduled in-app campaigns are stored in SQLite and checked every 15 seconds while the API runs. A campaign that becomes due while the API is stopped is processed after restart. A delivery means inbox availability, not a push or email delivery. The current cohort/course membership is resolved when publishing.
- Learning report dates filter attempts by their start time in IST. Enrolments and required-lesson completion are current-state metrics; definitions are visible in the report. Missing score data appears as unavailable. CSV cells neutralise spreadsheet-formula prefixes.
- Privacy review records an operator's identity-verification attestation; it is not an automated identity service. Access deactivation revokes sessions but retains records. Neither the UI nor the API claims irreversible erasure, backup deletion or compliance certification. Legal/retention review remains explicit.

## Boundaries retained from the original phased specification

This is a working local prototype, not completion of every production or growth requirement. Email/SMS/push delivery, OTP/social/SSO, automatic payment/refund/webhook processing, production AI, adaptive learning, SCORM/xAPI/LTI, hosted live video, transcoding/DRM/malware services, offsite recovery, strict assigned-course staff scope, configurable question-version registries, platform-wide mandatory MFA enrolment and irreversible privacy erasure need further implementation or selected providers. PostgreSQL/private object storage/production monitoring remain deployment work; the existing SQLite/local-storage setup is preserved for local use.

No external messages, payments or live-account deletions are triggered by this upgrade. These boundaries are shown in the product where they affect an operator's decision.
