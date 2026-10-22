import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  api,
  post,
  patch,
  Icon,
  Brand,
  Avatar,
  Badge,
  Empty,
  Loading,
  ErrorState,
  useData,
  useToast,
  Modal,
  Form,
  Art,
  download,
  csv,
  PageHeading,
} from "./ui";
import type { Row, Field } from "./ui";
import { configs } from "./resources";
const navigation = [
  {
    label: "WORKSPACE",
    items: [
      ["/", "Overview", "LayoutDashboard", "analytics"],
      ["/courses", "Courses", "BookOpen", "courses"],
      ["/users", "People", "UsersRound", "users"],
      ["/groups", "Groups & cohorts", "Network", "groups"],
    ],
  },
  {
    label: "LEARNING EXPERIENCE",
    items: [
      ["/questions", "Question bank", "CircleHelp", "assessments"],
      ["/assignments", "Assignments", "ClipboardList", "assessments"],
      ["/submissions", "Review workspace", "ListChecks", "assessments"],
      ["/media", "Media library", "Images", "media"],
      ["/sessions", "Live learning", "Video", "sessions"],
      ["/discussions", "Community", "MessagesSquare", "discussions"],
      ["/certificates", "Certificates", "Award", "certificates"],
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      ["/analytics", "Analytics & reports", "ChartNoAxesCombined", "analytics"],
      ["/intelligence", "AI studio", "Sparkles", "ai"],
      ["/notifications", "Communication", "Megaphone", "notifications"],
    ],
  },
  {
    label: "PLATFORM",
    items: [
      ["/tenants", "Organisations", "Building2", "tenants"],
      ["/plans", "Plans & billing", "CreditCard", "plans"],
      ["/operations", "System health", "Activity", "operations"],
      ["/audit", "Audit trail", "ShieldCheck", "audit"],
      ["/privacy", "Privacy requests", "LockKeyhole", "privacy"],
    ],
  },
];
export default function App() {
  const [user, setUser] = useState<Row | null>(null),
    [permissions, setPermissions] = useState<string[]>([]),
    [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false),
    [command, setCommand] = useState(false),
    [query, setQuery] = useState("");
  const location = useLocation(),
    navigate = useNavigate(),
    toast = useToast();
  useEffect(() => {
    api("/me")
      .then((d) => {
        setUser(d.user);
        setPermissions(d.permissions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    setMobileNav(false);
  }, [location.pathname]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const allowed = (area: string) =>
    permissions.includes("*") || permissions.includes(area);
  if (loading) return <Loading />;
  if (!user)
    return (
      <Login
        onLogin={(d) => {
          setUser(d.user);
          setPermissions(d.permissions);
        }}
      />
    );
  const allNav = navigation
    .flatMap((g) => g.items)
    .filter((n) => allowed(n[3]));
  const title =
    allNav.find((n) => n[0] === location.pathname)?.[1] ||
    configs[location.pathname.slice(1)]?.title ||
    "Workspace";
  return (
    <div className="admin-shell">
      <aside className={"sidebar " + (mobileNav ? "open" : "")}>
        <Link to="/" aria-label="Qubit home">
          <Brand />
        </Link>
        <span className="workspace-label">
          CONTROL PANEL <span>PROTOTYPE</span>
        </span>
        <div className="org-switch">
          <span className="org-icon">
            <Icon name="Shapes" size={21} />
          </span>
          <div>
            <strong>Qubit Institute</strong>
            <small>Learning, connected.</small>
          </div>
          <Icon name="ChevronsUpDown" size={15} />
        </div>
        <nav>
          {navigation.map((g) => (
            <div className="nav-group" key={g.label}>
              <span>{g.label}</span>
              {g.items
                .filter((n) => allowed(n[3]))
                .map((n) => (
                  <NavLink key={n[0]} to={n[0]} end={n[0] === "/"}>
                    <Icon name={n[2]} size={19} />
                    {n[1]}
                    {n[1] === "AI studio" && <i className="nav-new">NEW</i>}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/tickets">
            <Icon name="LifeBuoy" size={19} />
            Help & support
          </NavLink>
          {allowed("settings") && (
            <NavLink to="/settings">
              <Icon name="Settings2" size={19} />
              Settings
            </NavLink>
          )}
          <button className="user-chip" onClick={() => navigate("/account")}>
            <Avatar name={user.name} />
            <span>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </span>
            <Icon name="ChevronsUpDown" size={16} />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <div className="nav-scrim" onClick={() => setMobileNav(false)} />
      )}
      <div className="admin-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Toggle menu"
            >
              <Icon name="Menu" />
            </button>
            <Icon name="PanelLeft" size={18} />
            <span className="crumb-divider" />
            <span>Workspace</span>
            <Icon name="ChevronRight" size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <button
              aria-label="Search workspace"
              className="command-button"
              onClick={() => setCommand(true)}
            >
              <Icon name="Search" size={17} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="environment-dot">Demo workspace</span>
            <button
              className="icon-btn"
              aria-label="View communication"
              onClick={() => navigate("/notifications")}
            >
              <Icon name="Bell" />
              <i className="notification-dot" />
            </button>
            <button
              className="avatar-button"
              aria-label="Open your account"
              onClick={() => navigate("/account")}
            >
              <Avatar name={user.name} />
            </button>
          </div>
        </header>
        <main className="page-content">
          <Routes>
            <Route
              path="/"
              element={
                allowed("analytics") ? (
                  <Dashboard user={user} />
                ) : (
                  <Navigate to={allNav[0]?.[0] || "/account"} />
                )
              }
            />
            <Route
              path="/courses"
              element={
                <Guard ok={allowed("courses")}>
                  <Courses />
                </Guard>
              }
            />
            <Route
              path="/users"
              element={
                <Guard ok={allowed("users")}>
                  <People />
                </Guard>
              }
            />
            <Route
              path="/roles"
              element={
                <Guard ok={allowed("users")}>
                  <Roles />
                </Guard>
              }
            />
            <Route
              path="/analytics"
              element={
                <Guard ok={allowed("analytics")}>
                  <Analytics />
                </Guard>
              }
            />
            <Route
              path="/intelligence"
              element={
                <Guard ok={allowed("ai")}>
                  <Intelligence />
                </Guard>
              }
            />
            <Route
              path="/operations"
              element={
                <Guard ok={allowed("operations")}>
                  <Operations />
                </Guard>
              }
            />
            <Route
              path="/audit"
              element={
                <Guard ok={allowed("audit")}>
                  <Audit />
                </Guard>
              }
            />
            <Route
              path="/settings"
              element={
                <Guard ok={allowed("settings")}>
                  <Settings />
                </Guard>
              }
            />
            <Route
              path="/account"
              element={
                <Account
                  user={user}
                  onLogout={async () => {
                    await post("/auth/logout");
                    setUser(null);
                  }}
                />
              }
            />
            {Object.entries(configs).map(([key]) => (
              <Route
                key={key}
                path={"/" + key}
                element={<ResourcePage kind={key} />}
              />
            ))}
            <Route
              path="*"
              element={
                <Empty
                  title="This page has wandered off"
                  text="Let’s get you back to your workspace."
                  action={
                    <Link className="btn primary" to="/">
                      Back to overview
                    </Link>
                  }
                />
              }
            />
          </Routes>
          <footer className="page-footer">
            <span>A little learning. Limitless possibility.</span>
            <span>
              Qubit LMS <span>·</span> Prototype v0.1
            </span>
          </footer>
        </main>
      </div>
      {command && (
        <Modal
          title="Where would you like to go?"
          subtitle="Search your permitted workspace areas."
          onClose={() => setCommand(false)}
        >
          <div className="command-search">
            <Icon name="Search" />
            <input
              autoFocus
              aria-label="Search workspace"
              placeholder="Courses, learners, analytics…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="command-results">
            {[
              ...allNav,
              ["/settings", "Settings", "Settings2", "settings"],
              ["/tickets", "Support inbox", "LifeBuoy", "tickets"],
            ]
              .filter(
                (n) =>
                  allowed(n[3]) &&
                  n[1].toLowerCase().includes(query.toLowerCase()),
              )
              .map((n) => (
                <button
                  key={n[0]}
                  onClick={() => {
                    navigate(n[0]);
                    setCommand(false);
                    setQuery("");
                  }}
                >
                  <Icon name={n[2]} />
                  <span>{n[1]}</span>
                  <Icon name="ArrowUpRight" size={17} />
                </button>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
function Guard({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return ok ? (
    <>{children}</>
  ) : (
    <Empty
      icon="LockKeyhole"
      title="A little more permission is needed"
      text="Ask your administrator for access to this workspace."
    />
  );
}
function Login({ onLogin }: { onLogin: (d: Row) => void }) {
  const [mode, setMode] = useState("Super Admin"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const emails: Row = {
    "Super Admin": "admin",
    "Tenant Admin": "tenant",
    Instructor: "olivia",
    Support: "support",
    Finance: "finance",
  };
  const demo = async () => {
    setBusy(true);
    setError("");
    try {
      onLogin(
        await post("/auth/login", {
          email: emails[mode] + "@qubit.demo",
          password: "QubitDemo2026!",
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-story">
        <Brand />
        <div>
          <span className="eyebrow light">
            THE LEARNING OPERATIONS PLATFORM
          </span>
          <h1>
            Big possibilities.
            <br />
            Thoughtfully
            <br />
            <em>connected.</em>
          </h1>
          <p>
            A calmer way to manage learning.
            <br />A clearer way to move people forward.
          </p>
          <div className="login-orbit">
            <Art color="sage" />
          </div>
        </div>
        <small>DESIGNED FOR PEOPLE. BUILT FOR POSSIBILITY.</small>
      </div>
      <div className="login-form">
        <span className="badge neutral">Development prototype</span>
        <h2>Your workspace awaits.</h2>
        <p>Welcome to the Qubit control panel.</p>
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
          onSubmit={async (v) => onLogin(await post("/auth/login", v))}
          label="Sign in to your workspace"
        />
        <div className="or-divider">
          <span />
          or explore the prototype
          <span />
        </div>
        <label className="standalone-label">
          Explore as
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            {Object.keys(emails).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <button className="btn primary full" disabled={busy} onClick={demo}>
          {busy ? "Opening workspace…" : "Enter demo workspace"}
          <Icon name="ArrowRight" size={17} />
        </button>
        {error && <p className="form-error">{error}</p>}
        <p className="login-note">
          <Icon name="ShieldCheck" size={16} />
          Synthetic data only. Production MFA is not configured.
        </p>
      </div>
    </div>
  );
}
function Dashboard({ user }: { user: Row }) {
  const { data: d, error, reload } = useData("/admin/dashboard");
  const courses = useData("/admin/courses");
  const [range, setRange] = useState("This week");
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!d) return <Loading />;
  return (
    <>
      <PageHeading
        eyebrow="YOUR LEARNING ECOSYSTEM, AT A GLANCE"
        title={`Good morning, ${user.name.split(" ")[0]}.`}
        description="A little progress, everywhere. Here’s what’s happening in your learning space."
        actions={
          <>
            <Link to="/analytics" className="btn">
              <Icon name="Download" size={16} />
              View reports
            </Link>
            <Link to="/courses?create=true" className="btn primary">
              <Icon name="Plus" size={17} />
              Create a course
            </Link>
          </>
        }
      />
      <div className="welcome-banner">
        <div>
          <span className="eyebrow light">
            <span className="small-spark">✦</span> MAKE ROOM FOR WHAT’S NEXT
          </span>
          <h2>
            Great learning starts
            <br />
            with a little possibility.
          </h2>
          <p>
            Your people are growing. Give their next big idea a place to begin.
          </p>
          <Link to="/courses">
            Explore your catalogue <Icon name="ArrowUpRight" size={17} />
          </Link>
        </div>
        <div className="banner-art">
          <span className="floating-label">
            <Icon name="Sprout" size={15} />
            Always growing.
          </span>
          <Art color="sage" />
          <span className="orbital-caption">LEARN · CONNECT · GROW</span>
        </div>
        <span className="banner-index">01 / YOUR WORKSPACE</span>
      </div>
      <div className="section-label-row">
        <h2>
          Learning, in perspective{" "}
          <span className="subtle small">Live workspace totals</span>
        </h2>
        <span className="subtle small">
          <Icon name="RefreshCw" size={13} />
          Updated just now
        </span>
      </div>
      <div className="stat-grid">
        {[
          {
            label: "People in your space",
            n: d.users,
            icon: "UsersRound",
            note: `${d.active} active accounts`,
            to: "/users",
            color: "green",
          },
          {
            label: "Courses to discover",
            n: d.courses,
            icon: "BookOpen",
            note: `${d.published} published and ready`,
            to: "/courses",
            color: "peach",
          },
          {
            label: "Learning journeys",
            n: d.enrolments,
            icon: "Route",
            note: "Active course enrolments",
            to: "/analytics",
            color: "purple",
          },
          {
            label: "Assessment average",
            n: d.average === null ? "—" : d.average + "%",
            icon: "ChartNoAxesCombined",
            note: d.attempts
              ? `${d.attempts} assessment attempts`
              : "A new chapter starts here",
            to: "/analytics",
            color: "blue",
          },
        ].map((s) => (
          <Link className="stat-card" to={s.to} key={s.label}>
            <div>
              <span>{s.label}</span>
              <span className={"stat-icon " + s.color}>
                <Icon name={s.icon} size={18} />
              </span>
            </div>
            <strong>{s.n}</strong>
            <p>
              <span className="tiny-dot" />
              {s.note}
              <Icon name="ArrowUpRight" size={14} />
            </p>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Learning momentum</h2>
              <p>Small steps add up to something remarkable.</p>
            </div>
            <select
              aria-label="Chart view"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option>This week</option>
              <option>Previous week</option>
            </select>
          </div>
          <div className="chart-legend">
            <span>
              <i />
              Learning activity
            </span>
            <span>
              <i />
              Lessons completed
            </span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={d.series.map((r: Row) =>
                  range === "This week"
                    ? r
                    : {
                        ...r,
                        learners: Math.round(r.learners * 0.8),
                        completions: Math.round(r.completions * 0.75),
                      },
                )}
                margin={{ left: -28, right: 10, top: 15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="green-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#448d71" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#448d71" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 4"
                  vertical={false}
                  stroke="#e9eeea"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#89918b" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#89918b" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e6ebe7",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="learners"
                  stroke="#30765b"
                  fill="url(#green-fill)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="completions"
                  stroke="#b8aa8c"
                  fill="transparent"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="panel-foot">
            <Icon name="Info" size={13} />
            {d.seriesLabel}
          </div>
        </section>
        <section className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <h2>A little attention needed</h2>
              <p>Keep the good things moving.</p>
            </div>
            <span className="count">3</span>
          </div>
          {[
            {
              icon: "BookOpenCheck",
              color: "peach",
              title: "Ready for a fresh pair of eyes",
              text: "A course is waiting for review",
              to: "/courses",
            },
            {
              icon: "ClipboardList",
              color: "purple",
              title: "Feedback makes a difference",
              text: `${d.submissions} assignments awaiting feedback`,
              to: "/submissions",
            },
            {
              icon: "Plug",
              color: "green",
              title: "Connect your learning ecosystem",
              text: "Configure your external providers",
              to: "/integrations",
            },
          ].map((r) => (
            <Link to={r.to} key={r.title} className="attention-row">
              <span className={"attention-icon " + r.color}>
                <Icon name={r.icon} size={20} />
              </span>
              <div>
                <strong>{r.title}</strong>
                <p>{r.text}</p>
              </div>
              <Icon name="ChevronRight" size={16} />
            </Link>
          ))}
          <Link to="/operations" className="system-summary">
            <span className="tiny-dot" />
            Core API & database connected <Icon name="ArrowUpRight" size={15} />
          </Link>
        </section>
      </div>
      <div className="dashboard-grid lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Made for curious minds</h2>
              <p>A few highlights from your course catalogue.</p>
            </div>
            <Link className="text-link" to="/courses">
              All courses
              <Icon name="ArrowRight" size={15} />
            </Link>
          </div>
          <div className="mini-courses">
            {courses.data?.slice(0, 3).map((c: Row, i: number) => (
              <Link
                to={"/courses?course=" + c.id}
                key={c.id}
                className="mini-course"
              >
                <Art color={c.color} variant={i} small />
                <div>
                  <small>{c.category}</small>
                  <h3>{c.title}</h3>
                  <span>
                    {c.duration} <i>·</i> <Badge>{c.status}</Badge>
                  </span>
                </div>
                <Icon name="ChevronRight" size={16} />
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Behind the scenes</h2>
              <p>The latest activity in your workspace.</p>
            </div>
            <Link to="/audit" className="text-link">
              View all
              <Icon name="ArrowRight" size={15} />
            </Link>
          </div>
          <div className="activity-feed">
            {d.audit.slice(0, 4).map((a: Row) => (
              <div className="feed-item" key={a.id}>
                <span className="feed-dot">
                  <Icon
                    name={a.action.includes("Signed") ? "LogIn" : "Check"}
                    size={13}
                  />
                </span>
                <div>
                  <strong>{a.actor}</strong>
                  <p>{a.action}</p>
                </div>
                <time>
                  {new Date(a.created).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
const courseFields: Field[] = [
  { name: "title", label: "Course title", required: true },
  {
    name: "description",
    label: "Course description",
    type: "textarea",
    required: true,
  },
  {
    name: "category",
    label: "Category",
    type: "select",
    options: ["Design", "Business", "Data & Technology", "Personal growth"],
    required: true,
  },
  {
    name: "level",
    label: "Level",
    type: "select",
    options: ["Beginner", "Intermediate", "Advanced", "All levels"],
    required: true,
  },
  { name: "instructor", label: "Instructor", required: true },
  {
    name: "outcomes",
    label: "Learning outcomes · separate with semicolons",
    type: "textarea",
    required: true,
  },
  {
    name: "access",
    label: "Access policy",
    type: "select",
    options: ["Open", "Restricted"],
    required: true,
  },
];
function Courses() {
  const { data, error, reload } = useData("/admin/courses");
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All courses"),
    [view, setView] = useState("grid"),
    [create, setCreate] = useState(
      new URLSearchParams(location.search).has("create"),
    ),
    [selected, setSelected] = useState<Row | null>(null);
  const toast = useToast();
  useEffect(() => {
    if (data && new URLSearchParams(location.search).get("course"))
      setSelected(
        data.find(
          (r: Row) =>
            r.id === new URLSearchParams(location.search).get("course"),
        ) || null,
      );
  }, [data]);
  const rows =
    data?.filter(
      (c: Row) =>
        c.title.toLowerCase().includes(search.toLowerCase()) &&
        (filter === "All courses" || c.status === filter),
    ) || [];
  return (
    <>
      <PageHeading
        eyebrow="CREATE SOMETHING WORTH LEARNING"
        title="Your course catalogue"
        description="Big ideas, thoughtfully organised. Make every learning journey count."
        actions={
          <>
            <button
              className="btn"
              onClick={async () => {
                try {
                  const d = await post("/admin/export/courses");
                  download("qubit-courses.csv", csv(d.data), "text/csv");
                  toast("Course catalogue exported.");
                } catch (e) {
                  toast((e as Error).message, "error");
                }
              }}
            >
              <Icon name="Download" size={16} />
              Export
            </button>
            <button className="btn primary" onClick={() => setCreate(true)}>
              <Icon name="Plus" size={17} />
              Create a course
            </button>
          </>
        }
      />
      <div className="metric-strip">
        {[
          ["All courses", data?.length || 0],
          [
            "Published",
            data?.filter((c: Row) => c.status === "Published").length || 0,
          ],
          ["Draft", data?.filter((c: Row) => c.status === "Draft").length || 0],
          [
            "In Review",
            data?.filter((c: Row) => c.status === "In Review").length || 0,
          ],
        ].map(([label, n]) => (
          <button
            key={label}
            className={filter === label ? "selected" : ""}
            onClick={() => setFilter(String(label))}
          >
            {label}
            <span>{n}</span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label className="search-input">
          <Icon name="Search" size={17} />
          <input
            placeholder="Find a little inspiration…"
            aria-label="Search courses"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="toolbar-right">
          <span className="subtle small">{rows.length} courses</span>
          <div className="segmented">
            <button
              aria-label="Grid view"
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
            >
              <Icon name="LayoutGrid" size={17} />
            </button>
            <button
              aria-label="List view"
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              <Icon name="List" size={17} />
            </button>
          </div>
        </div>
      </div>
      {error ? (
        <ErrorState error={error} retry={reload} />
      ) : !data ? (
        <Loading />
      ) : rows.length ? (
        <div className={"course-grid " + (view === "list" ? "list-view" : "")}>
          {rows.map((c: Row, i: number) => (
            <button
              key={c.id}
              className="course-card"
              onClick={() => setSelected(c)}
            >
              <div className="course-cover">
                <Art color={c.color} variant={i} />
                <span className="course-status">
                  <Badge>{c.status}</Badge>
                </span>
                <span className="course-cover-index">
                  Q / {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="course-body">
                <div className="course-category">
                  {c.category}
                  <span>{c.level}</span>
                </div>
                <h3>{c.title}</h3>
                <p>{c.description}</p>
                <div className="course-meta">
                  <span>
                    <Icon name="Clock3" size={14} />
                    {c.duration}
                  </span>
                  <span>
                    <Icon name="Layers" size={14} />
                    Version {c.version}
                  </span>
                </div>
                <div className="course-author">
                  <Avatar name={c.instructor} />
                  <strong>{c.instructor}</strong>
                  <Icon name="ArrowUpRight" size={18} />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty
          icon="Search"
          title="No courses found"
          text="Try another search, or create something new."
        />
      )}
      {create && (
        <Modal
          title="A new learning journey"
          subtitle="Start with a clear idea. You can shape the details as you go."
          onClose={() => setCreate(false)}
        >
          <Form
            fields={courseFields}
            initial={{ category: "Design", level: "Beginner", access: "Open" }}
            onSubmit={async (v) => {
              const c = await post("/admin/courses", v);
              setCreate(false);
              reload();
              setSelected(c);
              toast("Your course draft is ready. Add the first lesson.");
            }}
            label="Create draft"
            onCancel={() => setCreate(false)}
          />
        </Modal>
      )}
      {selected && (
        <CourseEditor
          course={selected}
          onClose={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
    </>
  );
}
function CourseEditor({
  course,
  onClose,
}: {
  course: Row;
  onClose: () => void;
}) {
  const [c, setC] = useState(course),
    [tab, setTab] = useState("Overview"),
    [adding, setAdding] = useState(false),
    [editLesson, setEditLesson] = useState<Row | null>(null),
    [checks, setChecks] = useState<Row[] | null>(null),
    [busy, setBusy] = useState(false);
  const {
    data: lessons,
    error,
    reload,
  } = useData("/admin/courses/" + c.id + "/lessons");
  const toast = useToast();
  const act = async (action: string) => {
    setBusy(true);
    try {
      if (action === "preflight")
        setChecks(await post(`/admin/courses/${c.id}/preflight`));
      else if (action === "approve") {
        setC(await patch("/admin/courses/" + c.id, { status: "Approved" }));
        toast("Course approved for publication.");
      } else {
        setC(await post(`/admin/courses/${c.id}/${action}`));
        toast(
          action === "publish"
            ? "A new version is published. Existing learner versions are preserved."
            : "A new draft is ready.",
        );
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      wide
      title={c.title}
      subtitle={`${c.status} · Version ${c.version} · ${c.id}`}
      onClose={onClose}
    >
      <div className="editor-tabs">
        {["Overview", "Curriculum", "Publishing"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" ? (
        <>
          {c.status === "Published" ? (
            <div className="editor-summary">
              <Art color={c.color} />
              <h3>Published, with care.</h3>
              <p>{c.description}</p>
              <p>
                <strong>Learning outcomes</strong>
                <br />
                {c.outcomes}
              </p>
              <div className="notice">
                <Icon name="ShieldCheck" />
                Published content is immutable. Create a new draft to make
                changes.
              </div>
              <button
                className="btn primary"
                onClick={() => act("new-version")}
                disabled={busy}
              >
                Create next version
                <Icon name="GitBranch" size={16} />
              </button>
              <button
                className="btn danger"
                onClick={async () => {
                  if (
                    confirm(
                      "Archive this course? New learners will no longer discover it.",
                    )
                  ) {
                    try {
                      setC(
                        await patch("/admin/courses/" + c.id, {
                          status: "Archived",
                        }),
                      );
                      toast("Course archived.");
                    } catch (e) {
                      toast((e as Error).message, "error");
                    }
                  }
                }}
              >
                Archive course
              </button>
            </div>
          ) : (
            <Form
              fields={courseFields}
              initial={c}
              label="Save course details"
              onSubmit={async (v) => {
                setC(
                  await patch("/admin/courses/" + c.id, {
                    ...v,
                    revision: c.revision || 1,
                  }),
                );
                toast("Course details saved.");
              }}
            />
          )}
        </>
      ) : tab === "Curriculum" ? (
        <div className="editor-content">
          <div className="inline-heading">
            <div>
              <h3>A clear path to possibility</h3>
              <p>Reading, media, resources, and activities in one outline.</p>
            </div>
            {c.status !== "Published" && (
              <button className="btn primary" onClick={() => setAdding(true)}>
                <Icon name="Plus" size={16} />
                Add lesson
              </button>
            )}
          </div>
          {error ? (
            <ErrorState error={error} retry={reload} />
          ) : !lessons ? (
            <Loading />
          ) : lessons.length ? (
            lessons
              .sort((a: Row, b: Row) => a.position - b.position)
              .map((l: Row, i: number) => (
                <div className="lesson-row" key={l.id}>
                  <span className="lesson-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <small>{l.module}</small>
                    <strong>{l.title}</strong>
                    <p>
                      {l.type} · {l.duration} min ·{" "}
                      {l.rights ? "Rights confirmed" : "Rights missing"}
                    </p>
                  </div>
                  {c.status !== "Published" && (
                    <>
                      <button
                        className="icon-btn"
                        aria-label="Move lesson up"
                        disabled={i === 0}
                        onClick={async () => {
                          const prev = lessons[i - 1];
                          try {
                            await patch("/admin/lessons/" + l.id, {
                              position: prev.position,
                            });
                            await patch("/admin/lessons/" + prev.id, {
                              position: l.position,
                            });
                            reload();
                          } catch (e) {
                            toast((e as Error).message, "error");
                          }
                        }}
                      >
                        <Icon name="ArrowUp" size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={"Edit " + l.title}
                        onClick={() => setEditLesson(l)}
                      >
                        <Icon name="Pencil" size={16} />
                      </button>
                    </>
                  )}
                </div>
              ))
          ) : (
            <Empty
              title="Start with your first lesson"
              text="Break a big idea into small, meaningful steps."
            />
          )}
        </div>
      ) : (
        <div className="editor-content">
          <h3>Publish with confidence.</h3>
          <p className="subtle">
            Every check helps create a more thoughtful, accessible learning
            experience.
          </p>
          <div className="notice">
            <Icon name="GitBranch" />
            Existing enrolments remain on their enrolled version. Publication
            never silently changes their learning or assessment rules.
          </div>
          <div className="button-row">
            {c.status !== "Published" && (
              <button
                className="btn"
                onClick={() => act("approve")}
                disabled={busy}
              >
                Approve human review
              </button>
            )}
            <button
              className="btn"
              onClick={() => act("preflight")}
              disabled={busy}
            >
              <Icon name="ListChecks" size={16} />
              Run preflight
            </button>
          </div>
          {checks && (
            <div className="checklist">
              {checks.map((ch) => (
                <button
                  key={ch.field}
                  onClick={() =>
                    setTab(
                      ["lessons", "rights", "captions"].includes(ch.field)
                        ? "Curriculum"
                        : "Overview",
                    )
                  }
                >
                  <Icon
                    name={ch.passed ? "CircleCheck" : "CircleAlert"}
                    className={ch.passed ? "text-green" : "text-amber"}
                    size={21}
                  />
                  <span>{ch.label}</span>
                  <Badge>{ch.passed ? "Ready" : "Needs attention"}</Badge>
                  <Icon name="ChevronRight" size={15} />
                </button>
              ))}
            </div>
          )}
          <button
            className="btn primary"
            disabled={
              busy ||
              !checks ||
              checks.some((x) => !x.passed) ||
              c.status === "Published"
            }
            onClick={() => act("publish")}
          >
            Publish version {c.version + 1}
            <Icon name="ArrowUpRight" size={16} />
          </button>
        </div>
      )}
      {adding && (
        <Modal title="Add a lesson" onClose={() => setAdding(false)}>
          <Form
            fields={[
              { name: "title", label: "Lesson title", required: true },
              { name: "module", label: "Module name", required: true },
              {
                name: "type",
                label: "Content type",
                type: "select",
                options: ["Reading", "Audio", "Video", "Document", "Link"],
                required: true,
              },
              {
                name: "content",
                label: "Lesson content or transcript",
                type: "textarea",
                required: true,
              },
              {
                name: "duration",
                label: "Estimated minutes",
                type: "number",
                required: true,
              },
              {
                name: "captions",
                label: "Captions or transcript included",
                type: "checkbox",
              },
              {
                name: "rights",
                label: "I confirm the rights to this content",
                type: "checkbox",
              },
            ]}
            initial={{
              type: "Reading",
              module: "01 · Getting started",
              duration: 10,
              captions: true,
              rights: false,
            }}
            onSubmit={async (v) => {
              await post("/admin/courses/" + c.id + "/lessons", v);
              setAdding(false);
              reload();
              toast("A new step in the learning journey.");
            }}
            label="Add lesson"
          />
        </Modal>
      )}
      {editLesson && (
        <Modal title="Edit lesson draft" onClose={() => setEditLesson(null)}>
          <Form
            fields={[
              { name: "title", label: "Title", required: true },
              {
                name: "content",
                label: "Content",
                type: "textarea",
                required: true,
              },
              {
                name: "captions",
                label: "Captions / transcript included",
                type: "checkbox",
              },
              {
                name: "rights",
                label: "Content rights confirmed",
                type: "checkbox",
              },
            ]}
            initial={editLesson}
            onSubmit={async (v) => {
              await patch("/admin/lessons/" + editLesson.id, v);
              setEditLesson(null);
              reload();
              toast("Lesson updated.");
            }}
          />
        </Modal>
      )}
    </Modal>
  );
}
function People() {
  const { data, error, reload } = useData("/admin/users");
  const cs = useData("/admin/courses");
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All people"),
    [selected, setSelected] = useState<Row | null>(null),
    [create, setCreate] = useState(false),
    [importing, setImporting] = useState(false),
    [preview, setPreview] = useState<Row[]>([]),
    [importError, setImportError] = useState("");
  const [enrol, setEnrol] = useState(false),
    [revoking, setRevoking] = useState(false);
  const toast = useToast();
  const rows =
    data?.filter(
      (u: Row) =>
        (u.name + " " + u.email).toLowerCase().includes(search.toLowerCase()) &&
        (filter === "All people" || u.role === filter),
    ) || [];
  const exportUsers = async () => {
    try {
      const d = await post("/admin/export/users");
      download("qubit-people.csv", csv(d.data), "text/csv");
      toast("People directory exported.");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="PEOPLE AT THE HEART OF LEARNING"
        title="Room for everyone to grow."
        description="Your learners, educators, and the people making possibility happen."
        actions={
          <>
            <Link className="btn" to="/roles">
              <Icon name="ShieldCheck" size={16} />
              Roles
            </Link>
            <button className="btn" onClick={() => setImporting(true)}>
              <Icon name="Upload" size={16} />
              Import
            </button>
            <button className="btn primary" onClick={() => setCreate(true)}>
              <Icon name="UserPlus" size={17} />
              Invite someone
            </button>
          </>
        }
      />
      <div className="metric-strip">
        {["All people", "Learner", "Instructor", "Support"].map((s) => (
          <button
            key={s}
            className={filter === s ? "selected" : ""}
            onClick={() => setFilter(s)}
          >
            {s}
            <span>
              {data?.filter((u: Row) => s === "All people" || u.role === s)
                .length || 0}
            </span>
          </button>
        ))}
      </div>
      <div className="panel table-panel">
        <div className="toolbar">
          <label className="search-input">
            <Icon name="Search" size={17} />
            <input
              aria-label="Search people"
              placeholder="Find someone by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button className="btn" onClick={exportUsers}>
            <Icon name="Download" size={15} />
            Export directory
          </button>
        </div>
        {error ? (
          <ErrorState error={error} retry={reload} />
        ) : !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            columns={["name", "email", "role", "tenant", "status"]}
            onSelect={setSelected}
          />
        )}
      </div>
      {create && (
        <Modal
          title="A little invitation. A big possibility."
          subtitle="Invitations are recorded locally; email delivery needs a provider."
          onClose={() => setCreate(false)}
        >
          <Form
            fields={[
              { name: "name", label: "Full name", required: true },
              {
                name: "email",
                label: "Email address",
                type: "email",
                required: true,
              },
              {
                name: "role",
                label: "Role",
                type: "select",
                options: [
                  "Learner",
                  "Instructor",
                  "Support",
                  "Finance",
                  "Tenant Admin",
                ],
                required: true,
              },
              {
                name: "reason",
                label: "Reason for invitation",
                required: true,
              },
            ]}
            initial={{ role: "Learner" }}
            onSubmit={async (v) => {
              await post("/admin/users", v);
              setCreate(false);
              reload();
              toast(
                "Invitation recorded. Configure email delivery to send it.",
              );
            }}
            label="Create invitation"
          />
        </Modal>
      )}
      {selected && (
        <Modal
          title={selected.name}
          subtitle={selected.email}
          onClose={() => {
            setSelected(null);
            reload();
          }}
        >
          <div className="profile-summary">
            <Avatar name={selected.name} size="large" />
            <div>
              <Badge>{selected.role}</Badge>
              <p>
                {selected.tenant} · {selected.status}
              </p>
            </div>
          </div>
          <Form
            fields={[
              { name: "name", label: "Full name", required: true },
              {
                name: "role",
                label: "Role",
                type: "select",
                options: [
                  "Learner",
                  "Instructor",
                  "Support",
                  "Finance",
                  "Tenant Admin",
                  "Super Admin",
                ],
                required: true,
              },
              {
                name: "status",
                label: "Account status",
                type: "select",
                options: ["Active", "Suspended", "Deactivated", "Invited"],
                required: true,
              },
              {
                name: "reason",
                label: "Reason for this change",
                type: "textarea",
                required: true,
              },
              {
                name: "password",
                label: "Your password · required for role changes",
                type: "password",
              },
            ]}
            initial={selected}
            onSubmit={async (v) => {
              const d = await patch("/admin/users/" + selected.id, v);
              setSelected(d);
              reload();
              toast(
                "Account updated. Sensitive changes are recorded in the audit trail.",
              );
            }}
          />
          <div className="editor-content button-row">
            <button className="btn" onClick={() => setEnrol(true)}>
              <Icon name="BookPlus" size={16} />
              Manage enrolment
            </button>
            <button className="btn danger" onClick={() => setRevoking(true)}>
              <Icon name="LogOut" size={16} />
              Revoke sessions
            </button>
          </div>
        </Modal>
      )}
      {enrol && selected && (
        <Modal title="Manage course access" onClose={() => setEnrol(false)}>
          <Form
            fields={[
              {
                name: "courseId",
                label: "Course",
                type: "select",
                options: cs.data
                  ?.filter((c: Row) => c.status === "Published")
                  .map((c: Row) => c.id),
                required: true,
              },
              {
                name: "state",
                label: "Access state",
                type: "select",
                options: ["Active", "Suspended"],
                required: true,
              },
              {
                name: "reason",
                label: "Reason for this access change",
                required: true,
              },
            ]}
            initial={{ state: "Active" }}
            onSubmit={async (v) => {
              await post("/admin/enrolments", { ...v, userId: selected.id });
              setEnrol(false);
              toast("Course access updated.");
            }}
          />
        </Modal>
      )}
      {revoking && selected && (
        <Modal
          title="Revoke active sessions?"
          subtitle="The learner will need to sign in again on all devices."
          onClose={() => setRevoking(false)}
        >
          <Form
            fields={[{ name: "reason", label: "Reason", required: true }]}
            onSubmit={async (v) => {
              await post("/admin/users/" + selected.id + "/revoke", v);
              setRevoking(false);
              toast("All sessions revoked.");
            }}
            label="Revoke sessions"
          />
        </Modal>
      )}
      {importing && (
        <Modal
          wide
          title="Invite a whole learning community"
          subtitle="CSV columns: name,email,role. Preview and validate before committing."
          onClose={() => {
            setImporting(false);
            setPreview([]);
          }}
        >
          <div className="editor-content">
            <button
              className="btn"
              onClick={() =>
                download(
                  "qubit-import-template.csv",
                  "name,email,role\nTaylor Sample,taylor@example.test,Learner",
                  "text/csv",
                )
              }
            >
              <Icon name="Download" size={16} />
              Download template
            </button>
            <label className="upload-zone">
              <Icon name="FileUp" size={28} />
              <strong>Choose a CSV to preview</strong>
              <small>
                Maximum 100 rows. Simple CSV, without quoted commas.
              </small>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const text = await e.target.files?.[0]?.text();
                  if (!text) return;
                  const lines = text.trim().split(/\r?\n/),
                    header = lines
                      .shift()
                      ?.split(",")
                      .map((x) => x.trim());
                  if (header?.join(",") !== "name,email,role") {
                    setImportError(
                      "Columns must be name,email,role in that order.",
                    );
                    return;
                  }
                  const rows = lines.map((l, i) => {
                    const [name, email, role] = l
                      .split(",")
                      .map((s) => s.trim());
                    return {
                      name,
                      email,
                      role,
                      error:
                        !name ||
                        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
                        ![
                          "Learner",
                          "Instructor",
                          "Support",
                          "Finance",
                          "Tenant Admin",
                        ].includes(role)
                          ? "Check name, email, or role"
                          : data.some((u: Row) => u.email === email)
                            ? "Email already exists"
                            : "",
                    };
                  });
                  setPreview(rows.slice(0, 100));
                  setImportError(
                    rows.length > 100 ? "Only 100 rows per import." : "",
                  );
                }}
              />
            </label>
            {importError && <p className="form-error">{importError}</p>}
            {preview.length > 0 && (
              <>
                <DataTable
                  rows={preview}
                  columns={["name", "email", "role", "error"]}
                />
                <button
                  className="btn primary"
                  disabled={!!importError || preview.some((r) => r.error)}
                  onClick={async () => {
                    let added = 0;
                    try {
                      for (const row of preview) {
                        const { error, ...v } = row;
                        await post("/admin/users", {
                          ...v,
                          reason: "Administrator CSV import",
                        });
                        added++;
                      }
                      setImporting(false);
                      setPreview([]);
                      reload();
                      toast(`${added} invitations recorded.`);
                    } catch (e) {
                      reload();
                      setImportError(
                        `${added} imported; remaining rows not imported: ${(e as Error).message}`,
                      );
                    }
                  }}
                >
                  Confirm {preview.length} invitations
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
function DataTable({
  rows,
  columns,
  onSelect,
}: {
  rows: Row[];
  columns: string[];
  onSelect?: (r: Row) => void;
}) {
  const [sort, setSort] = useState(""),
    [desc, setDesc] = useState(false),
    [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows.length]);
  const list = [...rows].sort((a, b) =>
      sort
        ? String(a[sort] ?? "").localeCompare(
            String(b[sort] ?? ""),
            undefined,
            { numeric: true },
          ) * (desc ? -1 : 1)
        : 0,
    ),
    pages = Math.ceil(list.length / 8);
  const label = (s: string) =>
    (
      ({
        courseId: "Course",
        correlationId: "Request ID",
        userId: "Learner",
        submitted: "Submitted",
        created: "Created",
        updated: "Updated",
      }) as Row
    )[s] || s.replace(/([A-Z])/g, " $1");
  return !rows.length ? (
    <Empty />
  ) : (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((k) => (
                <th key={k}>
                  <button
                    onClick={() => {
                      setSort(k);
                      setDesc(sort === k ? !desc : false);
                    }}
                  >
                    {label(k)}
                    <Icon name="ChevronsUpDown" size={12} />
                  </button>
                </th>
              ))}
              {onSelect && (
                <th>
                  <span className="sr-only">Open</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {list.slice(page * 8, page * 8 + 8).map((r, i) => (
              <tr key={r.id || i}>
                {columns.map((k, j) => (
                  <td key={k}>
                    {k === "status" ? (
                      <Badge>{r[k]}</Badge>
                    ) : k === "name" && r.email ? (
                      <button
                        className="person-cell"
                        onClick={() => onSelect?.(r)}
                      >
                        <Avatar name={r.name} />
                        <strong>{r[k]}</strong>
                      </button>
                    ) : j === 0 && onSelect ? (
                      <button
                        className="table-record-link"
                        onClick={() => onSelect(r)}
                      >
                        {String(r[k] ?? "—")}
                      </button>
                    ) : typeof r[k] === "object" ? (
                      Array.isArray(r[k]) ? (
                        `${r[k].length} items`
                      ) : (
                        "Configured"
                      )
                    ) : typeof r[k] === "boolean" ? (
                      r[k] ? (
                        "Yes"
                      ) : (
                        "No"
                      )
                    ) : [
                        "created",
                        "updated",
                        "issued",
                        "submitted",
                        "date",
                        "started",
                      ].includes(k) && r[k] ? (
                      new Date(r[k]).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    ) : (
                      <span className={k === "email" ? "subtle" : ""}>
                        {String(r[k] ?? "—")}
                      </span>
                    )}
                  </td>
                ))}
                {onSelect && (
                  <td>
                    <button
                      className="icon-btn"
                      aria-label={
                        "View " + (r.name || r.title || r.prompt || "record")
                      }
                      onClick={() => onSelect(r)}
                    >
                      <Icon name="ArrowUpRight" size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>
          {page * 8 + 1}–{Math.min((page + 1) * 8, list.length)} of{" "}
          {list.length} records
        </span>
        <div>
          <button
            className="btn small-btn"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <Icon name="ChevronLeft" size={14} />
            Previous
          </button>
          <button
            className="btn small-btn"
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <Icon name="ChevronRight" size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
function ResourcePage({ kind }: { kind: string }) {
  const config = configs[kind],
    { data, error, reload } = useData("/admin/resources/" + kind);
  const catalogue = useData("/admin/courses");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("All statuses"),
    [selected, setSelected] = useState<Row | null>(null),
    [creating, setCreating] = useState(false),
    [editing, setEditing] = useState(false),
    [response, setResponse] = useState("");
  const toast = useToast();
  const rows =
    data?.filter(
      (r: Row) =>
        (!(
          kind === "questions" ||
          ["assignments", "sessions", "discussions"].includes(kind)
        ) ||
          catalogue.data?.some(
            (c: Row) => c.coaching && !c.legacyDemo && c.id === r.courseId,
          )) &&
        JSON.stringify(r).toLowerCase().includes(search.toLowerCase()) &&
        (status === "All statuses" || r.status === status),
    ) || [];
  const convert = (v: Row) =>
    kind === "questions"
      ? {
          ...v,
          options:
            typeof v.options === "string"
              ? v.options.split("\n").filter(Boolean)
              : v.options || [],
          answer:
            v.type === "text"
              ? String(v.answer)
              : v.type === "multiple"
                ? String(v.answer).split(",").map(Number)
                : Number(v.answer),
        }
      : v;
  const initial = selected
    ? {
        ...selected,
        options: selected.options?.join("\n"),
        answer: Array.isArray(selected.answer)
          ? selected.answer.join(",")
          : selected.answer,
      }
    : {};
  return (
    <>
      <PageHeading
        eyebrow="A THOUGHTFULLY CONNECTED PLATFORM"
        title={config.title}
        description={config.description}
        actions={
          <>
            <button
              className="btn"
              onClick={async () => {
                try {
                  const d = await post("/admin/export/" + kind);
                  download("qubit-" + kind + ".csv", csv(d.data), "text/csv");
                  toast(
                    "Export ready. This action is recorded in the audit trail.",
                  );
                } catch (e) {
                  toast((e as Error).message, "error");
                }
              }}
            >
              <Icon name="Download" size={16} />
              Export
            </button>
            {!config.readOnly && (
              <button className="btn primary" onClick={() => setCreating(true)}>
                <Icon name="Plus" size={17} />
                New {config.singular}
              </button>
            )}
            {kind === "media" && (
              <label className="btn primary file-button">
                <Icon name="Upload" size={16} />
                Upload asset
                <input
                  type="file"
                  accept=".pdf,.txt,.png,.jpg,.jpeg"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) {
                      toast("Choose a file smaller than 5 MB.", "error");
                      return;
                    }
                    try {
                      const reader = new FileReader();
                      const data = await new Promise<string>((res, rej) => {
                        reader.onload = () =>
                          res(String(reader.result).split(",")[1]);
                        reader.onerror = rej;
                        reader.readAsDataURL(f);
                      });
                      await post("/uploads", {
                        name: f.name,
                        type: f.type,
                        data,
                      });
                      reload();
                      toast(
                        "Asset uploaded. Confirm rights before using it in a course.",
                      );
                    } catch (e) {
                      toast((e as Error).message, "error");
                    }
                  }}
                />
              </label>
            )}
          </>
        }
      />
      {[
        "integrations",
        "transactions",
        "plans",
        "backups",
        "sessions",
      ].includes(kind) && (
        <div className="notice">
          <Icon name={kind === "backups" ? "DatabaseBackup" : "Plug"} />
          {kind === "backups" ? (
            <>
              Local SQLite backup and restore validation are available with{" "}
              <code>npm run backup</code>. Automated offsite backups,
              encryption, and disaster recovery need a production deployment.
            </>
          ) : kind === "integrations" ? (
            "Provider preferences are saved locally. No API credentials, live delivery, payment processing, or conferencing services are connected."
          ) : kind === "transactions" || kind === "plans" ? (
            "Commercial configuration only. No payments are collected and no card details are stored."
          ) : (
            "Session records and calendar details are available. A valid provider join URL is required for live attendance."
          )}
        </div>
      )}
      <div className="panel table-panel">
        <div className="toolbar">
          <label className="search-input">
            <Icon name="Search" size={17} />
            <input
              aria-label={"Search " + config.title}
              placeholder={"Search " + config.title.toLowerCase() + "…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>All statuses</option>
            {[
              ...new Set<string>(
                data?.map((r: Row) => r.status).filter(Boolean),
              ),
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {error ? (
          <ErrorState error={error} retry={reload} />
        ) : !data ? (
          <Loading />
        ) : rows.length ? (
          <DataTable
            rows={rows}
            columns={config.columns}
            onSelect={(r) => {
              setSelected(r);
              setEditing(false);
            }}
          />
        ) : (
          <Empty
            icon={config.icon}
            title={
              data.length
                ? "Nothing matches this view"
                : "A little space for what’s next"
            }
            text={
              kind === "certificates"
                ? "Certificates appear when learners complete required lessons and pass their assessment."
                : kind === "submissions"
                  ? "Learner submissions will arrive here, ready for your feedback."
                  : kind === "transactions"
                    ? "Connect a payment provider to begin receiving transactions."
                    : "New records and activity will appear here."
            }
          />
        )}
      </div>
      {creating && (
        <Modal
          title={"New " + config.singular}
          onClose={() => setCreating(false)}
        >
          <Form
            fields={config.fields}
            onSubmit={async (v) => {
              await post("/admin/resources/" + kind, convert(v));
              setCreating(false);
              reload();
              toast("Your " + config.singular + " is ready.");
            }}
            label={"Create " + config.singular}
          />
        </Modal>
      )}
      {selected && (
        <Modal
          wide={kind === "submissions"}
          title={
            selected.name ||
            selected.title ||
            selected.prompt ||
            config.singular
          }
          subtitle={selected.id}
          onClose={() => {
            setSelected(null);
            reload();
          }}
        >
          {editing ? (
            <Form
              fields={config.fields}
              initial={initial}
              onSubmit={async (v) => {
                const updated = await patch(
                  `/admin/resources/${kind}/${selected.id}`,
                  convert(v),
                );
                setSelected(updated);
                setEditing(false);
                reload();
                toast("Changes saved.");
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div className="editor-content">
              <div className="detail-grid">
                {Object.entries(selected)
                  .filter(
                    ([k]) =>
                      ![
                        "id",
                        "data",
                        "responses",
                        "replies",
                        "options",
                        "answer",
                      ].includes(k),
                  )
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className={
                        [
                          "description",
                          "text",
                          "feedback",
                          "explanation",
                          "error",
                        ].includes(k)
                          ? "detail-wide"
                          : ""
                      }
                    >
                      <small>{k.replace(/([A-Z])/g, " $1")}</small>
                      {k === "status" ? (
                        <Badge>{String(v)}</Badge>
                      ) : (
                        <p>
                          {typeof v === "object"
                            ? JSON.stringify(v)
                            : String(v ?? "Not set")}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
              {kind === "groups" && (
                <GroupMembers
                  group={selected}
                  onUpdate={(g) => {
                    setSelected(g);
                    reload();
                  }}
                />
              )}
              {kind === "questions" && (
                <div className="notice">
                  <Icon name="LockKeyhole" />
                  <div>
                    Answer key · staff access only
                    <br />
                    {JSON.stringify(selected.answer)}
                    <p>{selected.options?.join(" · ")}</p>
                  </div>
                </div>
              )}
              {selected.attachmentId && (
                <button
                  className="btn"
                  onClick={async () => {
                    const r = await fetch(
                      "/api/v1/uploads/" + selected.attachmentId,
                      {
                        credentials: "include",
                        headers: { "X-Qubit-Surface": "admin" },
                      },
                    );
                    if (!r.ok) {
                      toast("Unable to download attachment.", "error");
                      return;
                    }
                    const url = URL.createObjectURL(await r.blob());
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "submission-attachment";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Icon name="Download" size={16} />
                  Download submission attachment
                </button>
              )}
              {kind === "flags" ? (
                <button
                  className="btn primary"
                  onClick={async () => {
                    try {
                      setSelected(
                        await patch("/admin/resources/flags/" + selected.id, {
                          enabled: !selected.enabled,
                        }),
                      );
                      reload();
                      toast("Feature flag updated.");
                    } catch (e) {
                      toast((e as Error).message, "error");
                    }
                  }}
                >
                  {selected.enabled ? "Disable feature" : "Enable feature"}
                  <Icon name="ToggleRight" size={18} />
                </button>
              ) : kind === "jobs" ? (
                <button
                  className="btn"
                  disabled={
                    selected.status !== "Failed" || !selected.idempotent
                  }
                  onClick={async () => {
                    try {
                      setSelected(
                        await post("/admin/jobs/" + selected.id + "/retry"),
                      );
                      reload();
                      toast("Eligible job queued.");
                    } catch (e) {
                      toast((e as Error).message, "error");
                    }
                  }}
                >
                  <Icon name="RotateCw" size={16} />
                  Retry eligible job
                </button>
              ) : (
                config.fields.length > 0 && (
                  <button
                    className={
                      "btn " + (kind === "certificates" ? "danger" : "primary")
                    }
                    onClick={() => setEditing(true)}
                  >
                    <Icon
                      name={kind === "submissions" ? "ListChecks" : "Pencil"}
                      size={16}
                    />
                    {kind === "submissions"
                      ? "Review & give feedback"
                      : kind === "certificates"
                        ? "Revoke certificate"
                        : "Edit " + config.singular}
                  </button>
                )
              )}
              {kind === "tickets" && (
                <div className="ticket-thread">
                  <h3>Conversation</h3>
                  {selected.responses?.map((r: Row, i: number) => (
                    <div className="reply" key={i}>
                      <strong>{r.author}</strong>
                      <p>{r.text}</p>
                    </div>
                  ))}
                  <label className="standalone-label">
                    Add a response
                    <textarea
                      rows={3}
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Help them take their next step…"
                    />
                  </label>
                  <button
                    className="btn primary"
                    disabled={response.trim().length < 3}
                    onClick={async () => {
                      try {
                        const d = await patch(
                          "/admin/resources/tickets/" + selected.id,
                          {
                            responses: [
                              ...(selected.responses || []),
                              {
                                author: "Support team",
                                text: response,
                                created: new Date().toISOString(),
                              },
                            ],
                          },
                        );
                        setSelected(d);
                        setResponse("");
                        toast("Response added to the case.");
                      } catch (e) {
                        toast((e as Error).message, "error");
                      }
                    }}
                  >
                    Add response
                    <Icon name="Send" size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
function Analytics() {
  const { data: d, error, reload } = useData("/admin/dashboard");
  const cs = useData("/admin/courses");
  const [tab, setTab] = useState("Overview"),
    [course, setCourse] = useState("All courses");
  const toast = useToast();
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!d) return <Loading />;
  const selected =
    course === "All courses"
      ? cs.data
      : cs.data?.filter((c: Row) => c.id === course);
  return (
    <>
      <PageHeading
        eyebrow="UNDERSTAND THE STORY BEHIND THE NUMBERS"
        title="A clearer view of progress."
        description="Learning outcomes, engagement, and operations. Each with its own story."
        actions={
          <Link to="/reports" className="btn">
            <Icon name="Bookmark" size={16} />
            Saved reports
          </Link>
        }
      />
      <div className="editor-tabs standalone">
        {[
          "Overview",
          "Courses",
          "Assessments",
          "Operations",
          "Definitions",
        ].map((t) => (
          <button
            key={t}
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Definitions" ? (
        <div className="panel definitions">
          {[
            ["People", "Current accounts in the authorised tenant scope."],
            [
              "Learning journeys",
              "Current active course enrolments, excluding suspended access.",
            ],
            [
              "Lesson completion",
              "A learner’s explicitly acknowledged required lesson completion. It does not demonstrate understanding.",
            ],
            [
              "Assessment average",
              "Arithmetic mean of submitted server-graded quiz scores. Open and expired attempts are excluded.",
            ],
            [
              "Pilot trend",
              "Synthetic seeded illustration. It does not represent measured platform activity.",
            ],
            [
              "Study time",
              "Estimated from supported lesson position updates; not verified active attention.",
            ],
            [
              "Mastery",
              "Assessment evidence is shown separately from lesson completion and practice. No inferred scientific precision.",
            ],
          ].map(([a, b]) => (
            <div key={a}>
              <h3>{a}</h3>
              <p>{b}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="stat-grid">
            {[
              ["Registered people", d.users],
              ["Active enrolments", d.enrolments],
              ["Submitted attempts", d.attempts],
              ["Certificates earned", d.certificates],
            ].map(([s, n]) => (
              <div key={s} className="stat-card">
                <span>{s}</span>
                <strong>{n}</strong>
                <p>Current authorised workspace</p>
              </div>
            ))}
          </div>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {tab === "Assessments"
                    ? "Practice and performance"
                    : tab === "Operations"
                      ? "Operational activity"
                      : "Learning momentum"}
                </h2>
                <p>Illustrative pilot trend · synthetic seed data</p>
              </div>
              <button
                className="btn"
                onClick={() => {
                  download(
                    "qubit-pilot-illustration.csv",
                    csv(d.series),
                    "text/csv",
                  );
                  toast("Illustrative trend exported.");
                }}
              >
                <Icon name="Download" size={16} />
                Export chart data
              </button>
            </div>
            <div className="chart-wrap large">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={d.series} margin={{ left: -20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar
                    dataKey="learners"
                    name="Learning activity"
                    fill="#2f735a"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="completions"
                    name="Completions"
                    fill="#cdd9bb"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel table-panel spaced">
            <div className="panel-heading">
              <div>
                <h2>Course-level view</h2>
                <p>
                  Published catalogue metadata · pilot enrolment counts are
                  illustrative
                </p>
              </div>
              <select
                value={course}
                aria-label="Select course"
                onChange={(e) => setCourse(e.target.value)}
              >
                <option>All courses</option>
                {cs.data?.map((c: Row) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            {selected && (
              <DataTable
                rows={selected}
                columns={["title", "category", "enrolled", "rating", "status"]}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
function Intelligence() {
  const { data: flags, error, reload } = useData("/admin/resources/flags");
  const prompts = useData("/admin/resources/prompts");
  const [outline, setOutline] = useState(false),
    [draft, setDraft] = useState<Row | null>(null);
  const toast = useToast();
  return (
    <>
      <PageHeading
        eyebrow="INTELLIGENCE, WITH INTENTION"
        title="A little assistance. More possibility."
        description="Thoughtful tools for learners and educators. Human judgement stays at the centre."
        actions={
          <Link className="btn" to="/prompts">
            <Icon name="GitBranch" size={16} />
            Prompt registry
          </Link>
        }
      />
      <div className="ai-hero">
        <div className="ai-symbol">
          <Icon name="Sparkles" size={32} />
        </div>
        <div>
          <span className="eyebrow">YOUR INTELLIGENCE STUDIO</span>
          <h2>
            Good questions deserve
            <br />
            grounded answers.
          </h2>
          <p>
            The reference assistant retrieves authorised lesson material.
            Connect an approved AI provider to enable generative responses.
          </p>
          <Link className="btn primary" to="/integrations">
            Configure AI gateway
            <Icon name="ArrowUpRight" size={16} />
          </Link>
        </div>
        <Art color="lilac" variant={1} />
      </div>
      <div className="three-grid spaced">
        {[
          {
            icon: "BookOpenText",
            title: "Course-grounded tutor",
            text: "Lesson references, summaries, and reflection prompts. Tenant and enrolment boundaries apply.",
            badge: "Reference fallback",
            to: "/flags",
          },
          {
            icon: "WandSparkles",
            title: "Course authoring workspace",
            text: "Create a structured outline template for an educator to review and refine.",
            badge: "Human review required",
            action: () => setOutline(true),
          },
          {
            icon: "ShieldCheck",
            title: "Governance by design",
            text: "Feature controls, provider visibility, prompt versions, and an immediate disable switch.",
            badge: "You’re in control",
            to: "/flags",
          },
        ].map((c) => (
          <div className="panel feature-card" key={c.title}>
            <Icon name={c.icon} size={25} />
            <Badge>{c.badge}</Badge>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
            {c.to ? (
              <Link className="text-link" to={c.to}>
                Open controls
                <Icon name="ArrowRight" size={16} />
              </Link>
            ) : (
              <button className="text-link" onClick={c.action}>
                Create an outline
                <Icon name="ArrowRight" size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="panel spaced">
        <div className="panel-heading">
          <div>
            <h2>Capabilities & controls</h2>
            <p>No external model calls are made in this prototype.</p>
          </div>
          <Link to="/flags" className="text-link">
            All feature flags
            <Icon name="ArrowRight" size={16} />
          </Link>
        </div>
        {error ? (
          <ErrorState error={error} retry={reload} />
        ) : (
          flags?.map((f: Row) => (
            <div className="setting-row" key={f.id}>
              <div>
                <strong>{f.name}</strong>
                <p>{f.description}</p>
              </div>
              <button
                role="switch"
                aria-label={f.name}
                aria-checked={f.enabled}
                className={"toggle " + (f.enabled ? "on" : "")}
                onClick={async () => {
                  try {
                    await patch("/admin/resources/flags/" + f.id, {
                      enabled: !f.enabled,
                    });
                    reload();
                    toast("Feature setting saved.");
                  } catch (e) {
                    toast((e as Error).message, "error");
                  }
                }}
              >
                <span />
              </button>
            </div>
          ))
        )}
      </div>
      {outline && (
        <Modal
          title="Shape a course outline"
          subtitle="A deterministic starting template, not AI-generated content."
          onClose={() => {
            setOutline(false);
            setDraft(null);
          }}
        >
          {!draft ? (
            <Form
              fields={[
                {
                  name: "topic",
                  label: "What would you like to teach?",
                  required: true,
                },
                { name: "audience", label: "Who is it for?", required: true },
                {
                  name: "goal",
                  label: "What should learners be able to do?",
                  type: "textarea",
                  required: true,
                },
              ]}
              onSubmit={async (v) => setDraft(v)}
              label="Create outline template"
            />
          ) : (
            <div className="editor-content">
              <Badge>Draft · human review required</Badge>
              <h3>{draft.topic}</h3>
              <p>For {draft.audience}</p>
              {[
                "Discover the foundations",
                "Explore through practical examples",
                "Apply what you have learned",
                "Reflect, practise, and demonstrate",
              ].map((s, i) => (
                <div className="lesson-row" key={s}>
                  <span className="lesson-number">0{i + 1}</span>
                  <strong>{s}</strong>
                </div>
              ))}
              <p>Learning goal: {draft.goal}</p>
              <button
                className="btn primary"
                onClick={() =>
                  download(
                    "course-outline.txt",
                    `${draft.topic}\nAudience: ${draft.audience}\nGoal: ${draft.goal}\n\n1. Foundations\n2. Practical examples\n3. Application\n4. Assessment\n\nEditorial template. Requires educator review.`,
                    "text/plain",
                  )
                }
              >
                <Icon name="Download" size={16} />
                Export draft outline
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
function Operations() {
  const { data, error, reload } = useData("/health");
  const jobs = useData("/admin/resources/jobs");
  const incidents = useData("/admin/resources/incidents");
  return (
    <>
      <PageHeading
        eyebrow="OPERATIONAL CLARITY"
        title="A healthy space for learning."
        description="Know what’s working, what needs care, and what happens next."
        actions={
          <button
            className="btn"
            onClick={() => {
              reload();
              jobs.reload();
              incidents.reload();
            }}
          >
            <Icon name="RefreshCw" size={16} />
            Refresh status
          </button>
        }
      />
      <div className="health-banner">
        <span className="health-pulse" />
        <div>
          <h2>
            {data?.status === "ok"
              ? "Core platform is connected"
              : "Checking core platform…"}
          </h2>
          <p>
            Local API and SQLite database. External providers are not
            configured.
          </p>
        </div>
        <Badge>{data ? "Connected" : "Checking"}</Badge>
      </div>
      {error && <ErrorState error={error} retry={reload} />}
      <div className="four-grid spaced">
        {[
          ["Database", "Database", "Local SQLite · persistent records"],
          ["API service", "Server", "Versioned API · request validation"],
          [
            "Background jobs",
            "Workflow",
            `${jobs.data?.length || 0} jobs · provider-dependent execution`,
          ],
          ["External providers", "Plug", "Configuration required"],
        ].map(([title, icon, text]) => (
          <div className="panel feature-card compact" key={title}>
            <Icon name={icon} size={23} />
            <h3>{title}</h3>
            <p>{text}</p>
            <Badge>
              {title === "External providers"
                ? "Not configured"
                : title === "Background jobs"
                  ? "Needs attention"
                  : "Connected"}
            </Badge>
          </div>
        ))}
      </div>
      <div className="three-grid spaced">
        {[
          [
            "jobs",
            "Workflow",
            "Job workspace",
            "Inspect failures and retry eligible operations.",
          ],
          [
            "incidents",
            "Activity",
            "Incident records",
            "Own an investigation from first signal to resolution.",
          ],
          [
            "backups",
            "DatabaseBackup",
            "Backup & recovery",
            "Local snapshots, restore validation, and recovery notes.",
          ],
        ].map(([path, icon, title, text]) => (
          <Link className="panel feature-card" to={"/" + path} key={path}>
            <Icon name={icon} size={25} />
            <h3>{title}</h3>
            <p>{text}</p>
            <span className="text-link">
              Open workspace
              <Icon name="ArrowUpRight" size={16} />
            </span>
          </Link>
        ))}
      </div>
      <div className="panel table-panel spaced">
        <div className="panel-heading">
          <div>
            <h2>Jobs that need a little care</h2>
            <p>
              Retries require idempotency and a configured execution provider.
            </p>
          </div>
          <Link to="/jobs" className="text-link">
            All jobs
            <Icon name="ArrowRight" size={15} />
          </Link>
        </div>
        {jobs.data && (
          <DataTable
            rows={jobs.data}
            columns={["title", "type", "correlationId", "status"]}
          />
        )}
      </div>
    </>
  );
}
function Audit() {
  const { data, error, reload } = useData("/admin/audit");
  const [search, setSearch] = useState(""),
    [result, setResult] = useState("All outcomes");
  const toast = useToast();
  return (
    <>
      <PageHeading
        eyebrow="TRUST, WITH A TRAIL"
        title="Every important action, accounted for."
        description="An append-only view of who did what, when, and why."
        actions={
          <button
            className="btn"
            onClick={async () => {
              try {
                const d = await post("/admin/export/audit");
                download("qubit-audit.csv", csv(d.data), "text/csv");
                toast("Audit export recorded.");
              } catch (e) {
                toast((e as Error).message, "error");
              }
            }}
          >
            <Icon name="Download" size={16} />
            Export audit trail
          </button>
        }
      />
      <div className="notice">
        <Icon name="ShieldCheck" />
        Audit records cannot be edited or deleted through this application.
        Times are stored in UTC and displayed in your browser’s locale.
      </div>
      <div className="panel table-panel">
        <div className="toolbar">
          <label className="search-input">
            <Icon name="Search" size={17} />
            <input
              aria-label="Search audit trail"
              placeholder="Search actor, action, target, or reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            value={result}
            aria-label="Filter outcome"
            onChange={(e) => setResult(e.target.value)}
          >
            <option>All outcomes</option>
            <option>Success</option>
            <option>Denied</option>
          </select>
        </div>
        {error ? (
          <ErrorState error={error} retry={reload} />
        ) : data ? (
          <DataTable
            rows={data.filter(
              (r: Row) =>
                JSON.stringify(r)
                  .toLowerCase()
                  .includes(search.toLowerCase()) &&
                (result === "All outcomes" || r.result === result),
            )}
            columns={[
              "actor",
              "action",
              "target",
              "reason",
              "created",
              "result",
            ]}
          />
        ) : (
          <Loading />
        )}
      </div>
    </>
  );
}
function Roles() {
  const { data, error, reload } = useData("/admin/roles");
  return (
    <>
      <PageHeading
        eyebrow="PRECISE ACCESS. SHARED POSSIBILITY."
        title="Roles & permissions"
        description="Permissions are enforced by the API, independently of navigation visibility."
        actions={
          <Link to="/users" className="btn">
            <Icon name="ArrowLeft" size={16} />
            People
          </Link>
        }
      />
      {error ? (
        <ErrorState error={error} retry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <div className="three-grid">
          {data.map((r: Row) => (
            <div className="panel feature-card" key={r.name}>
              <Icon
                name={
                  r.name === "Super Admin"
                    ? "Crown"
                    : r.name === "Learner"
                      ? "GraduationCap"
                      : "ShieldCheck"
                }
                size={26}
              />
              <h3>{r.name}</h3>
              <p>
                {r.permissions.includes("*")
                  ? "Platform-wide administration. Sensitive role changes require password confirmation."
                  : r.permissions.length
                    ? "Tenant-scoped access to the following domains."
                    : "Own courses, progress, submissions, and profile only."}
              </p>
              <div className="chip-list">
                {r.permissions.map((p: string) => (
                  <span className="chip" key={p}>
                    {p === "*" ? "All platform permissions" : p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
function Settings() {
  const { data, error, reload } = useData("/admin/settings");
  const [tab, setTab] = useState("General");
  const toast = useToast();
  return (
    <>
      <PageHeading
        eyebrow="MAKE THIS SPACE YOURS"
        title="Thoughtfully configured."
        description="Your brand, your policies, and the foundations of a good learning experience."
      />
      <div className="settings-layout">
        <aside>
          {["General", "Learning", "Governance", "Connections"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              <Icon
                name={
                  t === "General"
                    ? "Settings2"
                    : t === "Learning"
                      ? "BookOpen"
                      : t === "Governance"
                        ? "ShieldCheck"
                        : "Plug"
                }
                size={18}
              />
              {t}
              <Icon name="ChevronRight" size={15} />
            </button>
          ))}
        </aside>
        <section className="panel settings-panel">
          {error ? (
            <ErrorState error={error} retry={reload} />
          ) : !data ? (
            <Loading />
          ) : tab === "Connections" ? (
            <div className="editor-content">
              <h2>One connected ecosystem.</h2>
              <p className="subtle">
                Configure provider choices and review each capability’s
                readiness.
              </p>
              {[
                ["/integrations", "External integrations", "Plug"],
                ["/flags", "Feature flags", "Flag"],
                ["/tenants", "Organisation branding", "Building2"],
                ["/plans", "Plans & entitlements", "CreditCard"],
              ].map(([to, title, icon]) => (
                <Link key={to} className="setting-link" to={to}>
                  <Icon name={icon} />
                  <strong>{title}</strong>
                  <Icon name="ArrowUpRight" size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <>
              <div className="panel-heading">
                <div>
                  <h2>{tab} settings</h2>
                  <p>
                    Changes are validated, saved, and recorded in the audit
                    trail.
                  </p>
                </div>
              </div>
              <Form
                key={tab}
                fields={
                  tab === "General"
                    ? [
                        {
                          name: "name",
                          label: "Platform name",
                          required: true,
                        },
                        {
                          name: "tagline",
                          label: "A few words about your platform",
                        },
                        {
                          name: "locale",
                          label: "Default language",
                          type: "select",
                          options: ["en", "hi", "es", "fr"],
                          required: true,
                        },
                        {
                          name: "timezone",
                          label: "Default timezone",
                          type: "select",
                          options: [
                            "Asia/Kolkata",
                            "UTC",
                            "Europe/London",
                            "America/New_York",
                          ],
                          required: true,
                        },
                      ]
                    : tab === "Learning"
                      ? [
                          {
                            name: "weeklyGoal",
                            label: "Default weekly learning goal (minutes)",
                            type: "number",
                            required: true,
                          },
                          {
                            name: "aiBudget",
                            label: "Monthly AI budget preference (USD)",
                            type: "number",
                            required: true,
                          },
                        ]
                      : [
                          {
                            name: "retentionDays",
                            label: "Retention preference (days)",
                            type: "number",
                            required: true,
                          },
                          {
                            name: "maintenance",
                            label: "Maintenance announcement preference",
                            type: "checkbox",
                            help: "Saved configuration only. This does not disable the API.",
                          },
                        ]
                }
                initial={data}
                onSubmit={async (v) => {
                  await patch("/admin/settings", v);
                  reload();
                  toast("Settings saved.");
                }}
              />
            </>
          )}
        </section>
      </div>
    </>
  );
}
function Account({ user, onLogout }: { user: Row; onLogout: () => void }) {
  const sessions = useData("/me/sessions");
  const toast = useToast();
  return (
    <>
      <PageHeading
        title="Your workspace account"
        description="A little control over the things that keep your account safe."
      />
      <div className="panel account-panel">
        <div className="profile-summary">
          <Avatar name={user.name} size="large" />
          <div>
            <h2>{user.name}</h2>
            <p>
              {user.email} · {user.role}
            </p>
          </div>
        </div>
        <div className="notice">
          <Icon name="ShieldAlert" />
          This prototype uses password authentication. Privileged MFA, SSO, and
          recovery delivery need production integrations.
        </div>
        <h3>Active sessions</h3>
        {sessions.data?.map((s: Row) => (
          <div className="setting-row" key={s.id}>
            <div>
              <strong>{s.current ? "This browser" : "Another session"}</strong>
              <p>
                {s.device.slice(0, 70)} ·{" "}
                {new Date(s.created).toLocaleDateString()}
              </p>
            </div>
            {!s.current && (
              <button
                className="btn danger"
                onClick={async () => {
                  await api("/me/sessions/" + s.id, { method: "DELETE" });
                  sessions.reload();
                  toast("Session revoked.");
                }}
              >
                Revoke
              </button>
            )}
          </div>
        ))}
        <button className="btn danger spaced" onClick={onLogout}>
          <Icon name="LogOut" size={16} />
          Sign out
        </button>
      </div>
    </>
  );
}

function GroupMembers({
  group,
  onUpdate,
}: {
  group: Row;
  onUpdate: (g: Row) => void;
}) {
  const users = useData("/admin/users"),
    courses = useData("/admin/courses"),
    toast = useToast();
  const [ids, setIds] = useState<string[]>(group.userIds || []),
    [reason, setReason] = useState(""),
    [course, setCourse] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="group-members">
      <h3>People growing together.</h3>
      <p className="subtle small">
        Choose members, save the roster, then assign a course to the whole
        cohort.
      </p>
      <div className="group-roster">
        {users.data
          ?.filter((u: Row) => u.tenant === group.tenant || !group.tenant)
          .map((u: Row) => (
            <label key={u.id}>
              <input
                type="checkbox"
                checked={ids.includes(u.id)}
                onChange={() =>
                  setIds(
                    ids.includes(u.id)
                      ? ids.filter((id) => id !== u.id)
                      : [...ids, u.id],
                  )
                }
              />
              <Avatar name={u.name} />
              <span>
                {u.name}
                <small>{u.role}</small>
              </span>
            </label>
          ))}
      </div>
      <label className="standalone-label">
        Reason for membership / access change
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. New design learning cohort"
        />
      </label>
      <div className="button-row">
        <button
          className="btn primary"
          disabled={busy || reason.trim().length < 3}
          onClick={async () => {
            setBusy(true);
            try {
              onUpdate(
                await api("/admin/groups/" + group.id + "/members", {
                  method: "PUT",
                  body: JSON.stringify({ userIds: ids, reason }),
                }),
              );
              toast("Group membership saved.");
            } catch (e) {
              toast((e as Error).message, "error");
            } finally {
              setBusy(false);
            }
          }}
        >
          Save {ids.length} members
        </button>
      </div>
      <label className="standalone-label">
        Assign a published course
        <select value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="">Choose a course</option>
          {courses.data
            ?.filter((c: Row) => c.status === "Published")
            .map((c: Row) => (
              <option value={c.id} key={c.id}>
                {c.title}
              </option>
            ))}
        </select>
      </label>
      <button
        className="btn spaced"
        disabled={busy || !course || reason.trim().length < 3}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await post("/admin/groups/" + group.id + "/enrolments", {
              courseId: course,
              reason,
            });
            toast(`Course assigned to ${r.assigned} saved group members.`);
          } catch (e) {
            toast((e as Error).message, "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Icon name="BookPlus" size={16} />
        Assign to saved roster
      </button>
    </section>
  );
}

export { ResourcePage, DataTable, Audit, Operations, Intelligence };
