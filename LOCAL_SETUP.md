# Run Qubit LMS on your computer

The learner app and control panel are separate repositories. The shared API lives in `Qubit-lms-proto-cp/server`; no third repository or external database is needed for this prototype.

## 1. Prerequisites

Install Git and **Node.js 24** with npm. Both repositories pin Node 24.19.0 in `.nvmrc`. On macOS/Linux with nvm you can run `nvm install` and `nvm use` inside a checkout. On Windows, install Node 24 with the Node installer or your Node version manager.

Verify:

```sh
node --version
npm --version
git --version
```

## 2. Clone both repositories next to each other

Run from any folder where you keep projects:

```sh
mkdir qubit-lms
cd qubit-lms
git clone https://github.com/infinixsys/Qubit-lms-proto-cp.git
git clone https://github.com/infinixsys/Qubit-lms-proto-app.git
```

Authenticate with your GitHub account if these repositories are private. Keep the checkout names unchanged because the combined startup script expects adjacent folders:

```text
qubit-lms/
  Qubit-lms-proto-cp/
  Qubit-lms-proto-app/
```

## If the cloud push is blocked

The chat can provide Git bundles containing the complete committed prototypes. Download both bundles into the same folder, then run:

```sh
git clone -b work Qubit-lms-proto-cp.bundle Qubit-lms-proto-cp
git clone -b work Qubit-lms-proto-app.bundle Qubit-lms-proto-app
git -C Qubit-lms-proto-cp remote set-url origin https://github.com/infinixsys/Qubit-lms-proto-cp.git
git -C Qubit-lms-proto-app remote set-url origin https://github.com/infinixsys/Qubit-lms-proto-app.git
```

Continue with installation below. The bundles preserve Git history. Once your GitHub authentication has write access, you can publish these commits from your computer with:

```sh
git -C Qubit-lms-proto-cp push origin HEAD:main
git -C Qubit-lms-proto-app push origin HEAD:main
```

Use ordinary pushes; do not force-push if the remote has newer work. Until a push succeeds, cloning GitHub alone will not contain these prototype commits.

## 3. Install dependencies

From the `qubit-lms` parent folder:

```sh
npm ci --prefix Qubit-lms-proto-cp
npm ci --prefix Qubit-lms-proto-app
```

## 4. Start both products and the API

```sh
cd Qubit-lms-proto-cp
npm run dev:all
```

Keep this terminal running. Open these addresses **on your computer**:

| Product | Local address |
| --- | --- |
| Control panel | http://localhost:5173 |
| Learner app | http://localhost:5174 |
| API health | http://localhost:4000/api/v1/health |

Use `localhost` consistently and leave ports 4000, 5173 and 5174 free. The browser apps proxy `/api` to the local backend automatically. No `.env` file, API keys, Docker, PostgreSQL or paid services are required for this demo. Stop the servers with Ctrl+C.

On Windows, these Git/npm commands also work in PowerShell. The optional `scripts/setup.sh` helper requires Bash (Git Bash, WSL, macOS or Linux).

## 5. Open the demos

- Control panel: choose **Enter demo workspace**. You can also explore the narrower roles.
- Learner app: choose **Explore the learner demo**, or register a synthetic account.
- To inspect the mobile layout, open browser Developer Tools and enable the device toolbar (for example, a 390px phone viewport). This previews the responsive UI; it is not a native device test.

Manual demo sign-in:

| Product | Email | Password |
| --- | --- | --- |
| Control panel | admin@qubit.demo | QubitDemo2026! |
| Learner app | learner@qubit.demo | QubitDemo2026! |

These are public development credentials, not production accounts. Use synthetic information. New learner submissions appear in the control panel's Review workspace. Published in-app announcements and support replies appear in the learner app.

## 6. Optional verification

From the control-panel checkout:

```sh
npm test
npm run build
npm run build --prefix ../Qubit-lms-proto-app
```

To run the cross-product browser suite, first install its browser if your computer does not already have the supported system Chromium:

```sh
npx playwright install chromium
npm run test:e2e
```

On Linux, browser system libraries may also be needed: `npx playwright install --with-deps chromium`. Browser tests create synthetic local records. They start/reuse both apps plus a built learner preview on port 4174 for offline-shell testing.

## 7. Android and iOS projects

From the learner checkout:

```sh
npm run native:sync
npm run android
# On macOS with Xcode and CocoaPods:
npm run ios
```

`native:sync` builds the web application and copies it into the native projects. Android Studio, its SDK, Java 21 and a device/emulator are required to compile Android. iOS compilation requires macOS, Xcode, CocoaPods and Apple provisioning.

A native device cannot use the browser's Vite API proxy. Set a reachable **HTTPS** API origin with build-time `VITE_API_URL`, configure backend CORS and a native-compatible authentication policy, then rebuild/sync. Native sign-in, signing, biometrics and device behaviour have not been validated. Use the browser demo first; native release preparation is separate work.

## Data, updates and troubleshooting

- Local records persist in `Qubit-lms-proto-cp/.data/qubit.sqlite`. Uploads and local backups are also development data; they are excluded from Git.
- Keep `.data` when updating. Back up the database with `npm run backup` before discarding any records.
- To update, stop the servers, run `git pull --ff-only` in each checkout, rerun `npm ci` in each, then restart `npm run dev:all` from the CP checkout. Preserve your local source changes before pulling.
- If the app cannot connect, verify the API health address and check that all three processes started. Avoid mixing `localhost` and `127.0.0.1` between the two browser windows.
- Offline reading requires an explicit lesson download. Full offline page reload works in a built production preview; the Vite development server is not an offline runtime.
- Live AI, payments, email, push, media transcoding and conferencing are not connected. Review `docs/FEATURE_MATRIX.md` for precise prototype boundaries.
