import { useEffect, useState } from "react";
import { supabase } from "../../../integerations/supabase/client";
import "./admin-trip-editor.css";
import AdminTripBookings, {
  type BookingStats,
} from "./AdminTripBookings";

type Section =
  | "overview"
  | "itinerary"
  | "stay"
  | "included"
  | "packing"
  | "rules"
  | "faq"
  | "bookings";

type ItineraryDay = {
  day: number;
  title: string;
  description: string;
};

type FAQ = {
  question: string;
  answer: string;
};

type TripImage = {
  id: string;
  image_url: string;
  is_cover: boolean;
  display_order: number;
};

type AdminTripEditorProps = {
  tripId: string;
  initialSection: "bookings" | undefined;
};

type SavedTrip = {
  id: string;
  status: "Draft" | "Published" | "Archived";

  tripName: string;
  destination: string;
  slug: string;
  shortDescription: string;
  detailedDescription: string;

  startDate: string;
  endDate: string;
  duration: string;
  price: string;
  capacity: string;
  availableSeats: string;

  tripType: string;
  coverImage: string;
  gallery: string;

  host: string;
  pickupPoint: string;
  suitableFor: string;

  itinerary: ItineraryDay[];

  accommodation: string;
  accommodationDescription: string;
  stayLocation: string;
  groupSize: string;

  included: string[];
  notIncluded: string[];
  packingItems: string[];
  rules: string[];

  faqs: FAQ[];

  cancellationPolicy: string;
};

const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2400;

async function optimizeImage(file: File) {
  if (typeof createImageBitmap === "undefined") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / bitmap.width,
    MAX_IMAGE_DIMENSION / bitmap.height,
  );

  if (scale === 1 && file.size <= MAX_IMAGE_UPLOAD_BYTES) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );

  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "trip-image";
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

const sections: { id: Section; label: string }[] = [
  { id: "bookings", label: "Bookings" },
  { id: "overview", label: "Overview" },
  { id: "itinerary", label: "Itinerary" },
  { id: "stay", label: "Stay" },
  { id: "included", label: "Included" },
  { id: "packing", label: "What to Bring" },
  { id: "rules", label: "Rules" },
  { id: "faq", label: "FAQ" },
];

