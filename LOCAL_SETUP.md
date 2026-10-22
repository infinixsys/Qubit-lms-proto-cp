# Run Refix India Institute locally

The owner dashboard and shared API live in **Qubit-lms-proto-cp**. The Android learner app lives in **Qubit-lms-proto-app**. No separate backend repository or external database is required for this prototype.

## Update or clone both repositories

Keep the checkouts next to each other:

```text
D:\Qubit-products\qubit-lms\
  Qubit-lms-proto-cp\
  Qubit-lms-proto-app\
```

For existing checkouts, commit/stash your own changes first, then run from the parent folder:

```powershell
git -C Qubit-lms-proto-cp pull --ff-only origin main
git -C Qubit-lms-proto-app pull --ff-only origin main
```

For a new setup:

```powershell
git clone https://github.com/infinixsys/Qubit-lms-proto-cp.git
git clone https://github.com/infinixsys/Qubit-lms-proto-app.git
```

Install **Node.js 24** and Git. Verify `node --version` shows v24.x. The API uses Node's built-in SQLite; it needs no database installer.

## Install and start

From the parent `qubit-lms` folder:

```powershell
npm ci --prefix Qubit-lms-proto-cp
npm ci --prefix Qubit-lms-proto-app
cd Qubit-lms-proto-cp
npm run dev:all
```

Open these addresses **on your own computer**:

| Component | Local address |
| --- | --- |
| Owner dashboard | http://localhost:7311 |
| Learner browser preview | http://localhost:7312 |
| API health | http://localhost:7310/api/v1/health |

Stop all three processes with Ctrl+C. Ports are **7310 / 7311 / 7312**, separate from common 3000 / 5173 ports. The API binds to `0.0.0.0` for phone testing. The corrected database path uses `fileURLToPath`, including on Windows drives and paths containing spaces; no `D:\D:\...` duplication occurs.

Development-only accounts, password **QubitDemo2026!**:

| Account | Purpose |
| --- | --- |
| admin@qubit.demo | Institute owner |
| learner@qubit.demo | Activated learner with approved Complete Repair Institute package |
| student9@qubit.demo | Learner awaiting activation / payment review |
| olivia@qubit.demo | Trainer demo |
| support@qubit.demo | Support demo |
| finance@qubit.demo | Finance demo |

These are public prototype credentials and synthetic records. Register a new learner to test the full approval journey.

## Install the Android learner APK

