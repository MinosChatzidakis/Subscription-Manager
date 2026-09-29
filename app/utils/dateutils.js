export const formatDate = (date) => {
  const yyyy = date.getFullYear();

  // Months are 0-indexed in JS (January is 0), so we add 1.
  // padStart(2, '0') ensures months 1-9 become '01'-'09'
  const mm = String(date.getMonth() + 1).padStart(2, "0");

  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

export const calculateNextDueDate = (startDateStr, frequency) => {
  if (!startDateStr) return "";

  // Create a date object from the YYYY-MM-DD string
  const [year, month, day] = startDateStr.split("-").map(Number);
  // Note: month is 0-indexed in the Date constructor, so subtract 1
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

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `API Error: ${res.status}`);
  }

  // Return null for 204 No Content (often used in DELETE)
  // or parse JSON for other successful responses
  if (res.status === 204) return null;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}
