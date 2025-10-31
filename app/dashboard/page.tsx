"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

type StatusType = "waiting" | "interview" | "rejected" | "hired";

type ApplicationRecord = {
  id: string;
  user_id: string;
  company: string;
  position: string;
  applied_at: string;
  status: StatusType;
  notes: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [userEmail, setUserEmail] = useState("");
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [filter, setFilter] = useState<"all" | StatusType>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingExport, setLoadingExport] = useState(false);
  const [form, setForm] = useState({
    company: "",
    position: "",
    applied_at: new Date().toISOString().slice(0, 10),
    status: "waiting" as StatusType,
    notes: "",
  });

  const isDark = theme === "dark";

  // load user + apps
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        router.replace("/");
        return;
      }
      setUserEmail(data.user.email || "");
      const { data: apps } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", data.user.id)
        .order("applied_at", { ascending: false });
      setApplications((apps || []) as ApplicationRecord[]);
    };
    load();
  }, [router]);

  const filteredApps = useMemo(() => {
    if (filter === "all") return applications;
    return applications.filter((a) => a.status === filter);
  }, [applications, filter]);

  const analytics = useMemo(() => {
    return {
      total: applications.length,
      waiting: applications.filter((a) => a.status === "waiting").length,
      interview: applications.filter((a) => a.status === "interview").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
      hired: applications.filter((a) => a.status === "hired").length,
    };
  }, [applications]);

  const toggleTheme = () => setTheme((p) => (p === "dark" ? "light" : "dark"));

  const openCreate = () => {
    setEditingId(null);
    setForm({
      company: "",
      position: "",
      applied_at: new Date().toISOString().slice(0, 10),
      status: "waiting",
      notes: "",
    });
    setShowModal(true);
  };

  const openEdit = (app: ApplicationRecord) => {
    setEditingId(app.id);
    setForm({
      company: app.company,
      position: app.position,
      applied_at: app.applied_at,
      status: app.status,
      notes: app.notes || "",
    });
    setShowModal(true);
  };

  const saveApp = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return;
    const payload = {
      user_id: data.user.id,
      company: form.company.trim(),
      position: form.position.trim(),
      applied_at: form.applied_at,
      status: form.status,
      notes: form.notes,
    };
    if (editingId) {
      const { data: updated, error } = await supabase
        .from("applications")
        .update(payload)
        .eq("id", editingId)
        .select();
      if (!error && updated) {
        setApplications((prev) => prev.map((p) => (p.id === editingId ? (updated[0] as any) : p)));
      }
    } else {
      const { data: inserted, error } = await supabase.from("applications").insert(payload).select();
      if (!error && inserted) {
        setApplications((prev) => [inserted[0] as any, ...prev]);
      }
    }
    setShowModal(false);
    setEditingId(null);
  };

  const deleteApp = async (id: string) => {
    if (!confirm("Hapus lamaran ini?")) return;
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (!error) {
      setApplications((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const exportCSV = async () => {
    setLoadingExport(true);
    try {
      const rows = [
        ["Company", "Position", "Applied At", "Status", "Notes"],
        ...applications.map((a) => [
          a.company,
          a.position,
          a.applied_at,
          a.status,
          (a.notes || "").replace(/\n/g, " "),
        ]),
      ];
      const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jobtrackr.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoadingExport(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <div className={isDark ? "min-h-screen bg-slate-950 text-white" : "min-h-screen bg-slate-100 text-slate-900"}>
      {/* header */}
      <header className={(isDark ? "bg-slate-950/85 " : "bg-slate-100/85 ") + "sticky top-0 z-30 backdrop-blur border-b border-slate-800/10"}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">Hi, {userEmail}</h1>
            <p className="text-xs opacity-70">Pantau lamaran kamu di sini.</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <button
              onClick={toggleTheme}
              className={
                (isDark ? "bg-slate-900/60 border-slate-600/50 " : "bg-white border-slate-300 ") +
                "w-10 h-10 rounded-full border flex items-center justify-center transition"
              }
              aria-label="Toggle theme"
            >
              {isDark ? <SunIcon className="w-5 h-5 text-yellow-300" /> : <MoonIcon className="w-5 h-5 text-slate-700" />}
            </button>
            <button onClick={exportCSV} className="px-4 py-2 rounded-xl bg-emerald-500 text-sm font-medium hover:bg-emerald-600">
              {loadingExport ? "Export..." : "Export to Excel"}
            </button>
            <button
              onClick={openCreate}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-sm font-medium shadow-lg shadow-blue-500/30"
            >
              + Add Application
            </button>
            <button onClick={logout} className={isDark ? "px-4 py-2 rounded-xl border border-slate-500/40" : "px-4 py-2 rounded-xl bg-white border"}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        {/* analytics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AnalyticCard dark={isDark} label="Total Applications" value={analytics.total} desc="semua lamaran kamu" />
          <AnalyticCard dark={isDark} label="Waiting" value={analytics.waiting} desc="menunggu jawaban" accent="text-orange-400" />
          <AnalyticCard dark={isDark} label="Interview" value={analytics.interview} desc="siapkan dirimu" accent="text-blue-400" />
          <AnalyticCard dark={isDark} label="Hired" value={analytics.hired} desc="selamat 🎉" accent="text-emerald-400" />
        </div>

        {/* filters */}
        <div className="flex gap-2 flex-wrap">
          {["all", "waiting", "interview", "rejected", "hired"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={
                f === filter
                  ? "px-4 py-1 rounded-full bg-blue-500 text-white text-sm capitalize"
                  : "px-4 py-1 rounded-full border border-slate-500/20 text-sm capitalize"
              }
            >
              {f}
            </button>
          ))}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden lg:block rounded-xl overflow-hidden border border-slate-700/20 bg-slate-950/20 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className={isDark ? "bg-slate-900/60" : "bg-slate-200"}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide">Company</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide">Position</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide">Applied</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide">Notes</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      No applications.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="border-t border-slate-700/15">
                      <td className="px-4 py-3">{app.company}</td>
                      <td className="px-4 py-3">{app.position}</td>
                      <td className="px-4 py-3">{app.applied_at}</td>
                      <td className="px-4 py-3">
                        <span className={statusClass(app.status)}>{app.status}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate">{app.notes}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={() => openEdit(app)} className="px-2 py-1 text-xs rounded-md bg-slate-700/50 hover:bg-slate-700">
                          Edit
                        </button>
                        <button onClick={() => deleteApp(app.id)} className="px-2 py-1 text-xs rounded-md bg-red-500/80 hover:bg-red-500">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="flex flex-col gap-3 lg:hidden">
          {filteredApps.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">No applications.</div>
          ) : (
            filteredApps.map((app) => (
              <div
                key={app.id}
                className={
                  (isDark ? "bg-slate-900/50 " : "bg-white ") +
                  "rounded-2xl border border-slate-700/20 p-4 shadow-[0_10px_35px_rgba(0,0,0,.25)] space-y-3"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{app.company}</div>
                    <div className="text-xs opacity-70">{app.position}</div>
                    <div className="text-[10px] opacity-50 mt-1">Applied: {app.applied_at}</div>
                  </div>
                  <span className={statusChip(app.status)}>{app.status}</span>
                </div>
                {app.notes ? <p className="text-xs opacity-85 leading-relaxed">{app.notes}</p> : null}
                <div className="flex gap-2">
                  <button onClick={() => openEdit(app)} className="px-3 py-1 text-xs rounded-md bg-slate-700/50">
                    Edit
                  </button>
                  <button onClick={() => deleteApp(app.id)} className="px-3 py-1 text-xs rounded-md bg-red-500/80">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL */}
      {showModal ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className={isDark ? "bg-slate-950 rounded-xl p-4 w-full max-w-md border border-slate-600/30" : "bg-white rounded-xl p-4 w-full max-w-md"}>
            <h2 className="text-lg font-semibold mb-1">{editingId ? "Edit Application" : "New Application"}</h2>
            <p className="text-xs opacity-60 mb-3">Isi data lamaranmu ya.</p>
            <div className="space-y-2 mb-4">
              <input
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                placeholder="Company"
                className={
                  (isDark ? "bg-slate-900/40 border-slate-700/40 " : "bg-slate-100 border-slate-200 ") +
                  "w-full px-3 py-2 rounded-md border text-sm outline-none"
                }
              />
              <input
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                placeholder="Position"
                className={
                  (isDark ? "bg-slate-900/40 border-slate-700/40 " : "bg-slate-100 border-slate-200 ") +
                  "w-full px-3 py-2 rounded-md border text-sm outline-none"
                }
              />
              <input
                type="date"
                value={form.applied_at}
                onChange={(e) => setForm((p) => ({ ...p, applied_at: e.target.value }))}
                className={
                  (isDark ? "bg-slate-900/40 border-slate-700/40 " : "bg-slate-100 border-slate-200 ") +
                  "w-full px-3 py-2 rounded-md border text-sm outline-none"
                }
              />
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as StatusType }))}
                className={
                  (isDark ? "bg-slate-900/40 border-slate-700/40 " : "bg-slate-100 border-slate-200 ") +
                  "w-full px-3 py-2 rounded-md border text-sm outline-none"
                }
              >
                <option value="waiting">waiting</option>
                <option value="interview">interview</option>
                <option value="rejected">rejected</option>
                <option value="hired">hired</option>
              </select>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes"
                className={
                  (isDark ? "bg-slate-900/40 border-slate-700/40 " : "bg-slate-100 border-slate-200 ") +
                  "w-full px-3 py-2 rounded-md border text-sm outline-none min-h-[70px]"
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md border border-slate-600/30 text-sm">
                Cancel
              </button>
              <button onClick={saveApp} className="px-4 py-2 rounded-md bg-blue-500 text-sm">
                {editingId ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AnalyticCard({ dark, label, value, desc, accent }: { dark: boolean; label: string; value: number; desc: string; accent?: string }) {
  return (
    <div
      className={
        (dark ? "bg-slate-900/40 border-slate-800/50 " : "bg-white border-slate-200 ") +
        "rounded-2xl border p-4 shadow-[0_15px_40px_rgba(0,0,0,.12)]"
      }
    >
      <div className="text-xs opacity-75">{label}</div>
      <div className={"text-2xl font-bold mt-2 " + (accent || "")}>{value}</div>
      <div className="text-[10px] opacity-60 mt-1">{desc}</div>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "hired") return "inline-flex px-3 py-1 text-xs rounded-full bg-emerald-500/15 text-emerald-300 capitalize";
  if (status === "rejected") return "inline-flex px-3 py-1 text-xs rounded-full bg-red-500/15 text-red-300 capitalize";
  if (status === "interview") return "inline-flex px-3 py-1 text-xs rounded-full bg-blue-500/15 text-blue-300 capitalize";
  return "inline-flex px-3 py-1 text-xs rounded-full bg-amber-500/15 text-amber-200 capitalize";
}

function statusChip(status: string) {
  if (status === "hired") return "px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 text-[10px] capitalize";
  if (status === "rejected") return "px-3 py-1 rounded-full bg-red-200 text-red-900 text-[10px] capitalize";
  if (status === "interview") return "px-3 py-1 rounded-full bg-blue-200 text-blue-900 text-[10px] capitalize";
  return "px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-[10px] capitalize";
}
