import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integerations/supabase/client";
import "./my-bookings.css";

type BackendBooking = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  number_of_people: number;
  booking_date: string;
  status: "in_progress" | "pending" | "confirmed" | "cancelled" | "completed";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  total_amount: number | null;
  created_at: string;
  trip?: {
    title: string;
    start_date: string | null;
    end_date: string | null;
  } | null;
};

function formatPrice(amount: number | null) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Date to be announced";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: BackendBooking["status"]) {
  if (status === "in_progress") return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatPaymentStatus(status: BackendBooking["payment_status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<BackendBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setBookings([]);
        setError("Please log in to view your bookings.");
        return;
      }

      const response = await fetch("/api/my-bookings", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not load your bookings.");
      }

      setBookings((result.bookings || []) as BackendBooking[]);
    } catch (loadError) {
      console.error("Could not load bookings:", loadError);
      setBookings([]);
      setError(loadError instanceof Error ? loadError.message : "Could not load your bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadBookings();
    });

    return () => authListener.subscription.unsubscribe();
  }, [loadBookings]);

  return (
    <>
      <Navbar variant="light" />
      <main className="my-bookings-page">
        <div className="my-bookings-container">
          <div className="my-bookings-header">
            <div>
              <p className="my-bookings-eyebrow">Traveller Dashboard</p>
              <h1>My Bookings</h1>
              <p>Your bookings are loaded from your Chatpate Routes account.</p>
            </div>

            <a href="/trips" className="my-bookings-browse-button">
              Explore Trips
            </a>
          </div>

          {loading ? (
            <section className="my-bookings-empty">
              <h2>Loading bookings...</h2>
              <p>We’re getting your latest booking details.</p>
            </section>
          ) : error ? (
            <section className="my-bookings-empty">
              <h2>Unable to load bookings</h2>
              <p>{error}</p>
              <button type="button" className="my-bookings-empty-button" onClick={loadBookings}>
                Try Again
              </button>
            </section>
          ) : bookings.length === 0 ? (
            <section className="my-bookings-empty">
              <div className="my-bookings-empty-icon">✈</div>
              <h2>No bookings yet</h2>
              <p>Your bookings will appear here after you complete a booking.</p>
              <a href="/trips" className="my-bookings-empty-button">
                Explore Trips
              </a>
            </section>
          ) : (
            <section className="my-bookings-list">
              {bookings.map((booking) => {
                const bookingStatus = formatStatus(booking.status);
                const paymentStatus = formatPaymentStatus(booking.payment_status);
                const tripStart = booking.trip?.start_date || booking.booking_date;

                return (
                  <article className="my-booking-card" key={booking.id}>
                    <div className="my-booking-card-top">
                      <div>
                        <p className="my-booking-label">Booking</p>
                        <h2>{booking.trip?.title || "Trip booking"}</h2>
                        <p className="my-booking-reference">{booking.id}</p>
                      </div>

                      <span
                        className={`my-booking-status my-booking-status-${bookingStatus.toLowerCase()}`}
                      >
                        {bookingStatus}
                      </span>
                    </div>

                    <div className="my-booking-details">
                      <div className="my-booking-detail">
                        <span>Dates</span>
                        <strong>
                          {formatDate(tripStart)}
                          {booking.trip?.end_date ? ` – ${formatDate(booking.trip.end_date)}` : ""}
                        </strong>
                      </div>

                      <div className="my-booking-detail">
                        <span>Travellers</span>
                        <strong>{booking.number_of_people}</strong>
                      </div>

                      <div className="my-booking-detail">
                        <span>Total Amount</span>
                        <strong>{formatPrice(booking.total_amount)}</strong>
                      </div>
                    </div>

                    <div className="my-booking-footer">
                      <div>
                        <span className="my-payment-label">Payment</span>
                        <span
                          className={`my-payment-status my-payment-status-${paymentStatus.toLowerCase()}`}
                        >
                          {paymentStatus}
                        </span>
                      </div>

                      <div className="my-booking-confirmed-message">
                        Confirmation and payment details are handled on WhatsApp.
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </>
  );
}
