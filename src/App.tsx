import {
  CommandSearch,
  JoinInvitation,
  Directory,
  Assessments,
  Publishing,
  Communications,
  Insights,
  Governance,
  Platform,
} from "./control-center";
import { Security } from "./security";
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  api,
  post,
  patch,
  useData,
  useToast,
  Icon,
  Brand,
  Avatar,
  Badge,
  Form,
  Modal,
  Loading,
  ErrorState,
  Empty,
} from "./ui";
import type { Row, Field } from "./ui";
import {
  CoursePhoto,
  Stat,
  money,
  date,
  AssetUpload,
  ResourceViewer,
} from "./coaching-ui";
import {
  Batches,
  Practicals,
  LearnerAccess,
  CourseControls,
  BillingExport,
} from "./academy";
import { ResourcePage, Audit } from "./Legacy";
const navigation = [
  ["/", "Overview", "LayoutDashboard", "analytics"],
  ["/learners", "Learners", "UsersRound", "users"],
  ["/courses", "Courses", "BookOpen", "courses"],
  ["/assessments", "Assessments", "ClipboardList", "assessments"],
  ["/batches", "Training batches", "UsersRound", "courses"],
  ["/practicals", "Practical reviews", "ClipboardList", "assessments"],
  ["/admissions", "Admissions", "ClipboardList", "billing"],
  ["/packages", "Packages", "CreditCard", "billing"],
  ["/reports", "Reports", "ChartNoAxesCombined", "analytics"],
  ["/workspace", "Control centre", "Settings2", "any"],
];
function Heading({
  title,
  text,
  action,
  eyebrow = "INSTITUTE WORKSPACE",
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="coach-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}
function Table({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table className="coach-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Login({ done }: { done: (d: Row) => void }) {
  const [challenge, setChallenge] = useState("");
  if (challenge)
    return (
      <div className="owner-mfa-login">
        <Brand />
        <span className="auth-icon">
          <Icon name="ShieldCheck" size={30} />
        </span>
        <h1>Verify your sign-in</h1>
        <p>Enter an unused authenticator code or one of your recovery codes.</p>
        <Form
          fields={[
            {
              name: "code",
              label: "Authenticator or recovery code",
              required: true,
            },
          ]}
          label="Verify & sign in"
          onSubmit={async (v) =>
            done(await post("/auth/mfa", { challenge, ...v }))
          }
        />
        <button className="text-link" onClick={() => setChallenge("")}>
          Back to password sign-in
        </button>
      </div>
    );

  return (
    <div className="owner-auth">
      <section>
        <Brand />
        <div>
          <span className="eyebrow">BUILT FOR REPAIR TRAINING</span>
          <h1>
            Real skills.
            <br />A clear view of
            <br />
            <em>a stronger institute.</em>
          </h1>
          <p>
            Your learners, courses and training business.
            <br />
            One thoughtfully connected workspace.
          </p>
        </div>
        <small>Refix India Institute · India</small>
      </section>
      <main>
        <div className="login-box">
          <span className="auth-icon">
            <Icon name="GraduationCap" size={30} />
          </span>
          <h2>Welcome to your workspace</h2>
          <p>Sign in to manage your training institute.</p>
          <Form
            fields={[
              {
                name: "email",
                label: "Work email",
                type: "email",
                required: true,
              },
              {
                name: "password",
                label: "Password",
                type: "password",
                required: true,
              },
            ]}
            initial={{ email: "admin@qubit.demo", password: "QubitDemo2026!" }}
            label="Sign in to dashboard"
            onSubmit={async (v) => {
              const r = await post("/auth/login", v);
              if (r.mfaRequired) setChallenge(r.challenge);
              else done(r);
            }}
          />
          <div className="demo-note">
            <Icon name="Info" size={17} />
            <span>
              Demo workspace with sample data. Use the pre-filled owner account
              to explore.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
export default function App() {
  const [session, setSession] = useState<Row | null>(null),
    [ready, setReady] = useState(false),
    [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    api("/me")
      .then(setSession)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  if (location.pathname === "/join") return <JoinInvitation />;
  if (!ready) return <Loading />;
  if (!session) return <Login done={setSession} />;
  const can = (p: string) =>
    p === "any" ||
    session.permissions.includes("*") ||
    session.permissions.includes(p);
  return (
    <div className={"owner-shell " + (menu ? "menu-open" : "")}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="owner-sidebar">
        <Link to="/" aria-label="Refix institute overview">
          <Brand />
        </Link>
        <div className="workspace-label">
          <span className="workspace-logo">RI</span>
          <div>
            Refix India Institute<small>Owner workspace</small>
          </div>
          <Icon name="ChevronsUpDown" size={15} />
        </div>
        <span className="nav-label">MANAGE YOUR INSTITUTE</span>
        <nav aria-label="Main navigation">
          {navigation
            .filter((n) => can(n[3]))
            .map(([path, label, icon]) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                onClick={() => setMenu(false)}
              >
                <Icon name={icon} />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="owner-help">
            <Icon name="HeartHandshake" />
            <strong>Keep the repair bench moving</strong>
            <p>Keep your team and learners moving forward.</p>
            <Link to="/tools/tickets">
              Support workspace <Icon name="ArrowUpRight" size={15} />
            </Link>
          </div>
          <div className="owner-profile">
            <Avatar name={session.user.name} />
            <div>
              <strong>{session.user.name}</strong>
              <small>
                {session.user.role === "Super Admin"
                  ? "Institute owner"
                  : session.user.role}
              </small>
            </div>
            <button
              className="icon-btn"
              aria-label="Sign out"
              onClick={async () => {
                await post("/auth/logout");
                setSession(null);
                navigate("/");
              }}
            >
              <Icon name="LogOut" size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="owner-content">
        <header className="owner-topbar">
          <button
            className="icon-btn mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            <Icon name="Menu" />
          </button>
          <CommandSearch can={can} />
          <div>
            <span className="india-clock">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "Asia/Kolkata",
              })}
            </span>
            <Link
              className="icon-btn"
              aria-label="Announcements"
              to="/communications"
            >
              <Icon name="Bell" size={20} />
            </Link>
            <Avatar name={session.user.name} />
          </div>
        </header>
        <main id="main" className="owner-main">
          <Routes>
            <Route
              path="/"
              element={
                can("analytics") ? (
                  <Overview />
                ) : (
                  <Navigate
                    to={
                      navigation.find((n) => can(n[3]) && n[0] !== "/")?.[0] ||
                      "/workspace"
                    }
                  />
                )
              }
            />
            <Route path="/learners" element={<Learners />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseEditor />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/practicals" element={<Practicals />} />
            <Route path="/admissions" element={<Admissions />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/reports" element={<Insights />} />
            <Route path="/revenue" element={<Reports />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/publishing" element={<Publishing />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/communications" element={<Communications />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/security" element={<Security />} />
            <Route path="/workspace" element={<Workspace can={can} />} />
            <Route path="/media" element={<Media />} />
            <Route path="/permissions" element={<Permissions />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/operations" element={<Platform />} />
            <Route path="/tools/:kind" element={<Tools />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="owner-footer">
          Built for practical skills and better repairs.
          <span>Refix India Institute · India</span>
        </footer>
      </div>
    </div>
  );
}
function RevenueChart({ data }: { data: Row[] }) {
  return (
    <div className="revenue-chart">
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#326ada" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#326ada" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 4"
            vertical={false}
            stroke="#edf0f5"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            minTickGap={35}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => "₹" + (v >= 1000 ? v / 1000 + "k" : v)}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip formatter={(v) => money(Number(v))} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#326ada"
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            name="Recorded revenue"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
function Overview() {
  const d = useData("/owner/overview"),
    a = useData("/owner/analytics?days=30");
  useEffect(() => {
    const t = setInterval(d.reload, 60000);
    return () => clearInterval(t);
  }, []);
  if (d.error) return <ErrorState error={d.error} retry={d.reload} />;
  if (!d.data) return <Loading />;
  const { counts: c, upcoming, activity } = d.data;
  return (
    <>
      <Heading
        eyebrow="REFIX INDIA / OWNER OVERVIEW"
        title="Your institute, at a glance"
        text="Your learners, repair courses and training business. One clear view."
        action={
          <Link className="btn primary" to="/courses">
            <Icon name="Plus" size={17} />
            Manage courses
          </Link>
        }
      />
      <div className="overview-welcome">
        <div>
          <span className="eyebrow">YOUR REPAIR TRAINING BUSINESS</span>
          <h2>Build skills. Run a stronger institute.</h2>
          <p>
            {c.activePaidUsers} paid learners are learning with you.
            <br />
            {c.pendingApproval + c.pendingPayment} subscription requests need
            your attention.
          </p>
          <Link to="/admissions">
            Review admissions <Icon name="ArrowRight" size={17} />
          </Link>
        </div>
        <div className="welcome-art">
          <img
            src="/images/repair-laptop.jpg"
            alt="Repair technician training at the laptop bench"
          />
          <span>
            <Icon name="GraduationCap" />
            Skills that go to work.
          </span>
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          label="Total learners"
          value={c.learners}
          note={`${c.activeUsers} activated accounts`}
          icon="UsersRound"
        />
        <Stat
          label="Active paid learners"
          value={c.activePaidUsers}
          note="Approved package + activated account"
          icon="BadgeCheck"
          accent="blue"
        />
        <Stat
          label="Online now"
          value={c.onlineUsers}
          note="Seen in the last 5 minutes"
          icon="Activity"
        />
        <Stat
          label="Renewals this week"
          value={c.renewals}
          note="Latest access ends within 7 days"
          icon="Clock3"
          accent="amber"
        />
      </div>
      <div className="dashboard-columns">
        <section className="coach-panel">
          <div className="panel-heading">
            <div>
              <h2>Revenue overview</h2>
              <p>Owner-verified payments · last 30 days</p>
            </div>
            <Link to="/reports" className="text-link">
              View reports <Icon name="ArrowUpRight" size={16} />
            </Link>
          </div>
          {a.error ? (
            <ErrorState error={a.error} retry={a.reload} />
          ) : a.data ? (
            <>
              <div className="chart-total">
                {money(a.data.revenue)}
                <small>{a.data.approvals} approved subscriptions</small>
              </div>
              <RevenueChart data={a.data.daily} />
            </>
          ) : (
            <Loading />
          )}
        </section>
        <section className="coach-panel">
          <div className="panel-heading">
            <div>
              <h2>Needs your attention</h2>
              <p>Keep every admission moving</p>
            </div>
            <span className="soft-icon">
              <Icon name="ClipboardList" />
            </span>
          </div>
          {[
            [
              "Pending payment",
              c.pendingPayment,
              "Payment reference or collection",
              "CreditCard",
            ],
            [
              "Pending approval",
              c.pendingApproval,
              "Verify payment and approve access",
              "ShieldCheck",
            ],
            [
              "Pending activation",
              c.pendingActivation,
              "Review new learner accounts",
              "UserPlus",
            ],
          ].map(([label, note, desc, icon]) => (
            <Link
              key={String(label)}
              to={
                label === "Pending activation"
                  ? "/learners?filter=pending"
                  : "/admissions"
              }
              className="attention-row"
            >
              <span className="soft-icon">
                <Icon name={String(icon)} />
              </span>
              <div>
                <strong>{label}</strong>
                <small>{desc}</small>
              </div>
              <b>{note}</b>
              <Icon name="ChevronRight" size={16} />
            </Link>
          ))}
          <p className="subtle-note">
            Subscription approval and account activation are separate. Both are
            needed for learning access.
          </p>
        </section>
      </div>
      <div className="dashboard-columns">
        <section className="coach-panel">
          <div className="panel-heading">
            <div>
              <h2>Upcoming renewals</h2>
              <p>A timely check-in makes a difference</p>
            </div>
            <Link to="/admissions?tab=renewals" className="text-link">
              View all
            </Link>
          </div>
          {upcoming.length ? (
            upcoming.slice(0, 4).map((s: Row) => (
              <div className="list-row" key={s.id}>
                <Avatar name={s.name} />
                <div>
                  <strong>{s.name}</strong>
                  <small>{s.email}</small>
                </div>
                <span className="date-pill">
                  {date(s.expires, { year: undefined })}
                </span>
              </div>
            ))
          ) : (
            <Empty
              title="No renewals due this week"
              text="Upcoming package expiries will appear here."
            />
          )}
        </section>
        <section className="coach-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Changes across your workspace</p>
            </div>
            <Link className="text-link" to="/audit">
              Audit trail
            </Link>
          </div>
          {activity.length ? (
            activity.slice(0, 4).map((r: Row) => (
              <div className="list-row" key={r.id}>
                <span className="activity-dot" />
                <div>
                  <strong>{r.action}</strong>
                  <small>
                    {r.actor} · {date(r.created)}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <Empty
              title="Your story starts here"
              text="Workspace activity will appear as you make changes."
            />
          )}
        </section>
      </div>
    </>
  );
}
function Learners() {
  const d = useData("/owner/learners"),
    toast = useToast();
  const [query, setQuery] = useState(
      new URLSearchParams(location.search).get("q") || "",
    ),
    [filter, setFilter] = useState(
      new URLSearchParams(location.search).get("filter") === "pending"
        ? "Pending activation"
        : "All",
    ),
    [selected, setSelected] = useState<Row | null>(null),
    [edit, setEdit] = useState<Row | null>(null);
  const details = useData(selected ? "/owner/learners/" + selected.id : "");
  const rows = (d.data || []).filter(
    (r: Row) =>
      (r.name + " " + r.email + " " + r.phone)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All" ||
        (filter === "Paid" && r.paid && r.status === "Active") ||
        (filter === "Online" && r.online) ||
        r.status === filter),
  );
  return (
    <>
      <Heading
        title="Your learners"
        text="Every account, subscription and learning journey."
        action={
          <button className="btn" onClick={d.reload}>
            <Icon name="RefreshCw" size={16} />
            Refresh
          </button>
        }
      />
      <div className="coach-panel">
        <div className="toolbar">
          <div className="filter-tabs" aria-label="Learner filters">
            {["All", "Paid", "Online", "Pending activation", "Blocked"].map(
              (f) => (
                <button
                  className={filter === f ? "selected" : ""}
                  key={f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ),
            )}
          </div>
          <label className="search-field">
            <Icon name="Search" size={17} />
            <input
              aria-label="Search learners"
              placeholder="Search name, email or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {d.error ? (
          <ErrorState error={d.error} retry={d.reload} />
        ) : !d.data ? (
          <Loading />
        ) : (
          <>
            <Table
              headers={[
                "Learner",
                "Account",
                "Subscription",
                "Renewal",
                "Activity",
                "",
              ]}
            >
              {rows.map((r: Row) => (
                <tr key={r.id}>
                  <td>
                    <button
                      className="person-cell"
                      onClick={() => setSelected(r)}
                    >
                      <Avatar name={r.name} />
                      <span>
                        <strong>{r.name}</strong>
                        <small>{r.email}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <Badge>{r.status}</Badge>
                  </td>
                  <td>
                    <strong>{r.subscription}</strong>
                    <small>
                      {r.paid ? "Paid package" : "Subscription review"}
                    </small>
                  </td>
                  <td>{date(r.expires)}</td>
                  <td>
                    <span className={"presence " + (r.online ? "online" : "")}>
                      {r.online ? "Online now" : "Offline"}
                    </span>
                  </td>
                  <td>
                    <button className="btn small" onClick={() => setEdit(r)}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
            {!rows.length && (
              <Empty
                title="No learners match"
                text="Try another name or filter."
              />
            )}
            <div className="table-bottom">
              {rows.length} learners · Presence updates after an authenticated
              request
            </div>
          </>
        )}
      </div>
      {edit && (
        <Modal
          title={"Manage " + edit.name}
          subtitle="Account changes take effect immediately. Deactivation and blocking revoke current sessions."
          onClose={() => setEdit(null)}
        >
          <Form
            fields={[
              {
                name: "status",
                label: "Account status",
                type: "select",
                options: [
                  "Active",
                  "Inactive",
                  "Blocked",
                  "Pending activation",
                ],
                required: true,
              },
              {
                name: "reason",
                label: "Reason for this change",
                type: "textarea",
                required: true,
              },
            ]}
            initial={{ status: edit.status }}
            onSubmit={async (v) => {
              await patch("/owner/learners/" + edit.id + "/status", v);
              setEdit(null);
              d.reload();
              toast("Learner access updated.");
            }}
          />
        </Modal>
      )}
      {selected && (
        <Modal
          title={selected.name}
          subtitle={selected.email}
          onClose={() => setSelected(null)}
          wide
        >
          {details.error ? (
            <ErrorState error={details.error} />
          ) : details.data ? (
            <>
              <div className="detail-strip">
                <Badge>{details.data.user.status}</Badge>
                <span>{details.data.user.phone || "No phone provided"}</span>
                <span>
                  {details.data.progress.filter((p: Row) => p.completed).length}{" "}
                  lessons completed
                </span>
              </div>
              <LearnerAccess
                learner={selected}
                changed={() => {
                  details.reload();
                  d.reload();
                }}
              />
              <h3>Subscriptions</h3>
              {details.data.subscriptions.length ? (
                details.data.subscriptions.map((s: Row) => (
                  <div key={s.id} className="list-row">
                    <div>
                      <strong>{s.package_name}</strong>
                      <small>
                        {date(s.starts)} – {date(s.expires)} ·{" "}
                        {money(s.paidAmount)}
                      </small>
                    </div>
                    <Badge>{s.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="muted">No approved subscription yet.</p>
              )}
              <h3>Requests</h3>
              {details.data.requests.map((r: Row) => (
                <div className="list-row" key={r.id}>
                  <div>
                    <strong>{r.package.name}</strong>
                    <small>
                      {r.payment_method} ·{" "}
                      {r.payment_reference || "No reference"}
                    </small>
                  </div>
                  <Badge>{r.status}</Badge>
                </div>
              ))}
              <h3>Assessment attempts</h3>
              {details.data.attempts.length ? (
                details.data.attempts.map((a: Row) => (
                  <div className="list-row" key={a.id}>
                    <span>{a.course_id}</span>
                    <Badge>{a.status}</Badge>
                    <strong>{a.score ?? "—"}%</strong>
                  </div>
                ))
              ) : (
                <p className="muted">No assessment attempts yet.</p>
              )}
            </>
          ) : (
            <Loading />
          )}
        </Modal>
      )}
    </>
  );
}
function Admissions() {
  const d = useData("/owner/requests"),
    subs = useData("/owner/subscriptions"),
    toast = useToast();
  const [tab, setTab] = useState(
      new URLSearchParams(location.search).get("tab") === "renewals"
        ? "Renewals"
        : "Pending approval",
    ),
    [review, setReview] = useState<Row | null>(null),
    [reject, setReject] = useState<Row | null>(null),
    [cancel, setCancel] = useState<Row | null>(null),
    [paid, setPaid] = useState(false),
    [activate, setActivate] = useState(true),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const rows = (d.data || []).filter((r: Row) => r.status === tab);
  const renewals = (subs.data || []).filter(
    (s: Row) =>
      s.status === "Active" &&
      new Date(s.expires).getTime() < Date.now() + 7 * 86400000,
  );
  return (
    <>
      <Heading
        title="Admissions & subscriptions"
        action={<BillingExport />}
        text="Verify payments, approve packages and keep renewals on track."
      />
      <div className="coach-panel">
        <div className="toolbar">
          <div className="filter-tabs">
            {[
              "Pending approval",
              "Pending payment",
              "Approved",
              "Rejected",
              "Renewals",
              "All subscriptions",
            ].map((t) => (
              <button
                className={tab === t ? "selected" : ""}
                onClick={() => setTab(t)}
                key={t}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            className="icon-btn"
            aria-label="Refresh admissions"
            onClick={() => {
              d.reload();
              subs.reload();
            }}
          >
            <Icon name="RefreshCw" size={18} />
          </button>
        </div>
        {d.error ? (
          <ErrorState error={d.error} />
        ) : !d.data ? (
          <Loading />
        ) : tab === "Renewals" || tab === "All subscriptions" ? (
          <>
            <Table
              headers={[
                "Learner",
                "Package",
                "Paid",
                "Access dates",
                "Status",
                "",
              ]}
            >
              {(tab === "Renewals" ? renewals : subs.data || []).map(
                (s: Row) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <small>{s.email}</small>
                    </td>
                    <td>{s.package_name}</td>
                    <td>{money(s.paidAmount)}</td>
                    <td>
                      {date(s.starts)}
                      <small>to {date(s.expires)}</small>
                    </td>
                    <td>
                      <Badge>{s.status}</Badge>
                    </td>
                    <td>
                      <button
                        className="btn small"
                        onClick={() => setCancel(s)}
                      >
                        {s.status === "Cancelled" ? "Restore" : "Cancel access"}
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </Table>
            {tab === "Renewals" && !renewals.length && (
              <Empty
                title="No renewals due this week"
                text="Access expiry dates will appear here."
              />
            )}
          </>
        ) : (
          <>
            <Table
              headers={[
                "Learner",
                "Package",
                "Payment",
                "Account",
                "Requested",
                "",
              ]}
            >
              {rows.map((r: Row) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <small>{r.email}</small>
                  </td>
                  <td>
                    <strong>{r.package.name}</strong>
                    <small>
                      {money(r.package.price_paise / 100)} ·{" "}
                      {r.package.validity_days} days
                    </small>
                  </td>
                  <td>
                    {r.payment_method}
                    <small>
                      {r.payment_reference || "Awaiting payment details"}
                    </small>
                  </td>
                  <td>
                    <Badge>{r.accountStatus}</Badge>
                  </td>
                  <td>{date(r.created)}</td>
                  <td>
                    {r.status.startsWith("Pending") ? (
                      <div className="inline-actions">
                        <button
                          className="btn primary small"
                          onClick={() => {
                            setReview(r);
                            setPaid(false);
                            setActivate(true);
                            setReason("");
                            setError("");
                          }}
                        >
                          Review
                        </button>
                        <button
                          className="btn small"
                          onClick={() => setReject(r)}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <Badge>{r.status}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            {!rows.length && (
              <Empty
                title="You’re all caught up"
                text={"No requests " + tab.toLowerCase() + "."}
              />
            )}
          </>
        )}
      </div>
      <p className="subtle-note">
        Payments are verified manually by your institute team. Approval records
        the payment; it does not charge a card or process a UPI transfer.
      </p>
      {review && (
        <Modal
          title="Review subscription"
          subtitle={review.name + " · " + review.package.name}
          onClose={() => setReview(null)}
        >
          <div className="review-summary">
            <strong>{money(review.package.price_paise / 100)}</strong>
            <span>{review.package.validity_days} days of access</span>
            <Badge>{review.status}</Badge>
          </div>
          <div className="note-box">
            <p>
              Payment method: <strong>{review.payment_method}</strong>
            </p>
            <p>
              Reference:{" "}
              <strong>
                {review.payment_reference || "No reference submitted"}
              </strong>
            </p>
          </div>
          {review.receipt_id && <ResourceViewer assetId={review.receipt_id} />}
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await post("/owner/requests/" + review.id + "/approve", {
                  paymentConfirmed: paid,
                  activateLearner: activate,
                  reason,
                });
                setReview(null);
                d.reload();
                subs.reload();
                toast("Subscription approved. Learning access updated.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="check-row">
              <input
                type="checkbox"
                checked={paid}
                required
                onChange={(e) => setPaid(e.target.checked)}
              />
              I have verified receipt of this payment.
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={activate}
                onChange={(e) => setActivate(e.target.checked)}
              />
              Activate the learner account as well.
            </label>
            <label>
              Review note
              <textarea
                required
                minLength={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. UPI payment verified against bank statement"
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="btn primary" disabled={busy || !paid}>
              {busy ? "Approving…" : "Approve subscription"}
            </button>
          </form>
        </Modal>
      )}
      {reject && (
        <Modal
          title="Reject request"
          subtitle={reject.name}
          onClose={() => setReject(null)}
        >
          <Form
            fields={[
              {
                name: "reason",
                label: "Reason shown to learner",
                type: "textarea",
                required: true,
              },
            ]}
            label="Reject request"
            onSubmit={async (v) => {
              await post("/owner/requests/" + reject.id + "/reject", v);
              setReject(null);
              d.reload();
              toast("Request rejected.");
            }}
          />
        </Modal>
      )}
      {cancel && (
        <Modal
          title={
            cancel.status === "Cancelled"
              ? "Restore subscription"
              : "Cancel subscription access"
          }
          subtitle={cancel.name + " · " + cancel.package_name}
          onClose={() => setCancel(null)}
        >
          <p>
            Access will be recalculated immediately. This action does not issue
            or collect a refund.
          </p>
          <Form
            fields={[
              {
                name: "reason",
                label: "Reason",
                type: "textarea",
                required: true,
              },
            ]}
            onSubmit={async (v) => {
              await patch("/owner/subscriptions/" + cancel.id, {
                ...v,
                status: cancel.status === "Cancelled" ? "Active" : "Cancelled",
              });
              setCancel(null);
              subs.reload();
              toast("Subscription access updated.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
function Packages() {
  const d = useData("/owner/packages"),
    courses = useData("/admin/courses"),
    toast = useToast();
  const [edit, setEdit] = useState<Row | null>(null),
    [packageStatus, setPackageStatus] = useState("Active"),
    [ids, setIds] = useState<string[]>([]);
  const fields: Field[] = [
    { name: "name", label: "Package name", required: true },
    { name: "price", label: "Price (₹ INR)", type: "number", required: true },
    {
      name: "validityDays",
      label: "Validity in days",
      type: "number",
      required: true,
    },
    {
      name: "description",
      label: "What learners get",
      type: "textarea",
      required: true,
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["Active", "Archived"],
      required: true,
    },
  ];
  return (
    <>
      <Heading
        title="Packages & pricing"
        text="Clear choices for learners. Flexible plans for your institute."
        action={
          <button
            className="btn primary"
            onClick={() => {
              setEdit({ price: 1499, validityDays: 90, status: "Active" });
              setIds([]);
            }}
          >
            <Icon name="Plus" size={17} />
            Create package
          </button>
        }
      />
      <div className="filter-tabs page-tabs">
        {["Active", "Archived", "All"].map((status) => (
          <button
            key={status}
            className={packageStatus === status ? "selected" : ""}
            onClick={() => setPackageStatus(status)}
          >
            {status}
          </button>
        ))}
      </div>
      {d.error ? (
        <ErrorState error={d.error} />
      ) : !d.data ? (
        <Loading />
      ) : (
        <div className="package-grid">
          {d.data
            .filter(
              (p: Row) => packageStatus === "All" || p.status === packageStatus,
            )
            .map((p: Row, i: number) => (
              <article
                key={p.id}
                className={"package-card " + (i === 2 ? "featured" : "")}
              >
                <div className="card-top">
                  <span className="soft-icon">
                    <Icon name={i === 2 ? "Sparkles" : "BookOpen"} />
                  </span>
                  <Badge>{p.status}</Badge>
                </div>
                <h2>{p.name}</h2>
                <p>{p.description}</p>
                <div className="package-price">
                  {money(p.price)}
                  <small>/ {p.validityDays} days</small>
                </div>
                <ul>
                  {p.courseIds.map((id: string) => (
                    <li key={id}>
                      <Icon name="Check" size={16} />
                      {courses.data?.find((c: Row) => c.id === id)?.title || id}
                    </li>
                  ))}
                </ul>
                <button
                  className="btn"
                  onClick={() => {
                    setEdit(p);
                    setIds(p.courseIds);
                  }}
                >
                  Edit package <Icon name="ArrowRight" size={16} />
                </button>
              </article>
            ))}
        </div>
      )}
      <p className="subtle-note">
        Prices are recorded in INR. Existing subscription requests retain the
        price and access terms shown when the learner applied.
      </p>
      {edit && (
        <Modal
          title={edit.id ? "Edit package" : "Create a package"}
          onClose={() => setEdit(null)}
        >
          <fieldset className="course-options">
            <legend>Included courses</legend>
            {courses.data
              ?.filter((c: Row) => c.coaching && c.status === "Published")
              .map((c: Row) => (
                <label className="check-row" key={c.id}>
                  <input
                    type="checkbox"
                    checked={ids.includes(c.id)}
                    onChange={(e) =>
                      setIds(
                        e.target.checked
                          ? [...ids, c.id]
                          : ids.filter((id) => id !== c.id),
                      )
                    }
                  />
                  {c.title}
                </label>
              ))}
          </fieldset>
          <Form
            fields={fields}
            initial={edit}
            onSubmit={async (v) => {
              if (!ids.length) throw new Error("Select at least one course.");
              await (edit.id
                ? patch("/owner/packages/" + edit.id, { ...v, courseIds: ids })
                : post("/owner/packages", { ...v, courseIds: ids }));
              setEdit(null);
              d.reload();
              toast("Package saved.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
const courseFields: Field[] = [
  { name: "title", label: "Course title", required: true },
  {
    name: "category",
    label: "Repair specialisation",
    type: "select",
    options: [
      "Laptop repair",
      "Mobile repair",
      "Computer hardware",
      "Soldering",
      "Electronics",
      "Workshop business",
      "Other",
    ],
    required: true,
  },
  { name: "level", label: "Skill level", required: true },
  { name: "instructor", label: "Trainer name", required: true },
  { name: "batch", label: "Batch name", required: true },
  { name: "language", label: "Teaching language", required: true },
  {
    name: "description",
    label: "About this course",
    type: "textarea",
    required: true,
  },
  {
    name: "outcomes",
    label: "Learning outcomes",
    type: "textarea",
    required: true,
  },
];
function Courses() {
  const d = useData("/admin/courses"),
    navigate = useNavigate(),
    [create, setCreate] = useState(false),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("All");
  const rows = (d.data || []).filter(
    (c: Row) =>
      c.coaching &&
      !c.legacyDemo &&
      c.title.toLowerCase().includes(query.toLowerCase()) &&
      (status === "All" || c.status === status),
  );
  return (
    <>
      <Heading
        title="Your repair course library"
        eyebrow="YOUR COURSE LIBRARY"
        text="Create, organise and publish learning that makes a difference."
        action={
          <button className="btn primary" onClick={() => setCreate(true)}>
            <Icon name="Plus" size={17} />
            Create course
          </button>
        }
      />
      <div className="toolbar standalone">
        <div className="filter-tabs">
          {["All", "Published", "Draft", "Archived"].map((s) => (
            <button
              key={s}
              className={s === status ? "selected" : ""}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Icon name="Search" size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a course"
            aria-label="Find a course"
          />
        </label>
      </div>
      {d.error ? (
        <ErrorState error={d.error} />
      ) : !d.data ? (
        <Loading />
      ) : (
        <div className="owner-course-grid">
          {rows.map((c: Row) => (
            <Link
              className="owner-course-card"
              key={c.id}
              to={"/courses/" + c.id}
            >
              <div className="course-image-wrap">
                <CoursePhoto course={c} />
                <span className="image-badge">{c.category}</span>
              </div>
              <div className="course-card-body">
                <div className="card-top">
                  <span className="eyebrow">{c.batch || c.level}</span>
                  <Badge>{c.status}</Badge>
                </div>
                <h2>{c.title}</h2>
                <p>{c.description}</p>
                <div className="faculty-line">
                  <Avatar name={c.instructor} />
                  <span>
                    {c.instructor}
                    <small>{c.language}</small>
                  </span>
                </div>
                <div className="course-card-footer">
                  <span>Version {c.version || "Draft"}</span>
                  <strong>
                    Manage course <Icon name="ArrowUpRight" size={16} />
                  </strong>
                </div>
              </div>
            </Link>
          ))}
          {!rows.length && (
            <Empty
              title="Start your next course"
              text="Create a draft, upload lessons and publish when you’re ready."
            />
          )}
        </div>
      )}
      {create && (
        <Modal
          title="Create a new course"
          subtitle="Start with the essentials. Add lessons and resources next."
          onClose={() => setCreate(false)}
          wide
        >
          <Form
            fields={courseFields}
            initial={{
              category: "Laptop repair",
              level: "Beginner",
              language: "Hindi + English",
            }}
            label="Create course draft"
            onSubmit={async (v) => {
              const c = await post("/admin/courses", {
                ...v,
                access: "Restricted",
              });
              navigate("/courses/" + c.id);
            }}
          />
        </Modal>
      )}
    </>
  );
}
function CourseEditor() {
  const { id } = useParams(),
    all = useData("/admin/courses"),
    lessons = useData("/admin/courses/" + id + "/lessons"),
    assets = useData("/owner/assets"),
    toast = useToast();
  const [tab, setTab] = useState("Curriculum"),
    [edit, setEdit] = useState(false),
    [lesson, setLesson] = useState<Row | null>(null),
    [preview, setPreview] = useState(""),
    [assetIds, setAssetIds] = useState<string[]>([]),
    [checks, setChecks] = useState<Row[] | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const c = all.data?.find((x: Row) => x.id === id);
  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      all.reload();
      lessons.reload();
      toast(message);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  if (all.error) return <ErrorState error={all.error} />;
  if (!c) return <Loading />;
  const editable = !["Published", "Archived"].includes(c.status);
  return (
    <>
      <Link className="back-link" to="/courses">
        <Icon name="ArrowLeft" size={16} />
        All courses
      </Link>
      <Heading
        eyebrow={c.category + " · " + c.batch}
        title={c.title}
        text={"Version " + c.version + " · " + c.language}
        action={
          <div className="inline-actions">
            <Badge>{c.status}</Badge>
            {c.status === "Archived" ? null : !editable ? (
              <button
                className="btn primary"
                onClick={() =>
                  run(
                    () => post("/admin/courses/" + id + "/new-version"),
                    "New draft created. Existing learners retain their published version.",
                  )
                }
              >
                Create new version
              </button>
            ) : (
              <button
                className="btn primary"
                onClick={async () => {
                  try {
                    setChecks(
                      await post("/admin/courses/" + id + "/preflight"),
                    );
                  } catch (e) {
                    toast((e as Error).message, "error");
                  }
                }}
              >
                <Icon name="ShieldCheck" size={16} />
                Review & publish
              </button>
            )}
          </div>
        }
      />
      <CourseControls
        course={c}
        lessons={lessons.data || []}
        changed={() => {
          all.reload();
          lessons.reload();
        }}
      />
      <div className="filter-tabs page-tabs">
        {["Curriculum", "Course details", "Cover image"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Curriculum" ? (
        <section className="coach-panel">
          <div className="panel-heading">
            <div>
              <h2>Lessons & resources</h2>
              <p>
                {editable
                  ? "Add your teaching, chapter notes and practice."
                  : "Published content is preserved for enrolled learners."}
              </p>
            </div>
            {editable && (
              <button
                className="btn"
                onClick={() => {
                  setLesson({
                    type: "Reading",
                    duration: 15,
                    module: "01 · Getting started",
                    rights: false,
                    captions: false,
                  });
                  setAssetIds([]);
                }}
              >
                <Icon name="Plus" size={17} />
                Add lesson
              </button>
            )}
          </div>
          {lessons.error ? (
            <ErrorState error={lessons.error} />
          ) : !lessons.data ? (
            <Loading />
          ) : lessons.data.length ? (
            lessons.data
              .sort((a: Row, b: Row) => a.position - b.position)
              .map((l: Row, i: number) => (
                <div className="curriculum-row" key={l.id}>
                  <span className="lesson-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="soft-icon">
                    <Icon
                      name={
                        l.type === "Video"
                          ? "Video"
                          : l.type === "Image"
                            ? "Image"
                            : "FileText"
                      }
                    />
                  </span>
                  <div>
                    <small>{l.module}</small>
                    <strong>{l.title}</strong>
                    <small>
                      {l.type} · {l.duration} min · {l.assetIds?.length || 0}{" "}
                      resources
                    </small>
                  </div>
                  {l.assetIds?.length > 0 && (
                    <button
                      className="btn small"
                      onClick={() => setPreview(l.assetIds[0])}
                    >
                      Preview
                    </button>
                  )}
                  {editable && (
                    <button
                      className="icon-btn"
                      aria-label={"Edit " + l.title}
                      onClick={() => {
                        setLesson(l);
                        setAssetIds(l.assetIds || []);
                      }}
                    >
                      <Icon name="Pencil" size={17} />
                    </button>
                  )}
                </div>
              ))
          ) : (
            <Empty
              title="Your first lesson starts here"
              text="Add a reading, upload a lecture or share a chapter workbook."
            />
          )}
        </section>
      ) : tab === "Course details" ? (
        <section className="coach-panel course-description">
          <div className="panel-heading">
            <h2>Course essentials</h2>
            {editable && (
              <button className="btn" onClick={() => setEdit(true)}>
                Edit details
              </button>
            )}
          </div>
          <p>{c.description}</p>
          <h3>What learners will learn</h3>
          <p>{c.outcomes}</p>
          {c.status === "Published" && c.version > 1 && (
            <div className="note-box">
              <h3>Share the latest version with current learners</h3>
              <p>
                Existing enrolments keep their previous version until you
                upgrade them. Lesson progress is retained.
              </p>
              <button className="btn" onClick={() => setUpgrade(true)}>
                Update learner access
              </button>
            </div>
          )}
          <div className="detail-strip">
            <span>Faculty: {c.instructor}</span>
            <span>Level: {c.level}</span>
            <span>Batch: {c.batch}</span>
          </div>
        </section>
      ) : (
        <section className="coach-panel cover-editor">
          <CoursePhoto course={c} />
          <div>
            <h2>A welcoming first impression</h2>
            <p>Use a clear, relevant photo for this course.</p>
            {editable ? (
              <AssetUpload
                onUpload={async (a) => {
                  if (!a.type.startsWith("image/")) {
                    toast("Choose an image for your course cover.", "error");
                    return;
                  }
                  await patch("/admin/courses/" + id, {
                    thumbnailAssetId: a.id,
                  });
                  all.reload();
                  assets.reload();
                  toast("Course image updated.");
                }}
              />
            ) : (
              <p className="muted">
                Create a draft version to update the cover.
              </p>
            )}
          </div>
        </section>
      )}
      {edit && (
        <Modal title="Edit course details" onClose={() => setEdit(false)} wide>
          <Form
            fields={courseFields}
            initial={c}
            onSubmit={async (v) => {
              await patch("/admin/courses/" + id, {
                ...v,
                revision: c.revision || 1,
              });
              setEdit(false);
              all.reload();
              toast("Course details saved.");
            }}
          />
        </Modal>
      )}
      {lesson && (
        <Modal
          title={lesson.id ? "Edit lesson" : "Add a lesson"}
          subtitle="Upload a resource, attach it below, and add accessible reading notes or a transcript."
          onClose={() => setLesson(null)}
          wide
        >
          <AssetUpload
            onUpload={(a) => {
              setAssetIds((ids) => [...ids, a.id]);
              assets.reload();
            }}
          />
          <fieldset className="resource-picker">
            <legend>Attached resources ({assetIds.length})</legend>
            {assets.data?.map((a: Row) => (
              <label className="check-row" key={a.id}>
                <input
                  type="checkbox"
                  checked={assetIds.includes(a.id)}
                  onChange={(e) =>
                    setAssetIds(
                      e.target.checked
                        ? [...assetIds, a.id]
                        : assetIds.filter((id) => id !== a.id),
                    )
                  }
                />
                <Icon
                  name={a.type.startsWith("video/") ? "Video" : "FileText"}
                  size={16}
                />
                {a.title}
              </label>
            ))}
          </fieldset>
          <Form
            fields={[
              { name: "title", label: "Lesson title", required: true },
              ...(!lesson.id
                ? [
                    {
                      name: "module",
                      label: "Chapter or module",
                      required: true,
                    },
                  ]
                : []),
              {
                name: "type",
                label: "Lesson format",
                type: "select",
                options: ["Reading", "Video", "Document", "Image"],
                required: true,
              },
              {
                name: "duration",
                label: "Study time (minutes)",
                type: "number",
                required: true,
              },
              {
                name: "content",
                label: "Reading notes or video transcript",
                type: "textarea",
                required: true,
              },
              {
                name: "rights",
                label: "I have permission to publish this lesson",
                type: "checkbox",
              },
              {
                name: "captions",
                label: "Transcript is complete for any video or audio",
                type: "checkbox",
              },
            ]}
            initial={lesson}
            onSubmit={async (v) => {
              await (lesson.id
                ? patch("/admin/lessons/" + lesson.id, { ...v, assetIds })
                : post("/admin/courses/" + id + "/lessons", {
                    ...v,
                    assetIds,
                    rights: !!v.rights,
                    captions: !!v.captions,
                  }));
              setLesson(null);
              lessons.reload();
              toast("Lesson saved.");
            }}
          />
        </Modal>
      )}
      {preview && (
        <Modal title="Resource preview" onClose={() => setPreview("")} wide>
          <ResourceViewer assetId={preview} />
        </Modal>
      )}
      {checks && (
        <Modal
          title="Ready to publish?"
          subtitle="Review the course and confirm the checklist before learners can access it through a package."
          onClose={() => setChecks(null)}
        >
          {checks.map((r: Row) => (
            <div key={r.label} className="checklist-row">
              <Icon name={r.passed ? "CircleCheck" : "CircleAlert"} />
              <span>{r.label}</span>
              <Badge>{r.passed ? "Ready" : "Needs review"}</Badge>
            </div>
          ))}
          <div className="modal-actions">
            {c.status !== "Approved" && (
              <button
                className="btn"
                onClick={async () => {
                  try {
                    await patch("/admin/courses/" + id, { status: "Approved" });
                    setChecks(
                      await post("/admin/courses/" + id + "/preflight"),
                    );
                    all.reload();
                  } catch (e) {
                    toast((e as Error).message, "error");
                  }
                }}
              >
                Confirm owner review
              </button>
            )}
            <button
              className="btn primary"
              disabled={checks.some((r) => !r.passed)}
              onClick={() =>
                run(async () => {
                  await post("/admin/courses/" + id + "/publish");
                  setChecks(null);
                }, "Course published. Add it to a package to offer learner access.")
              }
            >
              Publish course
            </button>
          </div>
        </Modal>
      )}
      {upgrade && (
        <Modal
          title="Upgrade current learners"
          subtitle={
            "Move enrolled learners to published version " +
            c.version +
            ". Existing lesson progress is retained; newly added lessons begin incomplete."
          }
          onClose={() => setUpgrade(false)}
        >
          <Form
            fields={[
              {
                name: "confirm",
                label:
                  "I reviewed the new curriculum and want to update learner access.",
                type: "checkbox",
              },
              {
                name: "reason",
                label: "Reason for this update",
                type: "textarea",
                required: true,
              },
            ]}
            label="Update learner access"
            onSubmit={async (v) => {
              if (!v.confirm)
                throw new Error("Confirm the curriculum review first.");
              const result = await post(
                "/owner/courses/" + id + "/upgrade-enrolments",
                v,
              );
              setUpgrade(false);
              toast(
                result.updated +
                  " learners moved to version " +
                  result.version +
                  ".",
              );
            }}
          />
        </Modal>
      )}
    </>
  );
}
function Reports() {
  const [days, setDays] = useState("30"),
    d = useData("/owner/analytics?days=" + days);
  return (
    <>
      <Heading
        title="A clearer picture of progress"
        eyebrow="INSTITUTE ANALYTICS"
        text="Understand admissions, revenue and learning activity."
        action={
          <select
            aria-label="Report period"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        }
      />
      {d.error ? (
        <ErrorState error={d.error} />
      ) : !d.data ? (
        <Loading />
      ) : (
        <>
          <div className="stats-grid">
            <Stat
              label="Recorded revenue"
              value={money(d.data.revenue)}
              icon="CreditCard"
            />
            <Stat
              label="Approved subscriptions"
              value={d.data.approvals}
              icon="BadgeCheck"
            />
            <Stat
              label="New requests"
              value={d.data.requests}
              icon="UserPlus"
              accent="blue"
            />
            <Stat
              label="Request approval rate"
              value={d.data.conversion + "%"}
              note="Requests approved in this period"
              icon="ChartNoAxesCombined"
            />
          </div>
          <section className="coach-panel">
            <div className="panel-heading">
              <div>
                <h2>Revenue over time</h2>
                <p>Owner-verified payments in INR</p>
              </div>
            </div>
            <RevenueChart data={d.data.daily} />
          </section>
          <section className="coach-panel">
            <div className="panel-heading">
              <div>
                <h2>Course engagement</h2>
                <p>
                  Published course enrolments and acknowledged lesson
                  completions
                </p>
              </div>
            </div>
            <Table
              headers={[
                "Course",
                "Enrolled learners",
                "Lessons",
                "Completions",
                "Completion rate",
              ]}
            >
              {d.data.courses.map((c: Row) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    <small>{c.category}</small>
                  </td>
                  <td>{c.learners}</td>
                  <td>{c.lessons}</td>
                  <td>{c.completedLessons}</td>
                  <td>
                    <div className="inline-progress">
                      <div className="progress-track">
                        <span
                          style={{ width: Math.min(c.completion, 100) + "%" }}
                        />
                      </div>
                      {c.completion}%
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </section>
          <p className="subtle-note">{d.data.definition}</p>
        </>
      )}
    </>
  );
}
function Workspace({ can }: { can: (s: string) => boolean }) {
  const [section, setSection] = useState("Learning");
  const tools = [
    [
      "Learning",
      "/publishing",
      "Publishing & review",
      "Draft feedback, readiness and version history.",
      "BookOpenCheck",
      "courses",
    ],
    [
      "Learning",
      "/assessments",
      "Assessment rules",
      "Versioned timers, attempts, pass marks and completion.",
      "ClipboardList",
      "assessments",
    ],
    [
      "Learning",
      "/media",
      "Media library",
      "Private videos, images and learning documents.",
      "Images",
      "media",
    ],
    [
      "Learning",
      "/tools/questions",
      "Question bank",
      "Course-specific questions and protected answer keys.",
      "CircleHelp",
      "assessments",
    ],
    [
      "Learning",
      "/tools/assignments",
      "Assignments",
      "Course-linked work and submission instructions.",
      "ClipboardList",
      "assessments",
    ],
    [
      "Learning",
      "/tools/submissions",
      "Submission reviews",
      "Grades, feedback and returned work.",
      "ListChecks",
      "assessments",
    ],
    [
      "Learning",
      "/tools/sessions",
      "Live classes",
      "Schedules and approved HTTPS join links.",
      "Video",
      "sessions",
    ],
    [
      "Learning",
      "/tools/certificates",
      "Certificates",
      "Issued credentials, verification and revocation.",
      "Award",
      "certificates",
    ],
    [
      "People",
      "/directory",
      "People & imports",
      "Search, validated CSV imports and invitation links.",
      "UsersRound",
      "users",
    ],
    [
      "People",
      "/permissions",
      "Team & permissions",
      "Staff accounts and explicit permission grants.",
      "ShieldCheck",
      "permissions",
    ],
    [
      "People",
      "/communications",
      "Announcements",
      "Scoped in-app updates and scheduled publishing.",
      "Megaphone",
      "notifications",
    ],
    [
      "People",
      "/tools/tickets",
      "Learner support",
      "Authorised learner cases and responses.",
      "LifeBuoy",
      "tickets",
    ],
    [
      "Governance",
      "/security",
      "Security & sessions",
      "Authenticator setup, recovery codes and staff sessions.",
      "LockKeyhole",
      "any",
    ],
    [
      "Governance",
      "/governance",
      "Privacy & retention",
      "Verified requests, export and retention decisions.",
      "ShieldCheck",
      "privacy",
    ],
    [
      "Governance",
      "/audit",
      "Audit trail",
      "Administrative changes and authorised exports.",
      "Activity",
      "audit",
    ],
    [
      "Governance",
      "/settings",
      "Institute settings",
      "Institute identity and payment instructions.",
      "Building2",
      "settings",
    ],
    [
      "Operations",
      "/operations",
      "Platform operations",
      "Connected services, feature switches and incidents.",
      "Settings2",
      "settings",
    ],
    [
      "Operations",
      "/reports",
      "Learning insights",
      "Course and cohort reports with saved filters.",
      "ChartNoAxesCombined",
      "analytics",
    ],
    [
      "Operations",
      "/revenue",
      "Revenue reports",
      "Verified payments, renewals and subscription trends.",
      "CreditCard",
      "analytics",
    ],
    [
      "Operations",
      "/tools/incidents",
      "Incident records",
      "Investigations, severity and resolution notes.",
      "Activity",
      "operations",
    ],
  ];
  const sections = [
    ...new Set(tools.filter((t) => can(t[5])).map((t) => t[0])),
  ];
  const active = sections.includes(section) ? section : sections[0];
  return (
    <>
      <Heading
        title="Institute control centre"
        text="Focused workspaces for learning, people, governance and operations."
      />
      <div className="filter-tabs page-tabs">
        {sections.map((s) => (
          <button
            key={s}
            className={s === active ? "selected" : ""}
            onClick={() => setSection(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="workspace-grid">
        {tools
          .filter((t) => t[0] === active && can(t[5]))
          .map(([, path, title, text, icon]) => (
            <Link to={path} key={path} className="workspace-card">
              <span className="soft-icon">
                <Icon name={icon} size={25} />
              </span>
              <h2>{title}</h2>
              <p>{text}</p>
              <Icon name="ArrowUpRight" size={18} />
            </Link>
          ))}
      </div>
    </>
  );
}
function Media() {
  const d = useData("/owner/assets"),
    [preview, setPreview] = useState("");
  return (
    <>
      <Heading
        title="Your teaching, in every format"
        eyebrow="MEDIA LIBRARY"
        text="Upload once. Attach to the lessons where it belongs."
      />
      <section className="coach-panel">
        <AssetUpload onUpload={d.reload} />
      </section>
      {d.error ? (
        <ErrorState error={d.error} />
      ) : !d.data ? (
        <Loading />
      ) : (
        <section className="coach-panel">
          <Table headers={["Resource", "Format", "Size", "Added", ""]}>
            {d.data.map((a: Row) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.title}</strong>
                </td>
                <td>{a.type.split("/").at(-1)}</td>
                <td>{(a.size / 1048576).toFixed(1)} MB</td>
                <td>{date(a.created)}</td>
                <td>
                  <button
                    className="btn small"
                    onClick={() => setPreview(a.id)}
                  >
                    Preview
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </section>
      )}
      {preview && (
        <Modal title="Resource preview" onClose={() => setPreview("")} wide>
          <ResourceViewer assetId={preview} />
        </Modal>
      )}
    </>
  );
}
function Permissions() {
  const [creatingStaff, setCreatingStaff] = useState(false);
  const d = useData("/owner/roles"),
    toast = useToast(),
    [edit, setEdit] = useState<Row | null>(null),
    [perms, setPerms] = useState<string[]>([]),
    [staff, setStaff] = useState<Row | null>(null);
  const [staffStatus, setStaffStatus] = useState<Row | null>(null);
  return (
    <>
      <Heading
        title="The right access for every role"
        eyebrow="TEAM & PERMISSIONS"
        text="Control what your faculty, admissions and support teams can manage."
        action={
          <div className="inline-actions">
            <button className="btn" onClick={() => setCreatingStaff(true)}>
              <Icon name="UserPlus" size={17} />
              Add staff
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setEdit({});
                setPerms([]);
              }}
            >
              <Icon name="Plus" size={17} />
              Create role
            </button>
          </div>
        }
      />
      {d.error ? (
        <ErrorState error={d.error} />
      ) : !d.data ? (
        <Loading />
      ) : (
        <>
          <section className="coach-panel">
            <div className="panel-heading">
              <h2>Team members</h2>
            </div>
            <Table
              headers={[
                "Staff member",
                "Base role",
                "Custom access",
                "Role",
                "Account",
              ]}
            >
              {d.data.staff.map((u: Row) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </td>
                  <td>
                    {u.role}
                    <small>{u.status}</small>
                  </td>
                  <td>
                    {d.data.roles.find((r: Row) => r.id === u.role_id)?.name ||
                      "Base permissions"}
                  </td>
                  <td>
                    {u.role === "Super Admin" ? (
                      <Badge>Owner</Badge>
                    ) : (
                      <button className="btn small" onClick={() => setStaff(u)}>
                        Manage access
                      </button>
                    )}
                  </td>
                  <td>
                    {u.role !== "Super Admin" && (
                      <button
                        className="btn small"
                        onClick={() => setStaffStatus(u)}
                      >
                        Account status
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </section>
          <section className="coach-panel">
            <div className="panel-heading">
              <div>
                <h2>Custom roles</h2>
                <p>
                  Saved changes sign affected staff out so permissions take
                  effect.
                </p>
              </div>
            </div>
            {d.data.roles.length ? (
              d.data.roles.map((r: Row) => (
                <div className="list-row" key={r.id}>
                  <span className="soft-icon">
                    <Icon name="ShieldCheck" />
                  </span>
                  <div>
                    <strong>{r.name}</strong>
                    <small>
                      {r.permissions.join(", ") || "No workspace permissions"}
                    </small>
                  </div>
                  <button
                    className="btn small"
                    onClick={() => {
                      setEdit(r);
                      setPerms(r.permissions);
                    }}
                  >
                    Edit
                  </button>
                </div>
              ))
            ) : (
              <Empty
                title="Build a role for your team"
                text="For example, an admissions role with learner and billing access."
              />
            )}
          </section>
        </>
      )}
      {edit && (
        <Modal
          title={edit.id ? "Edit role" : "Create a role"}
          onClose={() => setEdit(null)}
        >
          <fieldset className="permission-options">
            <legend>Workspace permissions</legend>
            {d.data?.areas.map((p: string) => (
              <label className="check-row" key={p}>
                <input
                  type="checkbox"
                  checked={perms.includes(p)}
                  onChange={(e) =>
                    setPerms(
                      e.target.checked
                        ? [...perms, p]
                        : perms.filter((v) => v !== p),
                    )
                  }
                />
                {p[0].toUpperCase() + p.slice(1)}
              </label>
            ))}
          </fieldset>
          <Form
            fields={[{ name: "name", label: "Role name", required: true }]}
            initial={edit}
            onSubmit={async (v) => {
              await (edit.id
                ? patch("/owner/roles/" + edit.id, { ...v, permissions: perms })
                : post("/owner/roles", { ...v, permissions: perms }));
              setEdit(null);
              d.reload();
              toast("Role saved.");
            }}
          />
        </Modal>
      )}
      {staff && (
        <Modal
          title={"Access for " + staff.name}
          subtitle="The institute owner must confirm their password. This signs the staff member out."
          onClose={() => setStaff(null)}
        >
          <Form
            fields={[
              {
                name: "roleId",
                label: "Role",
                type: "select",
                options: [
                  { label: "Use base permissions", value: "base" },
                  ...(d.data?.roles || []).map((r: Row) => ({
                    label: r.name,
                    value: r.id,
                  })),
                ],
                required: true,
              },
              {
                name: "password",
                label: "Owner password",
                type: "password",
                required: true,
              },
              {
                name: "reason",
                label: "Reason",
                type: "textarea",
                required: true,
              },
            ]}
            initial={{ roleId: staff.role_id || "base" }}
            onSubmit={async (v) => {
              await post("/owner/staff/" + staff.id + "/role", {
                ...v,
                roleId: v.roleId === "base" ? null : v.roleId,
              });
              setStaff(null);
              d.reload();
              toast("Staff access updated.");
            }}
          />
        </Modal>
      )}
      {creatingStaff && (
        <Modal
          title="Add a team member"
          subtitle="Create a sign-in account and share the initial password privately. No invitation email is sent."
          onClose={() => setCreatingStaff(false)}
        >
          <Form
            fields={[
              { name: "name", label: "Full name", required: true },
              {
                name: "email",
                label: "Staff email",
                type: "email",
                required: true,
              },
              {
                name: "role",
                label: "Base role",
                type: "select",
                options: ["Instructor", "Support", "Finance", "Tenant Admin"],
                required: true,
              },
              {
                name: "initialPassword",
                label: "Initial staff password (12+ characters)",
                type: "password",
                required: true,
              },
              {
                name: "password",
                label: "Confirm owner password",
                type: "password",
                required: true,
              },
              { name: "reason", label: "Reason for access", required: true },
            ]}
            onSubmit={async (v) => {
              await post("/owner/staff", v);
              setCreatingStaff(false);
              d.reload();
              toast("Staff account created. Assign a custom role if needed.");
            }}
            label="Create staff account"
          />
        </Modal>
      )}
      {staffStatus && (
        <Modal
          title={"Account access · " + staffStatus.name}
          subtitle="Blocking or deactivating revokes existing sessions."
          onClose={() => setStaffStatus(null)}
        >
          <Form
            fields={[
              {
                name: "status",
                label: "Staff account status",
                type: "select",
                options: ["Active", "Inactive", "Blocked"],
                required: true,
              },
              {
                name: "reason",
                label: "Reason for this change",
                type: "textarea",
                required: true,
              },
            ]}
            initial={{ status: staffStatus.status }}
            onSubmit={async (v) => {
              await patch("/admin/users/" + staffStatus.id, v);
              setStaffStatus(null);
              d.reload();
              toast("Staff account updated.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
function Settings() {
  const d = useData("/owner/settings"),
    toast = useToast();
  return (
    <>
      <Heading
        title="Institute settings"
        eyebrow="INSTITUTE SETTINGS"
        text="The details learners see in their app and subscription journey."
      />
      <section className="coach-panel settings-panel">
        {d.error ? (
          <ErrorState error={d.error} />
        ) : !d.data ? (
          <Loading />
        ) : (
          <Form
            fields={[
              { name: "name", label: "Institute name", required: true },
              { name: "tagline", label: "Tagline" },
              { name: "city", label: "City & state" },
              { name: "supportPhone", label: "Support phone (+91)" },
              {
                name: "upiId",
                label: "UPI ID",
                help: "Optional. Learners pay through their UPI app; your team verifies each payment.",
              },
              {
                name: "paymentInstructions",
                label: "Payment instructions",
                type: "textarea",
                required: true,
              },
            ]}
            initial={d.data}
            onSubmit={async (v) => {
              await patch("/owner/settings", {
                ...v,
                upiId: v.upiId || "",
                tagline: v.tagline || "",
                city: v.city || "",
                supportPhone: v.supportPhone || "",
              });
              d.reload();
              toast("Institute details saved.");
            }}
          />
        )}
      </section>
    </>
  );
}
function Tools() {
  const { kind } = useParams();
  return [
    "certificates",
    "incidents",
    "questions",
    "assignments",
    "submissions",
    "notifications",
    "tickets",
    "sessions",
  ].includes(kind || "") ? (
    <ResourcePage key={kind} kind={kind!} />
  ) : (
    <Navigate to="/workspace" />
  );
}
