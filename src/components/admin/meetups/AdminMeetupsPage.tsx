import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, ImagePlus, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integerations/supabase/client";
import "./admin-meetups.css";

type MeetupStatus = "draft" | "published" | "featured" | "archived";

type Meetup = {
  id: string;
  title: string;
  destination: string;
  event_date: string | null;
  event_time: string | null;
  description: string;
  image_url: string | null;
  image_path: string | null;
  joining_details: string | null;
  join_url: string | null;
  status: MeetupStatus;
  created_at: string;
};

type MeetupForm = Omit<Meetup, "id" | "created_at">;

const emptyForm = (): MeetupForm => ({
  title: "",
  destination: "",
  event_date: null,
  event_time: "",
  description: "",
  image_url: null,
  image_path: null,
  joining_details: "",
  join_url: "",
  status: "draft",
});

function formatEventDate(value: string | null) {
  if (!value) return "Coming Soon";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminMeetupsPage() {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MeetupStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<MeetupForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingMeetup, setViewingMeetup] = useState<Meetup | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMeetups = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        window.location.assign("/admin");
        return;
      }
      const response = await fetch("/api/admin/meetups", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        meetups?: Meetup[];
      };
      if (!response.ok || !result.success) {
        if (response.status === 401 || response.status === 403) {
          window.location.assign("/admin");
          return;
        }
        throw new Error(result.message || "Could not load meetups.");
      }
      setMeetups(result.meetups ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load meetups.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeetups();
  }, [loadMeetups]);

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImagePreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedImage);
    setSelectedImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedImage]);

  const filteredMeetups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return meetups.filter((meetup) => {
      const matchesQuery =
        !query || `${meetup.title} ${meetup.destination}`.toLocaleLowerCase().includes(query);
      return matchesQuery && (statusFilter === "all" || meetup.status === statusFilter);
    });
  }, [meetups, search, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSelectedImage(null);
    setError("");
    setIsFormOpen(true);
  };

  const openEdit = (meetup: Meetup) => {
    setEditingId(meetup.id);
    setForm({
      title: meetup.title,
      destination: meetup.destination,
      event_date: meetup.event_date,
      event_time: meetup.event_time,
      description: meetup.description,
      image_url: meetup.image_url,
      image_path: meetup.image_path,
      joining_details: meetup.joining_details,
      join_url: meetup.join_url,
      status: meetup.status,
    });
    setSelectedImage(null);
    setError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setSelectedImage(null);
  };

  const uploadImage = async (file: File, accessToken: string) => {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/admin/meetups/images", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    });
    const result = (await response.json()) as {
      success?: boolean;
      message?: string;
      image_url?: string;
      image_path?: string;
    };
    if (!response.ok || !result.success || !result.image_url || !result.image_path) {
      throw new Error(result.message || "Could not upload the meetup image.");
    }
    return { image_url: result.image_url, image_path: result.image_path };
  };

  const saveMeetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in as an administrator.");

      const image = selectedImage
        ? await uploadImage(selectedImage, session.access_token)
        : { image_url: form.image_url, image_path: form.image_path };
      const payload = {
        ...form,
        event_date: form.event_date || null,
        event_time: form.event_time?.trim() || null,
        joining_details: form.joining_details?.trim() || null,
        join_url: form.join_url?.trim() || null,
        ...image,
      };
      const response = await fetch(
        editingId ? `/api/admin/meetups/${encodeURIComponent(editingId)}` : "/api/admin/meetups",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save the meetup.");
      }

      setNotice(editingId ? "Meetup updated." : "Meetup created.");
      setIsFormOpen(false);
      setSelectedImage(null);
      await loadMeetups();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the meetup.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (meetup: Meetup, status: MeetupStatus) => {
    setError("");
    setNotice("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in as an administrator.");
      const response = await fetch(`/api/admin/meetups/${encodeURIComponent(meetup.id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success)
        throw new Error(result.message || "Could not update status.");
      setNotice(status === "featured" ? "Featured meetup updated." : "Meetup status updated.");
      await loadMeetups();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Could not update status.");
    }
  };

  const deleteMeetup = async (meetup: Meetup) => {
    if (!window.confirm(`Delete “${meetup.title}”? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in as an administrator.");
      const response = await fetch(`/api/admin/meetups/${encodeURIComponent(meetup.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success)
        throw new Error(result.message || "Could not delete meetup.");
      setNotice("Meetup deleted.");
      await loadMeetups();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete meetup.");
    }
  };

  const imagePreview = selectedImagePreview || form.image_url;
  const featuredMeetup = meetups.find((meetup) => meetup.status === "featured") ?? null;
  const stats = [
    { label: "Total Meetups", value: meetups.length, tone: "total" },
    {
      label: "Featured Meetup",
      value: featuredMeetup?.title || "None selected",
      tone: "featured",
      isTitle: true,
    },
    {
      label: "Draft Meetups",
      value: meetups.filter((meetup) => meetup.status === "draft").length,
      tone: "draft",
    },
    {
      label: "Archived Meetups",
      value: meetups.filter((meetup) => meetup.status === "archived").length,
      tone: "archived",
    },
  ];

  return (
    <main className="admin-meetups-page">
      <div className="admin-meetups-container">
        <header className="admin-meetups-heading">
          <div>
            <p className="admin-meetups-eyebrow">Admin / Meetups</p>
            <h1>Meetup Management</h1>
            <p>Create and manage the meetup featured on the public homepage.</p>
          </div>
          <div className="admin-meetups-heading-actions">
            <Link to="/admin/trips" className="admin-meetups-back">
              Back to Trips
            </Link>
            <button type="button" onClick={openCreate} className="admin-meetups-create">
              <Plus size={17} aria-hidden="true" /> Add Meetup
            </button>
          </div>
        </header>

        <section className="admin-meetup-stats" aria-label="Meetup statistics">
          {stats.map((stat) => (
            <article
              className={`admin-meetup-stat admin-meetup-stat-${stat.tone}`}
              key={stat.label}
            >
              <span>{stat.label}</span>
              <strong className={"isTitle" in stat && stat.isTitle ? "is-title" : undefined}>
                {isLoading ? "—" : stat.value}
              </strong>
            </article>
          ))}
        </section>

        <section className="admin-meetup-featured-banner" aria-label="Featured meetup">
          {featuredMeetup ? (
            <>
              {featuredMeetup.image_url ? (
                <img src={featuredMeetup.image_url} alt="" />
              ) : (
                <span className="admin-meetup-featured-placeholder">
                  <ImagePlus size={22} aria-hidden="true" />
                </span>
              )}
              <div>
                <span className="admin-meetup-featured-label">Currently featured</span>
                <h2>{featuredMeetup.title}</h2>
                <p>
                  {featuredMeetup.destination} · {formatEventDate(featuredMeetup.event_date)}
                  {featuredMeetup.event_time ? ` · ${featuredMeetup.event_time}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setViewingMeetup(featuredMeetup)}>
                <Eye size={16} aria-hidden="true" /> View
              </button>
            </>
          ) : (
            <div className="admin-meetup-featured-empty">
              <span className="admin-meetup-featured-label">No featured meetup</span>
              <p>Choose “Featured” on a meetup to display it on the public homepage.</p>
            </div>
          )}
        </section>

        {error && !isFormOpen ? (
          <p className="admin-meetups-alert" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="admin-meetups-notice" role="status">
            {notice}
          </p>
        ) : null}

        <section className="admin-meetups-controls" aria-label="Filter meetups">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search meetups or destinations…"
            aria-label="Search meetups or destinations"
          />
          <label>
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="featured">Featured</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </section>

        <section className="admin-meetups-table-wrap" aria-label="Meetup list">
          <div className="admin-meetups-table-title">
            <h2>All Meetups</h2>
            <span>{filteredMeetups.length} meetups</span>
          </div>
          <div className="admin-meetups-table-scroll">
            <table className="admin-meetups-table">
              <thead>
                <tr>
                  <th>Meetup</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4}>Loading meetups…</td>
                  </tr>
                ) : null}
                {!isLoading && filteredMeetups.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No meetups yet. Add one to feature it on the homepage.</td>
                  </tr>
                ) : null}
                {filteredMeetups.map((meetup) => (
                  <tr key={meetup.id}>
                    <td>
                      <div className="admin-meetup-title-cell">
                        {meetup.image_url ? (
                          <img src={meetup.image_url} alt="" />
                        ) : (
                          <span className="admin-meetup-thumb-empty">
                            <ImagePlus size={16} />
                          </span>
                        )}
                        <strong>{meetup.title}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="admin-meetup-destination">
                        <MapPin size={14} />
                        {meetup.destination}
                      </span>
                    </td>
                    <td>
                      <select
                        className={`admin-meetup-status admin-meetup-status-${meetup.status}`}
                        value={meetup.status}
                        onChange={(event) =>
                          void updateStatus(meetup, event.target.value as MeetupStatus)
                        }
                        aria-label={`Status for ${meetup.title}`}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="featured">Featured</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td>
                      <div className="admin-meetup-row-actions">
                        <button
                          type="button"
                          onClick={() => setViewingMeetup(meetup)}
                          aria-label={`View ${meetup.title}`}
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(meetup)}
                          aria-label={`Edit ${meetup.title}`}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteMeetup(meetup)}
                          aria-label={`Delete ${meetup.title}`}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {viewingMeetup ? (
        <div
          className="admin-meetup-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingMeetup(null);
          }}
        >
          <section
            className="admin-meetup-modal admin-meetup-view-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-meetup-view-title"
          >
            <header>
              <h2 id="admin-meetup-view-title">Meetup Details</h2>
              <button type="button" onClick={() => setViewingMeetup(null)} aria-label="Close">
                <X size={20} />
              </button>
            </header>
            {viewingMeetup.image_url ? (
              <img className="admin-meetup-view-image" src={viewingMeetup.image_url} alt="" />
            ) : null}
            <div className="admin-meetup-view-details">
              <span className={`admin-meetup-status admin-meetup-status-${viewingMeetup.status}`}>
                {viewingMeetup.status}
              </span>
              <h3>{viewingMeetup.title}</h3>
              <p className="admin-meetup-view-destination">{viewingMeetup.destination}</p>
              <dl>
                <div>
                  <dt>Date</dt>
                  <dd>{formatEventDate(viewingMeetup.event_date)}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{viewingMeetup.event_time || "To be announced"}</dd>
                </div>
              </dl>
              <p>{viewingMeetup.description}</p>
              {viewingMeetup.joining_details ? <p>{viewingMeetup.joining_details}</p> : null}
              {viewingMeetup.join_url ? (
                <a href={viewingMeetup.join_url} target="_blank" rel="noreferrer">
                  Join link
                </a>
              ) : null}
              <button
                type="button"
                className="admin-meetups-create"
                onClick={() => {
                  setViewingMeetup(null);
                  openEdit(viewingMeetup);
                }}
              >
                <Pencil size={15} aria-hidden="true" /> Edit Meetup
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isFormOpen ? (
        <div
          className="admin-meetup-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="admin-meetup-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-meetup-form-title"
          >
            <header>
              <h2 id="admin-meetup-form-title">{editingId ? "Edit Meetup" : "Add Meetup"}</h2>
              <button type="button" onClick={closeForm} disabled={isSaving} aria-label="Close">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={saveMeetup}>
              {error ? (
                <p className="admin-meetups-alert" role="alert">
                  {error}
                </p>
              ) : null}
              <label>
                Meetup title
                <input
                  required
                  maxLength={160}
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </label>
              <label>
                Destination
                <input
                  required
                  maxLength={160}
                  value={form.destination}
                  onChange={(event) => setForm({ ...form, destination: event.target.value })}
                />
              </label>
              <div className="admin-meetup-form-grid">
                <label>
                  Date
                  <input
                    type="date"
                    value={form.event_date ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, event_date: event.target.value || null })
                    }
                  />
                </label>
                <label>
                  Time
                  <input
                    type="text"
                    placeholder="6:30 PM"
                    maxLength={80}
                    value={form.event_time ?? ""}
                    onChange={(event) => setForm({ ...form, event_time: event.target.value })}
                  />
                </label>
              </div>
              <label>
                Description
                <textarea
                  required
                  rows={4}
                  maxLength={4000}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
              <label>
                Meetup image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(event) => setSelectedImage(event.target.files?.[0] ?? null)}
                />
              </label>
              {imagePreview ? (
                <div className="admin-meetup-image-preview">
                  <img src={imagePreview} alt="Meetup preview" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setForm({ ...form, image_url: null, image_path: null });
                    }}
                  >
                    Remove image
                  </button>
                </div>
              ) : null}
              <label>
                Joining information
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={form.joining_details ?? ""}
                  onChange={(event) => setForm({ ...form, joining_details: event.target.value })}
                />
              </label>
              <label>
                Join link (optional)
                <input
                  type="url"
                  placeholder="https://…"
                  value={form.join_url ?? ""}
                  onChange={(event) => setForm({ ...form, join_url: event.target.value })}
                />
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value as MeetupStatus })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="featured">Featured</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <footer>
                <button
                  type="button"
                  className="admin-meetup-cancel"
                  onClick={closeForm}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-meetups-create" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save Meetup"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
