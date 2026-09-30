import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integerations/supabase/client";
import "../admin-operations.css";

type BookingStatus = "in_progress" | "pending" | "confirmed" | "cancelled" | "completed";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type Booking = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  number_of_people: number;
  booking_date: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_amount: number | null;
  created_at: string;
  trip?: { id: string; title: string; destination: string | null } | null;
};

const bookingStatuses: BookingStatus[] = [
  "in_progress",
  "pending",
  "confirmed",
  "cancelled",
  "completed",
];
const paymentStatuses: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];
const titleCase = (value: string) =>
  value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
const formatCurrency = (value: number | null) =>
  value == null ? "—" : `₹${value.toLocaleString("en-IN")}`;
const getAccessToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Administrator session is required.");
      const response = await fetch("/api/admin/bookings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        bookings?: Booking[];
      };
      if (!response.ok || !result.success)
        throw new Error(result.message || "Could not load bookings.");
      setBookings(result.bookings ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load bookings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const visibleBookings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return bookings;
    return bookings.filter((booking) =>
      `${booking.full_name} ${booking.email} ${booking.phone} ${booking.trip?.title ?? ""}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [bookings, search]);

  const updateBooking = async (
    booking: Booking,
    field: "status" | "payment_status",
    value: string,
  ) => {
    setUpdatingId(booking.id);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Administrator session is required.");
      const response = await fetch(`/api/admin/bookings/${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success)
        throw new Error(result.message || "Could not update booking.");
      await loadBookings();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update booking.");
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = [
    { label: "Total Bookings", value: bookings.length },
    {
      label: "Pending Payments",
      value: bookings.filter((item) => item.payment_status === "pending").length,
    },
    { label: "Confirmed", value: bookings.filter((item) => item.status === "confirmed").length },
    { label: "Paid", value: bookings.filter((item) => item.payment_status === "paid").length },
  ];

  return (
    <main className="admin-operations-page">
      <div className="admin-operations-container">
        <header className="admin-operations-heading">
          <div>
            <p className="admin-operations-eyebrow">Admin / Bookings</p>
            <h1>Bookings</h1>
            <p>Review traveller bookings and update payment or booking status.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadBookings()}
            disabled={isLoading}
            className="admin-operations-secondary"
          >
            Refresh
          </button>
        </header>
        <section className="admin-operations-stats" aria-label="Booking statistics">
          {stats.map((stat) => (
            <article key={stat.label}>
              <span>{stat.label}</span>
              <strong>{isLoading ? "—" : stat.value}</strong>
            </article>
          ))}
        </section>
        {error ? (
          <p className="admin-operations-error" role="alert">
            {error}
          </p>
        ) : null}
        <section className="admin-operations-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bookings…"
            aria-label="Search bookings"
          />
        </section>
        <section className="admin-operations-table-card">
          <div className="admin-operations-table-title">
            <h2>All Bookings</h2>
            <span>{visibleBookings.length} bookings</span>
          </div>
          <div className="admin-operations-table-scroll">
            <table className="admin-operations-table admin-bookings-list-table">
              <thead>
                <tr>
                  <th>Traveller</th>
                  <th>Contact</th>
                  <th>Trip</th>
                  <th>Travel Date</th>
                  <th>People</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>{booking.full_name}</strong>
                      <small>{booking.email}</small>
                    </td>
                    <td>{booking.phone}</td>
                    <td>{booking.trip?.title ?? "Trip unavailable"}</td>
                    <td>
                      {booking.booking_date
                        ? new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td>{booking.number_of_people}</td>
                    <td>
                      <strong>{formatCurrency(booking.total_amount)}</strong>
                    </td>
                    <td>
                      <select
                        aria-label={`Payment status for ${booking.full_name}`}
                        disabled={updatingId === booking.id}
                        value={booking.payment_status}
                        onChange={(event) =>
                          void updateBooking(booking, "payment_status", event.target.value)
                        }
                      >
                        {paymentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {titleCase(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`Booking status for ${booking.full_name}`}
                        disabled={updatingId === booking.id}
                        value={booking.status}
                        onChange={(event) =>
                          void updateBooking(booking, "status", event.target.value)
                        }
                      >
                        {bookingStatuses.map((status) => (
                          <option key={status} value={status}>
                            {titleCase(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {!isLoading && visibleBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="admin-operations-empty">
                      No bookings found.
                    </td>
                  </tr>
                ) : null}
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="admin-operations-empty">
                      Loading bookings…
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
