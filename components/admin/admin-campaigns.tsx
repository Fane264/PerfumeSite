"use client";

import { useState } from "react";
import { Loader2, Plus, Send, Eye, Trash2, X, CalendarX } from "lucide-react";
import toast from "react-hot-toast";
import { adminCampaignsApi, ApiError } from "@/lib/api-client";
import type { ApiCampaign } from "@/lib/campaigns";

const SEGMENTS: { id: string; label: string }[] = [
  { id: "ALL_CUSTOMERS", label: "Toți clienții" },
  { id: "NEWSLETTER_SUBSCRIBERS", label: "Abonați newsletter" },
  { id: "LOYAL_CUSTOMERS", label: "Clienți fideli (Gold + Platinum)" },
  { id: "INACTIVE_90_DAYS", label: "Inactivi 90+ zile" },
  { id: "SUBSCRIPTION_ACTIVE", label: "Abonați activi" },
  { id: "NEW_CUSTOMERS", label: "Clienți noi (30 zile)" },
];

const SEGMENT_LABEL = Object.fromEntries(SEGMENTS.map((s) => [s.id, s.label]));

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SCHEDULED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  SENDING: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  SENT: "bg-success/15 text-success border-success/30",
  CANCELLED: "bg-error/15 text-red-300 border-error/40",
};

export function AdminCampaigns({
  initialCampaigns,
  segmentCounts,
}: {
  initialCampaigns: ApiCampaign[];
  segmentCounts: Record<string, number>;
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [showModal, setShowModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onCreated(c: ApiCampaign) {
    setCampaigns((prev) => [c, ...prev]);
    setShowModal(false);
  }

  async function send(c: ApiCampaign) {
    const count = segmentCounts[c.segment] ?? 0;
    if (
      !window.confirm(
        `Trimiți campania „${c.name}" la ~${count} destinatari. Ești sigur?`,
      )
    )
      return;
    setBusyId(c.id);
    try {
      const updated = await adminCampaignsApi.send(c.id);
      setCampaigns((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      toast.success(`Campanie trimisă (${updated.sentCount} emailuri)`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Trimitere eșuată");
    } finally {
      setBusyId(null);
    }
  }

  async function preview(c: ApiCampaign) {
    setBusyId(c.id);
    try {
      const res = await adminCampaignsApi.preview(c.id);
      toast.success(
        res.sent ? `Preview trimis la ${res.to}` : "Resend neconfigurat",
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Preview eșuat");
    } finally {
      setBusyId(null);
    }
  }

  async function unschedule(c: ApiCampaign) {
    setBusyId(c.id);
    try {
      const updated = await adminCampaignsApi.update(c.id, {
        scheduledAt: null,
      });
      setCampaigns((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      toast.success("Programare anulată — campania revine la draft");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Anulare eșuată");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: ApiCampaign) {
    if (!window.confirm(`Ștergi campania „${c.name}"?`)) return;
    setBusyId(c.id);
    try {
      await adminCampaignsApi.remove(c.id);
      setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
      toast.success("Campanie ștearsă");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Ștergere eșuată");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold-light"
        >
          <Plus className="size-4" /> Campanie nouă
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3 font-medium">Campanie</th>
              <th className="p-3 font-medium">Segment</th>
              <th className="p-3 font-medium">Destinatari</th>
              <th className="p-3 font-medium">Trimise</th>
              <th className="p-3 font-medium">Rată deschidere</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nicio campanie încă.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.subject}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {SEGMENT_LABEL[c.segment] ?? c.segment}
                  </td>
                  <td className="p-3">~{segmentCounts[c.segment] ?? 0}</td>
                  <td className="p-3">{c.sentCount || "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {c.openRate != null ? `${c.openRate}%` : "N/A"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                        STATUS_BADGE[c.status] ?? ""
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.status === "SCHEDULED" && c.scheduledAt && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(c.scheduledAt).toLocaleString("ro-RO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1.5">
                      {busyId === c.id && (
                        <Loader2 className="size-4 animate-spin text-gold" />
                      )}
                      <button
                        type="button"
                        title="Trimite preview"
                        disabled={busyId === c.id}
                        onClick={() => preview(c)}
                        className="rounded-md border border-border p-1.5 hover:border-gold disabled:opacity-50"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      {c.status === "SCHEDULED" && (
                        <button
                          type="button"
                          title="Anulează programarea"
                          disabled={busyId === c.id}
                          onClick={() => unschedule(c)}
                          className="rounded-md border border-border p-1.5 hover:border-amber-500 disabled:opacity-50"
                        >
                          <CalendarX className="size-3.5" />
                        </button>
                      )}
                      {c.status !== "SENT" && c.status !== "SENDING" && (
                        <>
                          <button
                            type="button"
                            title="Trimite acum"
                            disabled={busyId === c.id}
                            onClick={() => send(c)}
                            className="rounded-md border border-gold p-1.5 text-gold hover:bg-gold hover:text-background disabled:opacity-50"
                          >
                            <Send className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Șterge"
                            disabled={busyId === c.id}
                            onClick={() => remove(c)}
                            className="rounded-md border border-border p-1.5 text-red-300 hover:border-error disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CampaignModal
          segmentCounts={segmentCounts}
          onClose={() => setShowModal(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

function CampaignModal({
  segmentCounts,
  onClose,
  onCreated,
}: {
  segmentCounts: Record<string, number>;
  onClose: () => void;
  onCreated: (c: ApiCampaign) => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [segment, setSegment] = useState(SEGMENTS[0]!.id);
  const [html, setHtml] = useState(
    "<p>Bună, {{firstName}},</p>\n<p>Scrie mesajul tău aici…</p>\n<p><a href=\"{{unsubscribeUrl}}\">Dezabonare</a></p>",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(action: "draft" | "schedule") {
    if (!name.trim() || !subject.trim() || !html.trim()) {
      toast.error("Completează nume, subiect și conținut");
      return;
    }
    if (action === "schedule" && !scheduledAt) {
      toast.error("Alege data programării");
      return;
    }
    setSaving(true);
    try {
      const created = await adminCampaignsApi.create({
        name: name.trim(),
        subject: subject.trim(),
        preheader: preheader.trim() || undefined,
        htmlContent: html,
        segment,
        scheduledAt:
          action === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
      });
      toast.success("Campanie creată");
      onCreated(created);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Creare eșuată");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-4xl rounded-xl border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Campanie nouă</h2>
          <button type="button" onClick={onClose} aria-label="Închide">
            <X className="size-5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Form */}
          <div className="space-y-4">
            <Field label="Nume campanie (intern)">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Subiect email">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Preheader (preview în inbox)">
              <input
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Segment destinatari">
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {SEGMENTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — ~{segmentCounts[s.id] ?? 0} destinatari
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Conținut HTML">
              <textarea
                rows={10}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Variabile: <code>{"{{firstName}}"}</code>,{" "}
                <code>{"{{unsubscribeUrl}}"}</code>
              </p>
            </Field>
            <Field label="Programează (opțional)">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
          </div>

          {/* Live preview */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Previzualizare
            </p>
            <div className="h-[28rem] overflow-auto rounded-md border bg-white p-4 text-black">
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: html.replaceAll("{{firstName}}", "Maria").replaceAll(
                    "{{unsubscribeUrl}}",
                    "#",
                  ),
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Anulează
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("schedule")}
            className="rounded-md border border-gold px-4 py-2 text-sm text-gold hover:bg-gold hover:text-background disabled:opacity-50"
          >
            Programează
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("draft")}
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold-light disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salvează draft
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