export default function AdminTripEditor({
  tripId,
  initialSection,
}: AdminTripEditorProps) {
  const [activeSection, setActiveSection] =
    useState<Section>(initialSection ?? "overview");
  const [backendTripId, setBackendTripId] = useState<string | null>(
  tripId === "new" ? null : tripId,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [tripImages, setTripImages] = useState<TripImage[]>([]);
  const [makeCoverOnUpload, setMakeCoverOnUpload] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [bookingStats, setBookingStats] = useState<BookingStats>({
    totalBookings: 0,
    pendingPayments: 0,
    confirmedBookings: 0,
    advanceCollected: 0,
  });

  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [availableSeats, setAvailableSeats] = useState("");

  const [tripType, setTripType] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [gallery, setGallery] = useState("");

  const [host, setHost] = useState("");
  const [pickupPoint, setPickupPoint] = useState("");
  const [suitableFor, setSuitableFor] = useState("");

  const [itinerary, setItinerary] = useState<ItineraryDay[]>([
    {
      day: 1,
      title: "",
      description: "",
    },
  ]);

  const [accommodation, setAccommodation] = useState("");
  const [accommodationDescription, setAccommodationDescription] =
    useState("");
  const [stayLocation, setStayLocation] = useState("");
  const [groupSize, setGroupSize] = useState("");

  const [included, setIncluded] = useState<string[]>([""]);
  const [notIncluded, setNotIncluded] = useState<string[]>([""]);

  const [packingItems, setPackingItems] = useState<string[]>([""]);

  const [rules, setRules] = useState<string[]>([""]);

  const [faqs, setFaqs] = useState<FAQ[]>([
    {
      question: "",
      answer: "",
    },
  ]);

  const [cancellationPolicy, setCancellationPolicy] = useState("");

useEffect(() => {
  if (tripId === "new") return;

  const loadTrip = async () => {
    try {
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
        throw new Error(result.message || "Could not load trip.");
      }

      const trip = result.trips.find(
        (item: { id: string; slug: string }) =>
          item.id === tripId || item.slug === tripId,
      );

      if (!trip) {
        alert("Trip not found.");
        return;
      }
      setBackendTripId(trip.id);

      setTripName(trip.title ?? "");
      setDestination(trip.destination ?? "");
      setSlug(trip.slug ?? "");
      setShortDescription(trip.short_description ?? "");
      setDetailedDescription(trip.description ?? "");

      setStartDate(trip.start_date ?? "");
      setEndDate(trip.end_date ?? "");
      setDuration(
        trip.duration_days != null
          ? String(trip.duration_days)
          : "",
      );
      setPrice(
        trip.price != null
          ? String(trip.price)
          : "",
      );
      setCapacity(
        trip.capacity != null
          ? String(trip.capacity)
          : "",
      );

      setTripType(trip.trip_type ?? "");
      setCoverImage(trip.cover_image_url ?? "");
      setTripImages(
        Array.isArray(trip.trip_images) ? (trip.trip_images as TripImage[]) : [],
      );

      setAccommodation(trip.accommodation ?? "");
      setAccommodationDescription(
        trip.accommodation_description ?? "",
      );
      setStayLocation(trip.stay_location ?? "");
      setGroupSize(trip.group_size ?? "");

      setIncluded(
        Array.isArray(trip.included) && trip.included.length > 0
          ? trip.included
          : [""],
      );

      setPackingItems(
        Array.isArray(trip.what_to_bring) &&
          trip.what_to_bring.length > 0
          ? trip.what_to_bring
          : [""],
      );

      setRules(
        Array.isArray(trip.rules) && trip.rules.length > 0
          ? trip.rules
          : [""],
      );

      setFaqs(
        Array.isArray(trip.faq) && trip.faq.length > 0
          ? trip.faq.map(
              (item: { question?: string; answer?: string }) => ({
                question: item.question ?? "",
                answer: item.answer ?? "",
              }),
            )
          : [{ question: "", answer: "" }],
      );

      if (Array.isArray(trip.trip_itinerary)) {
        setItinerary(
          trip.trip_itinerary.length > 0
            ? trip.trip_itinerary.map(
                (item: {
                  day_number: number;
                  title: string;
                  description?: string | null;
                }) => ({
                  day: item.day_number,
                  title: item.title ?? "",
                  description: item.description ?? "",
                }),
              )
            : [{ day: 1, title: "", description: "" }],
        );
      }
    } catch (error) {
      console.error("Load trip error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Could not load trip.",
      );
    }
  };

  loadTrip();
}, [tripId]);

  const handleImageUpload = async (file: File, isCover: boolean) => {
    if (!backendTripId) {
      setImageUploadError("Save this trip first, then upload its images.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageUploadError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    setIsUploadingImage(true);
    setImageUploadError("");

    try {
      const optimizedFile = await optimizeImage(file);

      if (optimizedFile.size > MAX_IMAGE_UPLOAD_BYTES) {
        throw new Error("This image is still too large. Please choose a smaller image.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please log in as an administrator.");
      }

      const formData = new FormData();
      formData.append("file", optimizedFile);
      formData.append("is_cover", String(isCover));
      formData.append("display_order", String(tripImages.length));

      const response = await fetch(`/api/trips/${backendTripId}/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result.success || !result.image) {
        throw new Error(result.message || "Could not upload image.");
      }

      const uploadedImage = result.image as TripImage;
      setTripImages((current) =>
        [...current.filter((image) => !isCover || !image.is_cover), uploadedImage].sort(
          (a, b) => a.display_order - b.display_order,
        ),
      );

      if (isCover) {
        setCoverImage(uploadedImage.image_url);
        await fetch(`/api/trips/${backendTripId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ cover_image_url: uploadedImage.image_url }),
        });
      }
    } catch (error) {
      console.error("Trip image upload error:", error);
      setImageUploadError(
        error instanceof Error ? error.message : "Could not upload image.",
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteImage = async (image: TripImage) => {
    if (!backendTripId) return;
    if (!window.confirm("Delete this trip image?")) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please log in as an administrator.");
      }

      const response = await fetch(
        `/api/trips/${backendTripId}/images/${encodeURIComponent(image.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not delete image.");
      }

      setTripImages((current) => current.filter((item) => item.id !== image.id));
      if (coverImage === image.image_url) {
        setCoverImage("");

        await fetch(`/api/trips/${backendTripId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ cover_image_url: null }),
        });
      }
    } catch (error) {
      console.error("Trip image delete error:", error);
      setImageUploadError(
        error instanceof Error ? error.message : "Could not delete image.",
      );
    }
  };

  const handleReorderImage = async (index: number, direction: -1 | 1) => {
    if (!backendTripId) return;

    const nextIndex = index + direction;
    const currentImage = tripImages[index];
    const nextImage = tripImages[nextIndex];

    if (!currentImage || !nextImage) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please log in as an administrator.");
      }

      const response = await Promise.all(
        [
          [currentImage, nextImage.display_order],
          [nextImage, currentImage.display_order],
        ].map(([image, displayOrder]) =>
          fetch(
            `/api/trips/${backendTripId}/images/${encodeURIComponent(
              (image as TripImage).id,
            )}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ display_order: displayOrder }),
            },
          ),
        ),
      );

      const results = await Promise.all(response.map((item) => item.json()));

      if (response.some((item) => !item.ok) || results.some((item) => !item.success)) {
        throw new Error("Could not update image order.");
      }

      setTripImages((current) => {
        const reordered = [...current];
        const movingImage = reordered[index];
        const targetImage = reordered[nextIndex];

        if (!movingImage || !targetImage) return current;

        reordered[index] = targetImage;
        reordered[nextIndex] = movingImage;

        return reordered.map((image, imageIndex) => ({
          ...image,
          display_order: imageIndex,
        }));
      });
    } catch (error) {
      console.error("Trip image reorder error:", error);
      setImageUploadError(
        error instanceof Error ? error.message : "Could not update image order.",
      );
    }
  };

  const addItineraryDay = () => {
    setItinerary((current) => [
      ...current,
      {
        day: current.length + 1,
        title: "",
        description: "",
      },
    ]);
  };

  const removeItineraryDay = (index: number) => {
    if (itinerary.length === 1) return;

    setItinerary((current) =>
      current
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({
          ...item,
          day: itemIndex + 1,
        })),
    );
  };

  const updateItinerary = (
    index: number,
    field: "title" | "description",
    value: string,
  ) => {
    setItinerary((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const addIncluded = () => {
    setIncluded((current) => [...current, ""]);
  };

  const removeIncluded = (index: number) => {
    if (included.length === 1) return;

    setIncluded((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const updateIncluded = (index: number, value: string) => {
    setIncluded((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    );
  };

  const addNotIncluded = () => {
    setNotIncluded((current) => [...current, ""]);
  };

  const removeNotIncluded = (index: number) => {
    if (notIncluded.length === 1) return;

    setNotIncluded((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const updateNotIncluded = (index: number, value: string) => {
    setNotIncluded((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    );
  };

  const addPackingItem = () => {
    if (packingItems.length >= 9) return;

    setPackingItems((current) => [...current, ""]);
  };

  const removePackingItem = (index: number) => {
    if (packingItems.length === 1) return;

    setPackingItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const updatePackingItem = (index: number, value: string) => {
    setPackingItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    );
  };

  const addRule = () => {
    setRules((current) => [...current, ""]);
  };

  const removeRule = (index: number) => {
    if (rules.length === 1) return;

    setRules((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const updateRule = (index: number, value: string) => {
    setRules((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    );
  };

  const addFAQ = () => {
    setFaqs((current) => [
      ...current,
      {
        question: "",
        answer: "",
      },
    ]);
  };

  const removeFAQ = (index: number) => {
    if (faqs.length === 1) return;

    setFaqs((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const updateFAQ = (
    index: number,
    field: "question" | "answer",
    value: string,
  ) => {
    setFaqs((current) =>
      current.map((faq, itemIndex) =>
        itemIndex === index
          ? {
              ...faq,
              [field]: value,
            }
          : faq,
      ),
    );
  };


  const validateTrip = () => {
  const missing: string[] = [];

  if (!tripName.trim()) missing.push("Trip Name");
  if (!destination.trim()) missing.push("Destination");
  if (!slug.trim()) missing.push("Slug");
  if (!shortDescription.trim()) missing.push("Short Description");
  if (!detailedDescription.trim()) {
    missing.push("Detailed Description");
  }

  if (!startDate) missing.push("Start Date");
  if (!endDate) missing.push("End Date");
  if (!duration.trim()) missing.push("Duration");
  if (!price.trim()) missing.push("Price");
  if (!capacity.trim()) missing.push("Capacity");
  if (!availableSeats.trim()) {
    missing.push("Available Seats");
  }

  if (!tripType.trim()) missing.push("Trip Type");
  if (!coverImage.trim()) missing.push("Cover Image");
  if (!host.trim()) missing.push("Host");
  if (!pickupPoint.trim()) {
    missing.push("Pickup Point");
  }

  if (!accommodation.trim()) {
    missing.push("Accommodation");
  }

  if (!cancellationPolicy.trim()) {
    missing.push("Cancellation Policy");
  }

  const hasValidItinerary =
    itinerary.length > 0 &&
    itinerary.every(
      (day) =>
        day.title.trim() &&
        day.description.trim(),
    );

  if (!hasValidItinerary) {
    missing.push("Complete Itinerary");
  }

  const hasIncludedItems =
    included.length > 0 &&
    included.some((item) => item.trim());

  if (!hasIncludedItems) {
    missing.push("What's Included");
  }

  const hasNotIncludedItems =
    notIncluded.length > 0 &&
    notIncluded.some((item) => item.trim());

  if (!hasNotIncludedItems) {
    missing.push("What's Not Included");
  }

  const hasPackingItems =
    packingItems.length > 0 &&
    packingItems.some((item) => item.trim());

  if (!hasPackingItems) {
    missing.push("What to Bring");
  }

  const hasRules =
    rules.length > 0 &&
    rules.some((rule) => rule.trim());

  if (!hasRules) {
    missing.push("Rules");
  }

  const hasFAQs =
    faqs.length > 0 &&
    faqs.every(
      (faq) =>
        faq.question.trim() &&
        faq.answer.trim(),
    );

  if (!hasFAQs) {
    missing.push("FAQ");
  }

  return missing;
};

const missingFields = validateTrip();
const canPublish = missingFields.length === 0;

const saveItinerary = async (
  tripId: string,
  accessToken: string,
) => {
  const validItinerary = itinerary
    .filter(
      (day) =>
        day.title.trim() &&
        day.description.trim(),
    )
    .map((day) => ({
      day_number: day.day,
      title: day.title.trim(),
      description: day.description.trim(),
    }));

  if (validItinerary.length === 0) {
    return;
  }

  for (const day of validItinerary) {
    const response = await fetch(
      `/api/trips/${tripId}/itinerary`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(day),
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          `Could not save itinerary day ${day.day_number}.`,
      );
    }
  }
};

  const saveDraft = async () => {
  try {
    setIsSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      alert("Please log in as an administrator.");
      return;
    }

    const payload = {
      title: tripName.trim(),
      slug: slug.trim(),
      description: detailedDescription.trim() || null,
      short_description: shortDescription.trim() || null,
      destination: destination.trim() || null,
      trip_type: tripType.trim() || null,

      duration_days: duration
        ? Number(duration)
        : null,

      price: price
        ? Number(price)
        : null,

      start_date: startDate || null,
      end_date: endDate || null,

      capacity: capacity
        ? Number(capacity)
        : null,

      group_size: groupSize.trim() || null,

      accommodation: accommodation.trim() || null,
      accommodation_description:
        accommodationDescription.trim() || null,
      stay_location: stayLocation.trim() || null,

      included: included
        .map((item) => item.trim())
        .filter(Boolean),

      what_to_bring: packingItems
        .map((item) => item.trim())
        .filter(Boolean),

      rules: rules
        .map((item) => item.trim())
        .filter(Boolean),

      faq: faqs
        .filter(
          (faq) =>
            faq.question.trim() &&
            faq.answer.trim(),
        )
        .map((faq) => ({
          question: faq.question.trim(),
          answer: faq.answer.trim(),
        })),

      status: "draft" as const,

      cover_image_url:
        coverImage.trim() || null,
    };

    let response: Response;

    if (backendTripId) {
      response = await fetch(
        `/api/trips/${backendTripId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        },
      );
    } else {
      response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
    }

    const result = await response.json();

if (!response.ok || !result.success) {
  throw new Error(
    result.message || "Failed to save trip.",
  );
}

const savedTripId =
  backendTripId || result.trip?.id;

if (!savedTripId) {
  throw new Error(
    "Trip was saved but no backend trip ID was returned.",
  );
}

if (!backendTripId && result.trip?.id) {
  setBackendTripId(result.trip.id);
}

if (!backendTripId) {
  await saveItinerary(
    savedTripId,
    session.access_token,
  );
}

alert("Draft saved successfully.");
  } catch (error) {
    console.error("Save trip error:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Could not save trip.",
    );
  } finally {
    setIsSaving(false);
  }
};