Download [Refix-India-Institute-debug.apk](https://github.com/infinixsys/Qubit-lms-proto-app/releases/download/android-prototype-refix-2026-10-22-r2/Refix-India-Institute-debug.apk) from the [GitHub release](https://github.com/infinixsys/Qubit-lms-proto-app/releases/tag/android-prototype-refix-2026-10-22-r2), or build one as below. Transfer it to your Android phone and allow installation from the app used to open the APK. The APK has Android API 23 as its install minimum and targets API 35. Use an up-to-date Android System WebView; testing on your target phone is still required. The local test APK permits HTTP to your development computer; it is not a Play Store release.

1. Start `npm run dev:all` on your computer.
2. Connect your phone and computer to the same Wi-Fi.
3. In PowerShell run `ipconfig`; find the Wi-Fi adapter's **IPv4 Address**, for example `192.168.1.4`. Avoid virtual/VPN adapter addresses.
4. Open the APK. On **Connect to your institute**, enter `http://192.168.1.4:7310` using your actual address.
5. Tap **Connect & continue**, then sign in or create an account.

`localhost` on a phone means the phone, not your computer. Android Emulator uses `http://10.0.2.2:7310`. If connection fails, open `http://YOUR-PC-IP:7310/api/v1/health` in the phone browser first; allow Node/port 7310 on the Windows **private network** firewall if necessary and check Wi-Fi client isolation. The dashboard can remain open on the computer.

The server address is configurable in the APK; it is not hardcoded to a cloud machine. **Change institute server** is available on the sign-in screen. Android sessions use the native HTTP transport and an AES-GCM encrypted session protected by Android Keystore. Account blocking and deactivation revoke server sessions and future protected media requests.

## Build an APK yourself on Windows

Install **Android Studio**, **JDK 21**, and these Android SDK components through Android Studio's SDK Manager: Android SDK Platform 35, Build-Tools 34.0.0 and 35.0.0, Platform-Tools, and Command-line Tools. Accept SDK licences.

From the app checkout in PowerShell, adjust paths for your installation:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm ci
npm run android:apk
```

`JAVA_HOME` must point to a **JDK** containing `bin\javac.exe`, not a JRE. Android Studio's bundled JDK is also suitable if it is version 21. The script builds web assets, syncs **Android only**, and runs Gradle. First build downloads dependencies and may take several minutes. Output:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

On macOS/Linux the same npm command runs `./gradlew`. `npm run android:apk:https` builds the debug package with an HTTPS-only server selector. A store release additionally needs your private signing key, an HTTPS deployment and release testing. Never commit signing keys.

## Try the institute workflow

1. In the learner app, create an account, choose a package, and submit a UPI/bank reference or cash receipt details. A PDF/image receipt is optional. Payment processing is **manual**; the app does not charge or verify UPI with a bank.
2. Owner → **Admissions** → review payment, confirm collection, approve the subscription. Activate the learner at approval time or separately in **Learners → Manage**.
3. Only an **Active** account with an **approved package within its access dates** can read course lessons and retrieve private media. Pending, cancelled, expired, inactive and blocked states are enforced by the API.
4. Owner → **Courses → Create course**, add lessons, confirm content rights, upload video/image/PDF/DOC/DOCX, attach the resources, confirm owner review and publish. Add the published course to an active package under **Packages**.
5. For updates to a published course, create a new version and publish it. Under **Course details → Update learner access**, explicitly upgrade existing enrolments to that version. Old snapshots remain available until upgraded. Newly added courses must be included in a package; changing a package does not silently rewrite existing purchases.
6. **Workspace** contains media, staff/permissions, questions, assignments, live-class links, announcements, support and audit. Role changes revoke staff sessions. Only the owner can grant or block staff access.

## Data, backups and limits

SQLite lives at `Qubit-lms-proto-cp/.data/qubit.sqlite`; uploaded files live at `.data/uploads/`. Both are private local data and ignored by Git. Initial institute content is added with repeat-safe migrations; existing records are preserved. Photos are generated sample imagery. The original 36-second visual classes and diagnosis workbook demonstrate delivery; they are not complete professional repair qualifications.

Run `npm run backup` in the CP checkout for a verified SQLite snapshot under `.data/backups/`. Also back up `.data/uploads/`: the database snapshot alone does not contain video/document bytes. A copy of the SQLite file is not an offsite backup service.

Uploads: MP4/WebM up to 300 MB; JPEG/PNG/PDF/DOC/DOCX/TXT up to 25 MB. PDFs render in-app. Word files show a text reading view and offer the original file for download; complex formatting is preserved in the downloaded original. Video codec support depends on the device; H.264 MP4 is the recommended baseline. Live classes use owner-supplied external join links; video conferencing is not hosted by the prototype.

Offline downloads cover eligible **reading text**, for up to 24 hours or the subscription expiry, whichever comes first. Private streamed files are not cached as offline media. A disconnected device cannot receive an immediate server revocation; cached readings expire locally. Reconnect to sync notes and progress.

The prototype uses manual payment approval, local SQLite/storage, public demo users and no configured email/SMS/push provider or production AI provider. Production rollout needs those integrations, HTTPS hosting, proper backups, upload scanning/storage, release signing and device testing. Android is built here; iOS scaffolding remains, but a signed iOS build needs macOS/Xcode and further native-session integration.

## Checks

CP: `npm test`, `npm run build`, `npm run format:check`. App: `npm run build`, `npm run format:check`, `npm run android:apk`. Integration/browser tests live in CP: `npx playwright install chromium` then `npm run test:e2e` with both sibling repositories installed. Browser tests create synthetic local records.

## Refix repair institute demo

Pull **both** repositories and restart `npm run dev:all`. Repair courses and media are added automatically by an idempotent database migration. Do not delete your existing `.data` folder. The four untouched bundled exam courses move to Archived; their published versions, progress and payment history are retained. Owner-authored and edited courses remain intact. The media files in `server/assets/` are original prototype teaching samples.

The six repair programs cover laptop diagnosis, mobile boards, soldering, desktop motherboards, electronics and repair-workshop business. Three demo INR packages cover laptop, mobile and complete institute access. Realistic generated photos illustrate fictional technicians; they are not verified photos of the client's staff or premises.

Owner navigation adds **Training batches** and **Practical reviews**. Open a learner's name → **Access & device controls** to grant complimentary course access with an expiry or sign out all devices. Grants require both learner-management and billing permissions and do not add paid revenue. Activate accounts separately; paid package approval still requires manual payment verification. The Admissions page exports the actual subscription ledger as CSV.

In a course, **Duplicate**, **Archive course / Restore draft**, and **Arrange curriculum** provide additional controls. Ordering or removing lessons changes the draft only; existing published versions stay intact. Publish a new version after owner review, then explicitly upgrade existing enrolments when appropriate.

Learners open **Repair bench** on Home or **Practical lab & batches** in You. Submit written bench observations for an enrolled, approved course. The trainer reviews the work as Changes requested or Competent, with feedback and a score. This is a written-observation workflow; photo/video evidence upload, attendance tracking and a professional-certification process are not included.

Client website inspection was blocked by this cloud environment's network policy. The Refix institute wordmark and navy/blue/copper design are a proposed visual direction, not a verified reproduction of refixindia.com.
