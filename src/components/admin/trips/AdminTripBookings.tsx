import { useCallback, useEffect, useState } from "react";
import "./admin-trip-bookings.css";
import { supabase } from "@/integerations/supabase/client";

type BookingStatus =
  | "in_progress"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

type BackendBooking = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  number_of_people: number;
  booking_date: string;
  special_requests: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_amount: number | null;
  created_at: string;
  trip?: {
    id: string;
    title: string;
    slug: string;
    destination: string;
    start_date: string | null;
    end_date: string | null;
    price: number | null;
  } | null;
};

export type BookingStats = {
  totalBookings: number;
  pendingPayments: number;
  confirmedBookings: number;
  advanceCollected: number;
};

type Props = {
  tripId: string;
  tripPrice?: number;
  onStatsChange?: (stats: BookingStats) => void;
};

const bookingStatusOptions: BookingStatus[] = [
  "in_progress",
  "pending",
  "confirmed",
  "cancelled",
  "completed",
];

const paymentStatusOptions: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

function formatPrice(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(date: string | null) {
  if (!date) return "Date TBA";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStats(bookings: BackendBooking[], fallbackPrice: number) {
  return {
    totalBookings: bookings.length,
    pendingPayments: bookings.filter(
      (booking) => booking.payment_status === "pending",
    ).length,
    confirmedBookings: bookings.filter(
      (booking) => booking.status === "confirmed",
    ).length,
    advanceCollected: bookings
      .filter((booking) => booking.payment_status === "paid")
      .reduce(
        (total, booking) =>
          total +
          Math.round(
            Number(
              booking.total_amount || fallbackPrice * booking.number_of_people,
            ) * 0.6,
          ),
        0,
      ),
  };
}

export default function AdminTripBookings({
  tripId,
  tripPrice = 8999,
  onStatsChange,
}: Props) {
  const [bookings, setBookings] = useState<BackendBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  };

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("You must be logged in as an administrator.");
      }

      const response = await fetch("/api/admin/bookings", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not retrieve bookings.");
      }

      const tripBookings = (result.bookings as BackendBooking[]).filter(
        (booking) =>
          booking.trip?.id === tripId || booking.trip?.slug === tripId,
      );

      setBookings(tripBookings);
      onStatsChange?.(getStats(tripBookings, tripPrice));
    } catch (loadError) {
      console.error("Could not load bookings:", loadError);
      setBookings([]);
      onStatsChange?.(getStats([], tripPrice));
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load bookings.",
      );
    } finally {
      setLoading(false);
    }
  }, [onStatsChange, tripId, tripPrice]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function updateBooking(
    bookingId: string,
    updates: Partial<Pick<BackendBooking, "status" | "payment_status">>,
  ) {
    setUpdatingBooking(bookingId);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("You must be logged in as an administrator.");
      }

      const response = await fetch(
        `/api/admin/bookings/${encodeURIComponent(bookingId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(updates),
        },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not update booking.");
      }

      await loadBookings();
    } catch (updateError) {
      console.error("Could not update booking:", updateError);
      window.alert(
        updateError instanceof Error
          ? updateError.message
          : "Could not update booking.",
      );
    } finally {
      setUpdatingBooking(null);
    }
  }

  return (
    <div className="admin-bookings">
      <div className="admin-bookings-heading">
        <div>
          <h2>Bookings</h2>
          <p>View traveller details and manually manage booking status.</p>
        </div>
      </div>

      <div className="admin-bookings-table-card">
        <div className="admin-bookings-table-header">
          <div>
            <h3>All Bookings</h3>
            <span>
              {loading
                ? "Loading..."
                : `${bookings.length} ${bookings.length === 1 ? "booking" : "bookings"}`}
            </span>
          </div>

          <button
            type="button"
            className="admin-booking-refresh"
            onClick={loadBookings}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {error ? <div className="admin-bookings-error">{error}</div> : null}

        <div className="admin-bookings-table-wrapper">
          <table className="admin-bookings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Traveller</th>
                <th>Contact</th>
                <th>Travellers</th>
                <th>Travel Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Booking Status</th>
                <th>Updated</th>
              </tr>
            </thead>

            <tbody>
              {bookings.length > 0 ? (
                bookings.map((booking, index) => {
                  const totalAmount =
                    Number(booking.total_amount) ||
                    tripPrice * booking.number_of_people;
                  const isUpdating = updatingBooking === booking.id;

                  return (
                    <tr key={booking.id}>
                      <td>
                        <span className="admin-booking-number">{index + 1}</span>
                      </td>
                      <td>
                        <div className="admin-booking-person">
                          <strong>{booking.full_name}</strong>
                          <span>{booking.email}</span>
                        </div>
                      </td>
                      <td>{booking.phone}</td>
                      <td>{booking.number_of_people}</td>
                      <td>{formatDate(booking.booking_date)}</td>
                      <td><strong>{formatPrice(totalAmount)}</strong></td>
                      <td>
                        <select
                          className="admin-booking-select"
                          value={booking.payment_status}
                          disabled={isUpdating}
                          aria-label={`Payment status for ${booking.full_name}`}
                          onChange={(event) =>
                            updateBooking(booking.id, {
                              payment_status: event.target.value as PaymentStatus,
                            })
                          }
                        >
                          {paymentStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {formatLabel(status)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="admin-booking-select"
                          value={booking.status}
                          disabled={isUpdating}
                          aria-label={`Booking status for ${booking.full_name}`}
                          onChange={(event) =>
                            updateBooking(booking.id, {
                              status: event.target.value as BookingStatus,
                            })
                          }
                        >
                          {bookingStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {formatLabel(status)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className="admin-booking-updated">
                          {isUpdating ? "Saving..." : "Saved"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="admin-empty-booking-row">
                  <td colSpan={9}>
                    {loading ? "Loading bookings..." : "No bookings for this trip yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