const publishTrip = async () => {
  const missing = validateTrip();

  if (missing.length > 0) {
    alert(
      `Please complete the following before publishing:\n\n• ${missing.join(
        "\n• ",
      )}`,
    );
    return;
  }

  if (!backendTripId) {
    alert("Please save the trip as a draft before publishing.");
    return;
  }

  try {
    setIsSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      alert("Please log in as an administrator.");
      return;
    }

    const response = await fetch(`/api/trips/${backendTripId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        title: tripName.trim(),
        slug: slug.trim(),
        description: detailedDescription.trim() || null,
        short_description: shortDescription.trim() || null,
        destination: destination.trim() || null,
        trip_type: tripType.trim() || null,

        duration_days: duration ? Number(duration) : null,
        price: price ? Number(price) : null,

        start_date: startDate || null,
        end_date: endDate || null,

        capacity: capacity ? Number(capacity) : null,
        group_size: groupSize.trim() || null,

        accommodation: accommodation.trim() || null,
        accommodation_description:
          accommodationDescription.trim() || null,
        stay_location: stayLocation.trim() || null,

        included: included
          .map((item) => item.trim())
          .filter(Boolean),

        what_to_bring: packingItems
          .map((item) => item.trim())
          .filter(Boolean),

        rules: rules
          .map((item) => item.trim())
          .filter(Boolean),

        faq: faqs
          .filter(
            (faq) =>
              faq.question.trim() &&
              faq.answer.trim(),
          )
          .map((faq) => ({
            question: faq.question.trim(),
            answer: faq.answer.trim(),
          })),

        status: "published",

        cover_image_url:
          coverImage.trim() || null,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Could not publish trip.",
      );
    }

    alert("Trip published successfully.");
  } catch (error) {
    console.error("Publish trip error:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Could not publish trip.",
    );
  } finally {
    setIsSaving(false);
  }
};

  return (
    <main className="admin-trip-editor-page">
      <div className="admin-trip-editor-container">

        {/* HEADER */}

        <header className="admin-editor-header">
  <div>
    <div className="admin-breadcrumb-row">
      <p className="admin-eyebrow">
        Admin / Trips / Edit
      </p>

      <button
        type="button"
        className="admin-back-button"
        onClick={() => window.history.back()}
      >
        ← Back to Trips
      </button>
    </div>

    <div className="admin-editor-title-row">
      <div>
        <h1>
          {tripName || "Create Trip"}
        </h1>
      </div>

      <span className="admin-editor-status">
        Draft
      </span>
    </div>
  </div>

          <div className="admin-editor-actions">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={saveDraft}
            >
              Save Draft
            </button>

            <button
                type="button"
                className="admin-primary-button"
                onClick={publishTrip}
                disabled={!canPublish}
                title={
                    canPublish
                    ? "Publish this trip"
                    : "Complete all required fields before publishing"
                }
                >
                Publish Trip
            </button>
          </div>
        </header>

        {/* EDITOR */}

        {/* EDITOR */}

  <div className="admin-bookings-top-stats">
    <div className="admin-booking-stat-card">
      <div className="admin-booking-stat-content">
        <span className="admin-booking-stat-label">
          Total Bookings
        </span>

        <strong className="admin-booking-stat-value">
          {bookingStats.totalBookings}
        </strong>
      </div>

      <div className="admin-booking-stat-icon">
        #
      </div>
    </div>

    <div className="admin-booking-stat-card">
      <div className="admin-booking-stat-content">
        <span className="admin-booking-stat-label">
          Pending Payments
        </span>

        <strong className="admin-booking-stat-value">
          {bookingStats.pendingPayments}
        </strong>
      </div>

      <div className="admin-booking-stat-icon">
        ₹
      </div>
    </div>

    <div className="admin-booking-stat-card">
      <div className="admin-booking-stat-content">
        <span className="admin-booking-stat-label">
          Confirmed Bookings
        </span>

        <strong className="admin-booking-stat-value">
          {bookingStats.confirmedBookings}
        </strong>
      </div>

      <div className="admin-booking-stat-icon">
        ✓
      </div>
    </div>

    <div className="admin-booking-stat-card">
      <div className="admin-booking-stat-content">
        <span className="admin-booking-stat-label">
          Advance Collected
        </span>

        <strong className="admin-booking-stat-value">
          ₹{bookingStats.advanceCollected.toLocaleString("en-IN")}
        </strong>
      </div>

      <div className="admin-booking-stat-icon">
        ₹
      </div>
    </div>
  </div>

<section className="admin-editor-card">

          {/* LEFT NAVIGATION */}

          <aside className="admin-editor-sidebar">
            <div className="admin-sidebar-title">
              Trip Sections
            </div>

            <nav className="admin-section-nav">
              {sections.map((section) => {
  const sectionMissing =
    section.id === "overview"
      ? missingFields.some((field) =>
          [
            "Trip Name",
            "Destination",
            "Slug",
            "Short Description",
            "Detailed Description",
            "Start Date",
            "End Date",
            "Duration",
            "Price",
            "Capacity",
            "Available Seats",
            "Trip Type",
            "Cover Image",
            "Host",
            "Pickup Point",
            "Cancellation Policy",
          ].includes(field),
        )
      : section.id === "itinerary"
        ? missingFields.includes("Complete Itinerary")
        : section.id === "stay"
          ? missingFields.includes("Accommodation")
          : section.id === "included"
            ? missingFields.includes("What's Included") ||
              missingFields.includes("What's Not Included")
            : section.id === "packing"
              ? missingFields.includes("What to Bring")
              : section.id === "rules"
                ? missingFields.includes("Rules")
                : missingFields.includes("FAQ");

                return (
                    <button
                    key={section.id}
                    type="button"
                    className={`admin-section-nav-item ${
                        activeSection === section.id ? "active" : ""
                    }`}
                    onClick={() => setActiveSection(section.id)}
                    >
                    <span>{section.label}</span>

                    <span
                        className={
                        sectionMissing
                            ? "admin-section-status incomplete"
                            : "admin-section-status complete"
                        }
                    >
                        {sectionMissing ? "!" : "✓"}
                    </span>
                    </button>
                );
                })}
            </nav>
          </aside>

          {/* RIGHT CONTENT */}

          <div className="admin-editor-content">

            {/* OVERVIEW */}

            {activeSection === "overview" && (
              <section className="admin-form-section">
                <div className="admin-form-heading">
                  <h2>Overview</h2>
                  <p>
                    Add the basic information and main details
                    of the trip.
                  </p>
                </div>

                <div className="admin-form-grid">

                  <div className="admin-form-field full">
                    <label>Trip Name *</label>
                    <input
                      value={tripName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTripName(value);

                        setSlug(
                            value
                            .toLowerCase()
                            .trim()
                            .replace(/[^a-z0-9\s-]/g, "")
                            .replace(/\s+/g, "-")
                            .replace(/-+/g, "-"),
                        );
                        }}
                      placeholder="e.g. Bir × Barot Valley 2.0"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Destination *</label>
                    <input
                      value={destination}
                      onChange={(e) =>
                        setDestination(e.target.value)
                      }
                      placeholder="e.g. Himachal Pradesh"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Trip Type</label>
                    <input
                      value={tripType}
                      onChange={(e) =>
                        setTripType(e.target.value)
                      }
                      placeholder="e.g. Adventure"
                    />
                  </div>

                  <div className="admin-form-field full">
                    <label>Slug</label>
                    <input
                    value={slug}
                    readOnly
                    placeholder="Auto-generated from trip name"
                    />
                    <small>
                        Automatically generated from the trip name.
                    </small>
                  </div>

                  <div className="admin-form-field full">
                    <label>Short Description *</label>
                    <textarea
                      value={shortDescription}
                      onChange={(e) =>
                        setShortDescription(e.target.value)
                      }
                      rows={3}
                      placeholder="Short description shown in trip cards..."
                    />
                  </div>

                  <div className="admin-form-field full">
                    <label>Detailed Description *</label>
                    <textarea
                      value={detailedDescription}
                      onChange={(e) =>
                        setDetailedDescription(e.target.value)
                      }
                      rows={6}
                      placeholder="Detailed overview of the trip..."
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) =>
                        setStartDate(e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>End Date *</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) =>
                        setEndDate(e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Duration *</label>
                    <input
                      value={duration}
                      onChange={(e) =>
                        setDuration(e.target.value)
                      }
                      placeholder="e.g. 3 Days / 2 Nights"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Price *</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) =>
                        setPrice(e.target.value)
                      }
                      placeholder="8999"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Capacity *</label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={(e) =>
                        setCapacity(e.target.value)
                      }
                      placeholder="15"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Available Seats *</label>
                    <input
                      type="number"
                      value={availableSeats}
                      onChange={(e) =>
                        setAvailableSeats(e.target.value)
                      }
                      placeholder="15"
                    />
                  </div>

                  <div className="admin-form-field full">
                    <label>Cover Image *</label>
                    <input
                      value={coverImage}
                      onChange={(e) =>
                        setCoverImage(e.target.value)
                      }
                      placeholder="Image URL"
                    />
                  </div>

                  <div className="admin-form-field full">
                    <label>Gallery</label>
                    <textarea
                      value={gallery}
                      onChange={(e) =>
                        setGallery(e.target.value)
                      }
                      rows={3}
                      placeholder="Add image URLs separated by commas..."
                    />
                  </div>

                  <div className="admin-form-field full admin-image-manager">
                    <label>Trip Images</label>
                    <p className="admin-image-help">
                      Upload JPG, PNG, or WebP images. Large files are resized automatically
                      and uploads are limited to 8 MB after optimization.
                    </p>

                    <div className="admin-image-upload-row">
                      <label className="admin-image-upload-button">
                        {isUploadingImage ? "Optimizing..." : "Upload Image"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={isUploadingImage || !backendTripId}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (file) {
                              handleImageUpload(file, makeCoverOnUpload);
                            }
                          }}
                        />
                      </label>

                      <label className="admin-cover-checkbox">
                        <input
                          type="checkbox"
                          checked={makeCoverOnUpload}
                          onChange={(event) =>
                            setMakeCoverOnUpload(event.target.checked)
                          }
                        />
                        Use as cover image
                      </label>
                    </div>

                    {!backendTripId ? (
                      <small>Save the trip before uploading images.</small>
                    ) : null}

                    {imageUploadError ? (
                      <p className="admin-image-error" role="alert">
                        {imageUploadError}
                      </p>
                    ) : null}

                    {tripImages.length > 0 ? (
                      <div className="admin-image-grid">
                        {tripImages.map((image) => (
                          <div className="admin-image-card" key={image.id}>
                            <img src={image.image_url} alt="Trip upload" />
                            <div className="admin-image-card-footer">
                              <span>
                                {image.is_cover ? "Cover image" : `Image ${image.display_order + 1}`}
                              </span>
                              <div className="admin-image-card-actions">
                                <button
                                  type="button"
                                  className="admin-image-order"
                                  disabled={image.display_order === 0}
                                  onClick={() =>
                                    handleReorderImage(
                                      tripImages.findIndex((item) => item.id === image.id),
                                      -1,
                                    )
                                  }
                                  aria-label="Move image up"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="admin-image-order"
                                  disabled={image.display_order === tripImages.length - 1}
                                  onClick={() =>
                                    handleReorderImage(
                                      tripImages.findIndex((item) => item.id === image.id),
                                      1,
                                    )
                                  }
                                  aria-label="Move image down"
                                >
                                  ↓
                                </button>
                              <button
                                type="button"
                                className="admin-image-delete"
                                onClick={() => handleDeleteImage(image)}
                              >
                                Delete
                              </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="admin-form-field">
                    <label>Host *</label>
                    <input
                      value={host}
                      onChange={(e) =>
                        setHost(e.target.value)
                      }
                      placeholder="Host name"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Pickup Point *</label>
                    <input
                      value={pickupPoint}
                      onChange={(e) =>
                        setPickupPoint(e.target.value)
                      }
                      placeholder="Pickup location"
                    />
                  </div>

                  <div className="admin-form-field full">
                    <label>Who is this trip suitable for?</label>
                    <textarea
                      value={suitableFor}
                      onChange={(e) =>
                        setSuitableFor(e.target.value)
                      }
                      rows={4}
                      placeholder="Describe who this trip is suitable for..."
                    />
                  </div>

                  <div className="admin-form-field full">
                    <label>Cancellation Policy *</label>
                    <textarea
                      value={cancellationPolicy}
                      onChange={(e) =>
                        setCancellationPolicy(e.target.value)
                      }
                      rows={5}
                      placeholder="Enter the cancellation policy..."
                    />
                  </div>

                </div>
              </section>
            )}

            {/* ITINERARY */}

            {activeSection === "itinerary" && (
              <section className="admin-form-section">
                <div className="admin-form-heading">
                  <h2>Itinerary</h2>
                  <p>
                    Build the trip day by day.
                  </p>
                </div>

                <div className="admin-repeatable-list">
                  {itinerary.map((day, index) => (
                    <div
                      className="admin-repeatable-card"
                      key={index}
                    >
                      <div className="admin-repeatable-header">
                        <h3>Day {day.day}</h3>

                        <button
                          type="button"
                          className="admin-remove-button"
                          onClick={() =>
                            removeItineraryDay(index)
                          }
                        >
                          Remove
                        </button>
                      </div>

                      <div className="admin-form-field">
                        <label>Day Title *</label>
                        <input
                          value={day.title}
                          onChange={(e) =>
                            updateItinerary(
                              index,
                              "title",
                              e.target.value,
                            )
                          }
                          placeholder="e.g. Arrival & Local Exploration"
                        />
                      </div>

                      <div className="admin-form-field">
                        <label>Description *</label>
                        <textarea
                          value={day.description}
                          onChange={(e) =>
                            updateItinerary(
                              index,
                              "description",
                              e.target.value,
                            )
                          }
                          rows={5}
                          placeholder="Describe activities for this day..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="admin-add-button"
                  onClick={addItineraryDay}
                >
                  + Add Day
                </button>
              </section>
            )}

            {/* STAY */}

            {activeSection === "stay" && (
              <section className="admin-form-section">
                <div className="admin-form-heading">
                  <h2>Stay</h2>
                  <p>
                    Add accommodation and stay information.
                  </p>
                </div>

                <div className="admin-form-grid">

                  <div className="admin-form-field full">
                    <label>Accommodation *</label>
                    <input
                      value={accommodation}
                      onChange={(e) =>
                        setAccommodation(e.target.value)
                      }
                      placeholder="e.g. Mountain View Homestay"
                    />
                  </div>

                  <div className="admin-form-field full">
                    <label>Accommodation Description</label>
                    <textarea
                      value={accommodationDescription}
                      onChange={(e) =>
                        setAccommodationDescription(
                          e.target.value,
                        )
                      }
                      rows={5}
                      placeholder="Describe the accommodation..."
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Stay Location</label>
                    <input
                      value={stayLocation}
                      onChange={(e) =>
                        setStayLocation(e.target.value)
                      }
                      placeholder="Location"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Group Size</label>
                    <input
                      value={groupSize}
                      onChange={(e) =>
                        setGroupSize(e.target.value)
                      }
                      placeholder="e.g. 10–15 people"
                    />
                  </div>

                </div>
              </section>
            )}

            {/* INCLUDED */}

            {activeSection === "included" && (
              <section className="admin-form-section">
                <div className="admin-form-heading">
                  <h2>Included</h2>
                  <p>
                    Specify what is and isn't included in the
                    trip price.
                  </p>
                </div>

                <div className="admin-list-section">
                  <h3>What's Included *</h3>

                  {included.map((item, index) => (
                    <div
                      className="admin-list-input"
                      key={index}
                    >
                      <input
                        value={item}
                        onChange={(e) =>
                          updateIncluded(
                            index,
                            e.target.value,
                          )
                        }
                        placeholder="e.g. Accommodation"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeIncluded(index)
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="admin-add-button"
                    onClick={addIncluded}
                  >
                    + Add Inclusion
                  </button>
                </div>

                <div className="admin-list-section">
                  <h3>What's Not Included *</h3>

                  {notIncluded.map((item, index) => (
                    <div
                      className="admin-list-input"
                      key={index}
                    >
                      <input
                        value={item}
                        onChange={(e) =>
                          updateNotIncluded(
                            index,
                            e.target.value,
                          )
                        }
                        placeholder="e.g. Personal expenses"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeNotIncluded(index)
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="admin-add-button"
                    onClick={addNotIncluded}
                  >
                    + Add Exclusion
                  </button>
                </div>
              </section>
            )}

            {/* WHAT TO BRING */}

            {activeSection === "packing" && (
              <section className="admin-form-section">
                <div className="admin-form-heading">
                  <div className="admin-heading-with-counter">
                    <div>
                      <h2>What to Bring</h2>
                      <p>
                        Add the things travellers should bring.
                      </p>
                    </div>

                    <span className="admin-counter">
                      {packingItems.length} / 9
                    </span>
                  </div>
                </div>

                <div className="admin-list-section">

                  {packingItems.map((item, index) => (
                    <div
                      className="admin-list-input"
                      key={index}
                    >
                      <span className="admin-list-number">
                        {index + 1}
                      </span>

                      <input
                        value={item}
                        onChange={(e) =>
                          updatePackingItem(
                            index,
                            e.target.value,
                          )
                        }
                        placeholder="e.g. Comfortable shoes"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removePackingItem(index)
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="admin-add-button"
                    onClick={addPackingItem}
                    disabled={packingItems.length >= 9}
                  >
                    + Add Item
                  </button>

                </div>
              </section>
            )}

            {/* RULES */}

            {activeSection === "rules" && (
              <section className="admin-form-section">
                <div className="admin-form-heading">
                  <h2>Rules</h2>
                  <p>
                    Add rules and guidelines travellers need
                    to follow.
                  </p>
                </div>

                <div className="admin-list-section">

                  {rules.map((rule, index) => (
                    <div
                      className="admin-list-input"
                      key={index}
                    >
                      <span className="admin-list-number">
                        {index + 1}
                      </span>

                      <input
                        value={rule}
                        onChange={(e) =>
                          updateRule(
                            index,
                            e.target.value,
                          )
                        }
                        placeholder="Enter trip rule..."
                      />

                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="admin-add-button"
                    onClick={addRule}
                  >
                    + Add Rule
                  </button>

                </div>
              </section>
            )}

            {/* FAQ */}

            {activeSection === "faq" && (
              <section className="admin-form-section">
                <div className="admin-form-heading">
                  <h2>FAQ</h2>
                  <p>
                    Add frequently asked questions about the
                    trip.
                  </p>
                </div>

                <div className="admin-repeatable-list">

                  {faqs.map((faq, index) => (
                    <div
                      className="admin-repeatable-card"
                      key={index}
                    >
                      <div className="admin-repeatable-header">
                        <h3>Question {index + 1}</h3>

                        <button
                          type="button"
                          className="admin-remove-button"
                          onClick={() =>
                            removeFAQ(index)
                          }
                        >
                          Remove
                        </button>
                      </div>

                      <div className="admin-form-field">
                        <label>Question *</label>
                        <input
                          value={faq.question}
                          onChange={(e) =>
                            updateFAQ(
                              index,
                              "question",
                              e.target.value,
                            )
                          }
                          placeholder="e.g. Is this trip suitable for beginners?"
                        />
                      </div>

                      <div className="admin-form-field">
                        <label>Answer *</label>
                        <textarea
                          value={faq.answer}
                          onChange={(e) =>
                            updateFAQ(
                              index,
                              "answer",
                              e.target.value,
                            )
                          }
                          rows={4}
                          placeholder="Enter the answer..."
                        />
                      </div>
                    </div>
                  ))}

                </div>

                <button
                  type="button"
                  className="admin-add-button"
                  onClick={addFAQ}
                >
                  + Add FAQ
                </button>
              </section>
            )}
            {/* BOOKINGS */}

            <section
              className="admin-form-section admin-bookings-form-section"
              style={{ display: activeSection === "bookings" ? "" : "none" }}
              aria-hidden={activeSection !== "bookings"}
            >
                <AdminTripBookings
                tripId={tripId}
                tripPrice={Number(price) || 8999}
                onStatsChange={setBookingStats}
                />
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
