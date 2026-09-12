export function calculateRealHourlyPay(job) {
  const hourlyPay = Number(job.hourlyPay) || 0;
  const shiftHours = Number(job.shiftHours) || 0;
  const commuteMinutes = Number(job.commuteMinutes) || 0;
  const oneWayTransportCost = Number(job.transportCost) || 0;

  // 근무해서 버는 총 금액
  const workIncome =
    hourlyPay * shiftHours;

  // 왕복 교통비
  const roundTripTransportCost =
    oneWayTransportCost * 2;

  // 왕복 이동시간
  const roundTripCommuteHours =
    commuteMinutes * 2 / 60;

  // 알바 때문에 실제로 사용하는 전체 시간
  const totalHours =
    shiftHours + roundTripCommuteHours;

  if (totalHours <= 0) {
    return 0;
  }

  // (근무수익 - 왕복교통비) / 총 사용시간
  return Math.round(
    (workIncome - roundTripTransportCost) /
    totalHours
  );
}