// --- Helper Functions ---

export function checkStatusChange(subscription) {
  let updated = false;
  // Clone the subscription so we don't mutate the original DB row directly
  const sub = { ...subscription };

  const {
    next_due_date = "",
    status = "",
    frequency = "",
    payment_status = "",
  } = sub;

  if (!next_due_date) return { subscription: sub, updated };

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 7);

  const todayStr = formatDate(today);
  const futureStr = formatDate(futureDate);

  // Renewal coming up between today and 7 days from now
  if (
    next_due_date >= todayStr &&
    next_due_date <= futureStr &&
    status.toLowerCase() !== "renewal coming up"
  ) {
    sub.status = "renewal coming up";
    updated = true;
  }

  // Day of the renewal (or if it slipped into the past)
  if (next_due_date <= todayStr) {
    sub.next_due_date = calculateNextDueDate(next_due_date, frequency);

    if (
      status.toLowerCase() === "renewal coming up" ||
      status.toLowerCase() === "active"
    ) {
      sub.status = "active";
    }

    if (!payment_status || payment_status.trim() === "") {
      sub.payment_status = "pending";
    }
    updated = true;
  }

  return { subscription: sub, updated };
}

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const calculateNextDueDate = (startDateStr, frequency) => {
  if (!startDateStr) return "";

  const [year, month, day] = startDateStr.split("-").map(Number);
  const nextDate = new Date(year, month - 1, day);

  if (frequency === "anualy") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else if (frequency === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 2);
  }

  return formatDate(nextDate);
};
