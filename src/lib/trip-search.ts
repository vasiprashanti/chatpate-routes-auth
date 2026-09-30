type TripDateRange = {
  startDate?: string | null;
  endDate?: string | null;
};

type DestinationTrip = {
  title?: string | null;
  destination?: string | null;
};

function dateKey(value: string | null | undefined) {
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
}

export function matchesTripDestination(trip: DestinationTrip, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return `${trip.title ?? ""} ${trip.destination ?? ""}`
    .toLowerCase()
    .includes(normalizedQuery);
}

export function tripIncludesDate(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  selectedDate: string,
) {
  const selected = dateKey(selectedDate);
  const start = dateKey(startDate);
  const end = dateKey(endDate) ?? start;

  return Boolean(selected && start && end && selected >= start && selected <= end);
}

export function tripOverlapsMonth(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  selectedDate: string,
) {
  const selected = dateKey(selectedDate);
  const start = dateKey(startDate);
  const end = dateKey(endDate) ?? start;
  if (!selected || !start || !end) return false;

  const monthStart = `${selected.slice(0, 7)}-01`;
  const [, yearText, monthText] = /^(\d{4})-(\d{2})/.exec(selected) ?? [];
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || month < 1 || month > 12) return false;

  const monthEndDay = new Date(year, month, 0).getDate().toString().padStart(2, "0");
  const monthEnd = `${selected.slice(0, 7)}-${monthEndDay}`;

  return start <= monthEnd && end >= monthStart;
}

export function filterTripsByDateOrMonth<T extends TripDateRange>(
  trips: T[],
  selectedDate: string,
  today: string,
): { trips: T[]; usedMonthFallback: boolean } {
  if (!selectedDate) return { trips, usedMonthFallback: false };

  const exactDateTrips = trips.filter((trip) =>
    tripIncludesDate(trip.startDate, trip.endDate, selectedDate),
  );

  if (exactDateTrips.length > 0) {
    return { trips: exactDateTrips, usedMonthFallback: false };
  }

  const monthTrips = trips.filter((trip) => {
    const end = dateKey(trip.endDate) ?? dateKey(trip.startDate);
    return Boolean(
      end &&
        end >= today &&
        tripOverlapsMonth(trip.startDate, trip.endDate, selectedDate),
    );
  });

  return { trips: monthTrips, usedMonthFallback: true };
}
