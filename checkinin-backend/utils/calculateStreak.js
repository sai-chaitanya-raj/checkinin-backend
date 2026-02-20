/**
 * Calculate consecutive check-in streak from sorted check-in dates.
 * Expects dates in "YYYY-MM-DD" format, sorted ascending (oldest first).
 */
function calculateStreak(checkIns) {
  if (!checkIns || checkIns.length === 0) return 0;

  const dates = checkIns
    .map((c) => (typeof c === "string" ? c : c.date))
    .filter(Boolean)
    .sort();

  const uniqueDates = [...new Set(dates)];
  if (uniqueDates.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];

  let streak = 0;
  let currentDate = new Date(today);

  for (let i = uniqueDates.length - 1; i >= 0; i--) {
    const checkInDate = uniqueDates[i];
    const expectedDate = currentDate.toISOString().split("T")[0];

    if (checkInDate === expectedDate) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (new Date(checkInDate) < currentDate) {
      break;
    }
  }

  return streak;
}

module.exports = { calculateStreak };
