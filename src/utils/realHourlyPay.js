export function calculateRealHourlyPay(job){return Math.round((job.hourlyPay*job.shiftHours-job.transportCost)/(job.shiftHours+job.commuteMinutes*2/60));}
