"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import {
  Plus,
  Clock,
  Calendar,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import { formatDistanceToNow, format, isPast, differenceInHours } from "date-fns";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

type Filter = "all" | "active" | "completed";

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-[#00b894]", text: "text-white" },
  medium: { label: "Medium", color: "bg-[#fdcb6e]", text: "text-[#1a1a2e]" },
  high: { label: "High", color: "bg-orange-400", text: "text-white" },
  urgent: { label: "Urgent", color: "bg-[#e17055]", text: "text-white" },
};

const PANEL_CLASS = "soft-card rounded-[1.7rem] p-5";

function getCountdown(dueDate: string): { text: string; isOverdue: boolean; isUrgent: boolean } {
  const due = new Date(dueDate);
  if (isPast(due)) {
    return { text: "Overdue!", isOverdue: true, isUrgent: true };
  }
  const hoursLeft = differenceInHours(due, new Date());
  if (hoursLeft < 24) {
    return {
      text: `${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""} left`,
      isOverdue: false,
      isUrgent: true,
    };
  }
  return {
    text: formatDistanceToNow(due, { addSuffix: false }) + " left",
    isOverdue: false,
    isUrgent: false,
  };
}

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPriority, setFormPriority] = useState<Deadline["priority"]>("medium");
  const [formCategory, setFormCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDeadlines = useCallback(async () => {
    try {
      const res = await fetch("/api/deadlines");
      if (res.ok) {
        const data = await res.json();
        setDeadlines(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormDueDate("");
    setFormPriority("medium");
    setFormCategory("");
    setEditingDeadline(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (deadline: Deadline) => {
    setEditingDeadline(deadline);
    setFormTitle(deadline.title);
    setFormDescription(deadline.description ?? "");
    setFormDueDate(format(new Date(deadline.dueDate), "yyyy-MM-dd'T'HH:mm"));
    setFormPriority(deadline.priority);
    setFormCategory(deadline.category ?? "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDueDate) return;
    setSubmitting(true);

    try {
      if (editingDeadline) {
        const res = await fetch(`/api/deadlines/${editingDeadline.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            description: formDescription.trim() || null,
            dueDate: new Date(formDueDate).toISOString(),
            priority: formPriority,
            category: formCategory.trim() || null,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setDeadlines((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          );
        }
      } else {
        const res = await fetch("/api/deadlines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            description: formDescription.trim() || null,
            dueDate: new Date(formDueDate).toISOString(),
            priority: formPriority,
            category: formCategory.trim() || null,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setDeadlines((prev) => [...prev, created]);
        }
      }
      closeModal();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComplete = async (deadline: Deadline) => {
    try {
      const res = await fetch(`/api/deadlines/${deadline.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !deadline.completed }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDeadlines((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d))
        );
      }
    } catch {
      // silently fail
    }
  };

  const deleteDeadline = async (id: string) => {
    try {
      const res = await fetch(`/api/deadlines/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeadlines((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      // silently fail
    }
  };

  const filtered = deadlines
    .filter((d) => {
      if (filter === "active") return !d.completed;
      if (filter === "completed") return d.completed;
      return true;
    })
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
  ];

  const activeCount = deadlines.filter((d) => !d.completed).length;
  const completedCount = deadlines.filter((d) => d.completed).length;
  const urgentCount = deadlines.filter((d) => !d.completed && getCountdown(d.dueDate).isUrgent).length;

  return (
    <>
      <Header title="Deadlines" />

      <section className="mb-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-strong rounded-[2rem] p-6 sm:p-7">
          <div className="section-label">
            <span className="status-dot" />
            your timeline at a glance
          </div>
          <h2 className="mt-5 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl" data-display="true">
            Keep every commitment visible before it gets loud.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            Track due dates, spot urgent work early, and keep your deadlines feeling organized instead of overwhelming.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Active</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{activeCount}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Urgent</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--danger)]">{urgentCount}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Completed</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--success)]">{completedCount}</p>
            </div>
          </div>
        </div>

        <div className={`${PANEL_CLASS} flex flex-col justify-between`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">planning note</p>
            <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]" data-display="true">
              A calm list now saves a rushed week later.
            </p>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-[rgba(255,250,244,0.74)] px-4 py-3">
              <span className="text-[var(--muted)]">View</span>
              <span className="font-semibold text-[var(--foreground)] capitalize">{filter}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[rgba(255,250,244,0.74)] px-4 py-3">
              <span className="text-[var(--muted)]">Next step</span>
              <span className="font-semibold text-[var(--foreground)]">Add or refine a date</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="segmented-control w-fit flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`segmented-pill transition-all ${
                filter === f.key
                  ? "segmented-pill-active"
                  : "hover:text-[var(--foreground)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={openAddModal}
          className="cozy-button inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
        >
          <Plus size={18} />
          Add Deadline
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="soft-card-strong flex flex-col items-center justify-center rounded-[2rem] py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
            <Calendar size={28} className="text-[var(--muted)]" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-[var(--foreground)]">
            {filter === "completed"
              ? "No completed deadlines yet"
              : filter === "active"
              ? "No active deadlines"
              : "No deadlines yet"}
          </h3>
          <p className="text-sm text-[var(--muted)] max-w-sm">
            {filter === "all"
              ? "Add your first deadline to stay on track. NudgeAI will remind you as it approaches!"
              : filter === "active"
              ? "All caught up! Add a new deadline or check your completed ones."
              : "Complete a deadline and it will show up here."}
          </p>
          {filter !== "completed" && (
            <button
              onClick={openAddModal}
              className="cozy-button mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus size={16} />
              Add Deadline
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((deadline) => {
            const countdown = getCountdown(deadline.dueDate);
            const priorityCfg = PRIORITY_CONFIG[deadline.priority];

            return (
              <div
                key={deadline.id}
                className={`soft-card rounded-[1.6rem] p-4 transition-colors hover:border-[var(--primary-light)] sm:p-5 ${
                  deadline.completed ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleComplete(deadline)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      deadline.completed
                        ? "bg-[var(--success)] border-[var(--success)]"
                        : "border-[var(--border)] hover:border-[var(--primary)]"
                    }`}
                    aria-label={
                      deadline.completed
                        ? "Mark as incomplete"
                        : "Mark as complete"
                    }
                  >
                    {deadline.completed && (
                      <Check size={12} className="text-white" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3
                        className={`font-semibold text-[var(--foreground)] ${
                          deadline.completed ? "line-through" : ""
                        }`}
                      >
                        {deadline.title}
                      </h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityCfg.color} ${priorityCfg.text}`}>
                        {priorityCfg.label}
                      </span>
                      {deadline.category && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--primary-light)]/20 text-[var(--primary)] border border-[var(--primary-light)]/30">
                          {deadline.category}
                        </span>
                      )}
                    </div>

                    {deadline.description && (
                      <p className="text-sm text-[var(--muted)] mb-2 line-clamp-2">
                        {deadline.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {format(new Date(deadline.dueDate), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      {!deadline.completed && (
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            countdown.isOverdue
                              ? "text-[var(--danger)]"
                              : countdown.isUrgent
                              ? "text-[var(--warning)]"
                              : "text-[var(--muted)]"
                          }`}
                        >
                          {countdown.isOverdue ? (
                            <AlertCircle size={13} />
                          ) : (
                            <Clock size={13} />
                          )}
                          {countdown.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(deadline)}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                      aria-label="Edit deadline"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => deleteDeadline(deadline.id)}
                      className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-[var(--danger)]"
                      aria-label="Delete deadline"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />

          <div className="soft-card-strong relative w-full max-w-lg rounded-[1.9rem]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                {editingDeadline ? "Edit Deadline" : "Add Deadline"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Title <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Submit project proposal"
                  required
                  className="soft-input px-3 py-2 text-sm placeholder:text-[var(--muted)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional details about this deadline..."
                  rows={3}
                  className="soft-input resize-none px-3 py-2 text-sm placeholder:text-[var(--muted)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Due Date <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  required
                  className="soft-input px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Tip: You can type dates naturally, e.g., &quot;next Friday&quot; or &quot;in 3 days&quot;
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) =>
                      setFormPriority(e.target.value as Deadline["priority"])
                    }
                    className="soft-input px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g., Work, School"
                    className="soft-input px-3 py-2 text-sm placeholder:text-[var(--muted)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formTitle.trim() || !formDueDate}
                  className="cozy-button rounded-xl px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingDeadline
                    ? "Save Changes"
                    : "Add Deadline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
