export function calculateStartDate(timeRange: string): Date {
  const now = new Date();
  let startDate: Date;

  switch (timeRange) {
    case "1day":
      startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      break;
    case "7days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30days":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90days":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Set time to start of day to include full day range
  startDate.setHours(0, 0, 0, 0);
  
  return startDate;
}