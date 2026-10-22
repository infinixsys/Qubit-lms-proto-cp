import { useState } from "react";
import {
  post,
  useData,
  useToast,
  Icon,
  Badge,
  Form,
  Modal,
  Loading,
  ErrorState,
} from "./ui";
import type { Row } from "./ui";
import { CenterHeading, saveFile } from "./control-center";
import { date } from "./coaching-ui";
export function Security() {
  const d = useData("/owner/security"),
    toast = useToast();
  const [setup, setSetup] = useState(false),
    [secret, setSecret] = useState(""),
    [codes, setCodes] = useState<string[] | null>(null),
    [disable, setDisable] = useState(false),
    [session, setSession] = useState<Row | null>(null);
  return (
    <>
      <CenterHeading
        title="Security & sessions"
        text="Protect your staff account with an authenticator and review where you are signed in."
      />
      {d.error ? (
        <ErrorState error={d.error} retry={d.reload} />
      ) : !d.data ? (
        <Loading />
      ) : (
        <>
          <section className="mfa-status coach-panel">
            <span className="security-emblem">
              <Icon name="ShieldCheck" size={30} />
            </span>
            <div>
              <Badge>
                {d.data.enabled ? "Authenticator enabled" : "Password only"}
              </Badge>
              <h2>
                {d.data.enabled
                  ? "Your sign-in has a second step"
                  : "Add an extra layer of protection"}
              </h2>
              <p>
                {d.data.enabled
                  ? `${d.data.recoveryCodesRemaining} recovery codes remaining. Each recovery code works once.`
                  : "Use a compatible authenticator app. Setup requires your password and a valid code before it takes effect."}
              </p>
            </div>
            <button
              className="btn primary"
              onClick={() =>
                d.data.enabled
                  ? setDisable(true)
                  : (setSetup(true), setSecret(""))
              }
            >
              {d.data.enabled ? "Manage authenticator" : "Set up authenticator"}
            </button>
          </section>
          <section className="coach-panel control-padded">
            <div className="panel-heading">
              <div>
                <h2>Active staff sessions</h2>
                <p>
                  Revoke an unfamiliar session. Your current session stays
                  signed in.
                </p>
              </div>
              <Icon name="Monitor" />
            </div>
            {d.data.sessions.map((s: Row) => (
              <div className="list-row" key={s.id}>
                <span className="soft-icon">
                  <Icon name="Monitor" size={18} />
                </span>
                <div>
                  <strong>{s.device || "Browser session"}</strong>
                  <small>
                    {date(s.created, { hour: "2-digit", minute: "2-digit" })} ·
                    expires {date(s.expires)}
                  </small>
                </div>
                {s.current ? (
                  <Badge>Current session</Badge>
                ) : (
                  <button className="btn small" onClick={() => setSession(s)}>
                    Revoke session
                  </button>
                )}
              </div>
            ))}
          </section>
          <details className="academy-control-section">
            <summary>Recent sign-in & security activity</summary>
            {d.data.events.map((e: Row, i: number) => (
              <div className="list-row" key={i}>
                <div>
                  <strong>{e.action}</strong>
                  <small>
                    {date(e.created, { hour: "2-digit", minute: "2-digit" })}
                  </small>
                </div>
                <Badge>{e.result}</Badge>
              </div>
            ))}
          </details>
        </>
      )}
      {setup && (
        <Modal
          title="Set up authenticator verification"
          subtitle="Use your authenticator app's Enter setup key option."
          onClose={() => {
            setSetup(false);
            setSecret("");
          }}
        >
          {!secret ? (
            <Form
              fields={[
                {
                  name: "password",
                  label: "Confirm current password",
                  type: "password",
                  required: true,
                },
              ]}
              label="Generate setup key"
              onSubmit={async (v) =>
                setSecret((await post("/owner/security/enrol", v)).secret)
              }
            />
          ) : (
            <>
              <p>
                Account: Refix India Institute. Choose a time-based code and
                enter this setup key.
              </p>
              <label className="control-label">
                Authenticator setup key
                <input className="setup-secret" readOnly value={secret} />
              </label>
              <button
                className="btn small"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(secret);
                    toast("Setup key copied.");
                  } catch {
                    toast("Select and copy the key manually.");
                  }
                }}
              >
                Copy setup key
              </button>
              <Form
                fields={[
                  {
                    name: "code",
                    label: "6-digit authenticator code",
                    required: true,
                  },
                ]}
                label="Confirm & enable authenticator"
                onSubmit={async (v) => {
                  const r = await post("/owner/security/confirm", v);
                  setSetup(false);
                  setSecret("");
                  setCodes(r.recoveryCodes);
                  d.reload();
                }}
              />
            </>
          )}
        </Modal>
      )}
      {codes && (
        <Modal
          title="Save your recovery codes"
          subtitle="Each code works once if you lose access to your authenticator. These codes are shown only now."
          onClose={() => setCodes(null)}
        >
          <div className="recovery-codes">
            {codes.map((c) => (
              <code key={c}>{c}</code>
            ))}
          </div>
          <button
            className="btn primary"
            onClick={() =>
              saveFile(
                "refix-institute-recovery-codes.txt",
                codes.join("\n"),
                "text/plain",
              )
            }
          >
            Save recovery codes
          </button>
        </Modal>
      )}
      {disable && (
        <Modal
          title="Disable authenticator verification"
          subtitle="Your password and an unused authenticator or recovery code are required. Other sessions are revoked."
          onClose={() => setDisable(false)}
        >
          <Form
            fields={[
              {
                name: "password",
                label: "Current password",
                type: "password",
                required: true,
              },
              {
                name: "code",
                label: "Authenticator or recovery code",
                required: true,
              },
              { name: "reason", label: "Reason for disabling", required: true },
            ]}
            label="Disable authenticator"
            onSubmit={async (v) => {
              await post("/owner/security/disable", v);
              setDisable(false);
              d.reload();
              toast("Authenticator disabled. Other sessions were revoked.");
            }}
          />
        </Modal>
      )}
      {session && (
        <Modal
          title="Revoke staff session"
          subtitle={session.device}
          onClose={() => setSession(null)}
        >
          <Form
            fields={[
              {
                name: "reason",
                label: "Session revocation reason",
                required: true,
              },
            ]}
            label="Revoke this session"
            onSubmit={async (v) => {
              await post(
                "/owner/security/sessions/" + session.id + "/revoke",
                v,
              );
              setSession(null);
              d.reload();
              toast("Session revoked.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
