import { useEffect, useRef, useState } from "react";
import {
  api,
  Icon,
  Loading,
  ErrorState,
  useData,
  absoluteApiPath,
  useToast,
} from "./ui";
import type { Row } from "./ui";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = pdfWorker;
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
export const date = (s: string, options: Intl.DateTimeFormatOptions = {}) =>
  s
    ? new Date(s).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
        ...options,
      })
    : "—";
export function CoursePhoto({
  course: c,
  className = "",
}: {
  course: Row;
  className?: string;
}) {
  const cover = useData(
    c.thumbnailAssetId ? "/assets/" + c.thumbnailAssetId + "/access" : "",
  );
  return (
    <img
      className={"course-photo " + className}
      src={
        cover.data?.url
          ? absoluteApiPath(cover.data.url)
          : c.image || "/images/physics.png"
      }
      alt={c.category + " institute course"}
      loading="lazy"
    />
  );
}
export function Stat({
  label,
  value,
  note,
  icon,
  accent = "teal",
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="coach-stat">
      <div>
        <span>{label}</span>
        <span className={"stat-symbol " + accent}>
          <Icon name={icon} size={20} />
        </span>
      </div>
      <strong>{value}</strong>
      {note && <p>{note}</p>}
    </div>
  );
}
export function PdfReader({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<any>(null),
    [page, setPage] = useState(1),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setErr("");
    const task = getDocument({ url });
    task.promise
      .then((p) => {
        if (live) {
          setPdf(p);
          setPage(1);
        }
      })
      .catch((e) => {
        if (live)
          setErr(
            "Unable to preview this PDF. Download it to open with a document reader.",
          );
      });
    return () => {
      live = false;
      task.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let task: any,
      live = true;
    setBusy(true);
    pdf
      .getPage(page)
      .then((p: any) => {
        if (!live) return;
        const width = Math.min(container.current?.clientWidth || 600, 900) - 24,
          viewport = p.getViewport({
            scale: width / p.getViewport({ scale: 1 }).width,
          }),
          element = canvas.current!;
        element.width = viewport.width * 1.5;
        element.height = viewport.height * 1.5;
        element.style.width = viewport.width + "px";
        element.style.height = viewport.height + "px";
        task = p.render({
          canvasContext: element.getContext("2d"),
          viewport,
          transform: [1.5, 0, 0, 1.5, 0, 0],
        });
        return task.promise;
      })
      .then(() => {
        if (live) setBusy(false);
      })
      .catch(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
      task?.cancel();
    };
  }, [pdf, page]);
  return (
    <div className="pdf-reader" ref={container}>
      <div className="pdf-toolbar">
        <button
          className="btn"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <Icon name="ChevronLeft" size={16} />
          Previous
        </button>
        <span>
          Page {page} of {pdf?.numPages || "…"}
        </span>
        <button
          className="btn"
          disabled={!pdf || page >= pdf.numPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
          <Icon name="ChevronRight" size={16} />
        </button>
      </div>
      {err ? (
        <ErrorState error={err} />
      ) : (
        <>
          {busy && <div className="pdf-loading">Loading page…</div>}
          <canvas ref={canvas} aria-label={"PDF page " + page} />
        </>
      )}
    </div>
  );
}
export function ResourceViewer({ assetId }: { assetId: string }) {
  const { data: a, error, reload } = useData("/assets/" + assetId + "/access");
  const video = useRef<HTMLVideoElement>(null),
    position = useRef(0),
    playing = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      position.current = video.current?.currentTime || 0;
      playing.current = !!video.current && !video.current.paused;
      reload();
    }, 4 * 60000);
    return () => clearInterval(t);
  }, [assetId]);
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!a) return <Loading />;
  const url = absoluteApiPath(a.url);
  return (
    <div className="resource-viewer">
      {a.type.startsWith("video/") ? (
        <video
          ref={video}
          controls
          playsInline
          preload="metadata"
          src={url}
          onLoadedMetadata={() => {
            if (video.current) {
              video.current.currentTime = position.current;
              if (playing.current) video.current.play().catch(() => {});
            }
          }}
          onError={() => {}}
          aria-label={a.title}
        />
      ) : a.type.startsWith("image/") ? (
        <img src={url} alt={a.title} />
      ) : a.type === "application/pdf" ? (
        <PdfReader url={url} />
      ) : a.previewText ? (
        <article className="word-preview">
          <span className="eyebrow">DOCUMENT READING VIEW</span>
          <h3>{a.title}</h3>
          {a.previewText
            .split(/\n+/)
            .filter(Boolean)
            .map((line: string, i: number) => (
              <p key={i}>{line}</p>
            ))}
        </article>
      ) : (
        <div className="resource-download">
          <Icon name="FileText" size={38} />
          <h3>{a.title}</h3>
          <p>Open this resource in your device’s document reader.</p>
        </div>
      )}
      <div className="resource-footer">
        <span>
          <Icon
            name={a.type.startsWith("video/") ? "Video" : "FileText"}
            size={16}
          />
          {a.title}
        </span>
        <a
          className="text-link"
          href={url + "&download=1"}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="Download" size={15} />
          Download
        </a>
      </div>
    </div>
  );
}
export function AssetUpload({
  onUpload,
  purpose = "course",
}: {
  onUpload: (a: Row) => void;
  purpose?: "course" | "receipt";
}) {
  const [rights, setRights] = useState(purpose === "receipt"),
    [progress, setProgress] = useState(-1),
    [err, setErr] = useState("");
  const toast = useToast();
  return (
    <div className="asset-upload">
      {purpose === "course" && (
        <label className="upload-rights">
          <input
            type="checkbox"
            checked={rights}
            onChange={(e) => setRights(e.target.checked)}
          />
          I have permission to share this content with learners.
        </label>
      )}
      <label className={"upload-drop " + (!rights ? "disabled" : "")}>
        <Icon name="Upload" size={25} />
        <strong>
          {progress >= 0
            ? "Uploading… " + progress + "%"
            : "Choose a " +
              (purpose === "receipt"
                ? "payment receipt"
                : "video, image or document")}
        </strong>
        <small>
          {purpose === "receipt"
            ? "JPG, PNG or PDF"
            : "MP4, WebM, JPG, PNG, PDF, DOC, DOCX · videos up to 300 MB"}
        </small>
        <input
          type="file"
          disabled={!rights || progress >= 0}
          accept={
            purpose === "receipt"
              ? ".jpg,.jpeg,.png,.pdf"
              : ".mp4,.webm,.jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
          }
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setErr("");
            setProgress(0);
            const form = new FormData();
            form.append("rights", "true");
            form.append("file", file);
            try {
              const xhr = new XMLHttpRequest();
              const result = await new Promise<Row>((resolve, reject) => {
                xhr.open(
                  "POST",
                  "/api/v1/" +
                    (purpose === "receipt"
                      ? "coaching/receipt"
                      : "owner/assets"),
                );
                xhr.setRequestHeader(
                  "X-Qubit-Surface",
                  purpose === "receipt" ? "learner" : "admin",
                );
                xhr.withCredentials = true;
                xhr.upload.onprogress = (ev) => {
                  if (ev.lengthComputable)
                    setProgress(Math.round((ev.loaded / ev.total) * 100));
                };
                xhr.onload = () => {
                  try {
                    const data = JSON.parse(xhr.responseText);
                    xhr.status >= 200 && xhr.status < 300
                      ? resolve(data)
                      : reject(
                          new Error(data.error?.message || "Upload failed."),
                        );
                  } catch {
                    reject(new Error("Upload failed."));
                  }
                };
                xhr.onerror = () =>
                  reject(
                    new Error(
                      "Connection interrupted. Please try the upload again.",
                    ),
                  );
                xhr.send(form);
              });
              onUpload(result);
              toast("Resource uploaded successfully.");
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setProgress(-1);
              e.target.value = "";
            }
          }}
        />
      </label>
      {progress >= 0 && (
        <div className="progress-track">
          <span style={{ width: progress + "%" }} />
        </div>
      )}
      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
