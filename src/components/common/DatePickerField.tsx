import { useCurrentTripDate } from "@/hooks/use-current-trip-date";
import "./date-picker-field.css";

type DatePickerFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function formatDisplayDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const [, year, month, day] = match ?? [];
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : "";
}

export function DatePickerField({
  id,
  label,
  value,
  onChange,
  className = "",
}: DatePickerFieldProps) {
  const today = useCurrentTripDate();

  return (
    <div className={`date-picker-field ${className}`.trim()}>
      <label className="date-picker-label" htmlFor={id}>
        {label}
      </label>
      <div className="date-picker-control">
        <span className={`date-picker-display${value ? " selected" : ""}`} aria-hidden="true">
          {formatDisplayDate(value) || "dd/mm/yy"}
        </span>
        <svg
          className="date-picker-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
          <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
          <path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" />
        </svg>
        <input
          id={id}
          className="date-picker-native"
          type="date"
          min={today}
          value={value}
          aria-label={`${label}. Select today or a future date`}
          onChange={(event) => {
            const nextDate = event.target.value;
            if (!nextDate || nextDate >= today) onChange(nextDate);
          }}
        />
      </div>
    </div>
  );
}
