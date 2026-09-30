import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BookOpen,
  CalendarDays,
  Eye,
  FileText,
  Map,
  Pencil,
} from "lucide-react";
import "./admin-trips.css";
import { supabase } from "@/integerations/supabase/client";
import unpublishIcon from "@/assets/unpublish.png";

type TripStatus = "Published" | "Draft" | "Archived";

type BackendTrip = {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  capacity: number | null;
  status: "draft" | "published" | "archived";
};

type Trip = {
  id: string;
  title: string;
  destination: string;
  dates: string;
  startDate: string | null;
  endDate: string | null;
  price: number;
  seats: number;
  status: TripStatus;
};

const getLocalDateKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"All" | TripStatus>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [today, setToday] = useState(getLocalDateKey);

  const formatStatus = (
    status: BackendTrip["status"],
  ): TripStatus => {
    switch (status) {
      case "published":
        return "Published";
      case "archived":
        return "Archived";
      default:
        return "Draft";
    }
  };

  const formatDates = (
    startDate: string | null,
    endDate: string | null,
  ) => {
    if (!startDate && !endDate) return "—";

    if (startDate && endDate) {
      return `${startDate} – ${endDate}`;
    }

    return startDate || endDate || "—";
  };

  const loadTrips = async () => {
    try {
      setIsLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Please log in as an administrator.");
        return;
      }

      const response = await fetch("/api/admin/trips", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not load trips.",
        );
      }

      const formattedTrips: Trip[] = (
        result.trips as BackendTrip[]
      ).map((trip) => ({
        id: trip.id,
        title: trip.title || "Untitled Trip",
        destination: trip.destination || "—",
        dates: formatDates(
          trip.start_date,
          trip.end_date,
        ),
        startDate: trip.start_date,
        endDate: trip.end_date,
        price: Number(trip.price) || 0,
        seats: Number(trip.capacity) || 0,
        status: formatStatus(trip.status),
      }));

      setTrips(formattedTrips);
    } catch (error) {
      console.error("Load trips error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Could not load trips.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setToday(getLocalDateKey());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const tripStats = useMemo(() => {
    const activeUpcoming = trips.filter(
      (trip) =>
        trip.status === "Published" &&
        (!trip.endDate || trip.endDate.slice(0, 10) >= today),
    ).length;

    return [
      {
        label: "Total Trips",
        value: trips.length,
        icon: Map,
        tone: "total",
      },
      {
        label: "Active / Upcoming Trips",
        value: activeUpcoming,
        icon: CalendarDays,
        tone: "active",
      },
      {
        label: "Draft Trips",
        value: trips.filter((trip) => trip.status === "Draft").length,
        icon: FileText,
        tone: "draft",
      },
      {
        label: "Archived Trips",
        value: trips.filter((trip) => trip.status === "Archived").length,
        icon: Archive,
        tone: "archived",
      },
    ];
  }, [today, trips]);

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase();

    return trips.filter((trip) => {
      const matchesSearch =
        !query ||
        trip.title.toLowerCase().includes(query) ||
        trip.destination.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        trip.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [trips, search, statusFilter]);

  const updateTripStatus = async (
    id: string,
    status: "draft" | "published" | "archived",
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Please log in as an administrator.");
        return;
      }

      const response = await fetch(`/api/trips/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not update trip.",
        );
      }

      await loadTrips();
    } catch (error) {
      console.error("Update trip status error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Could not update trip.",
      );
    }
  };

  const togglePublish = async (trip: Trip) => {
    const nextStatus =
      trip.status === "Published"
        ? "draft"
        : "published";

    await updateTripStatus(trip.id, nextStatus);
  };

  const archiveTrip = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to archive this trip?",
    );

    if (!confirmed) return;

    await updateTripStatus(id, "archived");
  };

  return (
    <main className="admin-trips-page">
      <div className="admin-trips-container">
        <header className="admin-trips-header">
          <div>
            <p className="admin-eyebrow">Admin / Trips</p>

            <h1>Trip Management</h1>

            <p className="admin-subtitle">
              Create, edit and manage all Chatpate Routes trips.
            </p>
          </div>

          <Link
            to="/admin/trips/new"
            className="admin-create-button"
          >
            <span>+</span>
            Create Trip
          </Link>
        </header>

        <section
          className="admin-trip-stats"
          aria-label="Trip statistics"
        >
          {tripStats.map(({ label, value, icon: Icon, tone }) => (
            <article
              className={`admin-trip-stat-card admin-trip-stat-${tone}`}
              key={label}
            >
              <div className="admin-trip-stat-copy">
                <p>{label}</p>
                <strong>{isLoading ? "—" : value}</strong>
              </div>
              <span className="admin-trip-stat-icon" aria-hidden="true">
                <Icon size={19} />
              </span>
            </article>
          ))}
        </section>

        <section className="admin-toolbar">
          <div className="admin-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search trips or destinations..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="admin-filter">
            <label htmlFor="status-filter">
              Status
            </label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "All"
                    | TripStatus,
                )
              }
            >
              <option value="All">All</option>
              <option value="Published">
                Published
              </option>
              <option value="Draft">Draft</option>
              <option value="Archived">
                Archived
              </option>
            </select>
          </div>
        </section>

        <section className="admin-table-card">
          <div className="admin-table-header">
            <div>
              <h2>All Trips</h2>

              <span>
                {filteredTrips.length}{" "}
                {filteredTrips.length === 1
                  ? "trip"
                  : "trips"}
              </span>
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-trips-table">
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Destination</th>
                  <th>Dates</th>
                  <th>Price</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: "center" }}
                    >
                      Loading trips...
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => (
                    <tr key={trip.id}>
                      <td>
                        <div className="admin-trip-name">
                          {trip.title}
                        </div>
                      </td>

                      <td>{trip.destination}</td>

                      <td>{trip.dates}</td>

                      <td className="admin-price">
                        ₹
                        {trip.price.toLocaleString(
                          "en-IN",
                        )}
                      </td>

                      <td>{trip.seats}</td>

                      <td>
                        <span
                          className={`admin-status admin-status-${trip.status.toLowerCase()}`}
                        >
                          <span className="admin-status-dot" />
                          {trip.status}
                        </span>
                      </td>

                      <td>
                        <div className="admin-actions">
                          <Link
                            to="/trip-detail"
                            search={{
                              trip: trip.id,
                            }}
                            className="admin-action admin-action-icon admin-action-view"
                            aria-label={`View ${trip.title}`}
                            title={`View ${trip.title}`}
                          >
                            <Eye size={16} aria-hidden="true" />
                          </Link>

                          <Link
                            to="/admin/trips/$tripId/edit"
                            params={{
                              tripId: trip.id,
                            }}
                            search={{}}
                            className="admin-action admin-action-icon"
                            aria-label={`Edit ${trip.title}`}
                            title={`Edit ${trip.title}`}
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </Link>

                          <Link
                            to="/admin/trips/$tripId/edit"
                            params={{
                              tripId: trip.id,
                            }}
                            search={{ section: "bookings" }}
                            className="admin-action admin-action-bookings"
                            aria-label={`Open bookings for ${trip.title}`}
                            title={`Open bookings for ${trip.title}`}
                          >
                            <BookOpen size={15} aria-hidden="true" />
                            <span>Bookings</span>
                          </Link>

                          {trip.status !==
                            "Archived" && (
                            <>
                              <button
                                type="button"
                                className={
                                  trip.status === "Published"
                                    ? "admin-action admin-action-icon"
                                    : "admin-action"
                                }
                                onClick={() =>
                                  togglePublish(trip)
                                }
                                aria-label={
                                  trip.status === "Published"
                                    ? `Unpublish ${trip.title}`
                                    : `Publish ${trip.title}`
                                }
                                title={
                                  trip.status === "Published"
                                    ? "Unpublish"
                                    : "Publish"
                                }
                              >
                                {trip.status ===
                                "Published"
                                  ? <span
                                      className="admin-action-unpublish-icon"
                                      style={{
                                        maskImage: `url("${unpublishIcon}")`,
                                        WebkitMaskImage: `url("${unpublishIcon}")`,
                                      }}
                                      aria-hidden="true"
                                    />
                                  : "Publish"}
                              </button>

                              <button
                                type="button"
                                className="admin-action admin-action-danger"
                                onClick={() =>
                                  archiveTrip(
                                    trip.id,
                                  )
                                }
                              >
                                Archive
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

            {!isLoading &&
              filteredTrips.length === 0 && (
                <div className="admin-empty-state">
                  <div className="admin-empty-icon">
                    ⌕
                  </div>

                  <h3>No trips found</h3>

                  <p>
                    Try changing your search or status
                    filter.
                  </p>
                </div>
              )}
          </div>
        </section>
      </div>
    </main>
  );
}
