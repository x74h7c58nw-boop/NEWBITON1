import {calculateRealHourlyPay} from './realHourlyPay.js';
export {calculateRealHourlyPay};
const clamp=n=>Math.max(0,Math.min(100,n));
export const defaultUser={type:'long',workload:1,time:1,pay:1,distance:1,school:'고려대학교',area:'성북구 안암동',days:[0,1,2,3,4,5,6],transport:'버스',maxTravel:30,classes:['0-9','0-10','2-9','2-10','4-10'],complete:false};
export function effectiveJob(j,u){const near=j.school&&u.school.trim()===j.school;const home=j.area!=='재택'&&u.area.includes(j.area);let minutes=j.commuteMinutes;if(j.school&&!near&&!home)minutes+=20;if(home&&!near)minutes=Math.max(3,minutes-8);if(u.transport==='자전거')minutes=Math.round(minutes*.7);if(u.transport==='도보'&&minutes>15)minutes=Math.round(minutes*1.8);return {...j,commuteMinutes:minutes,transportCost:['도보','자전거'].includes(u.transport)?0:j.transportCost};}
export const calculatePayScore=j=>clamp(j.hourlyPay/15000*100);
export const calculateDistanceScore=(j,u)=>clamp(100-j.commuteMinutes/Math.max(5,u.maxTravel)*[45,25,12][u.distance]);
export const calculateTransportScore=j=>clamp(100-j.transportCost/50);
export const calculateWorkloadScore=(j,u)=>clamp(100-(j.workload-1)*[19,10,3][u.workload]);
export function calculateScheduleScore(j,u){let total=0,free=0;for(const d of j.days)for(let h=j.start;h<j.start+j.shiftHours;h++){total++;if(u.days.includes(d)&&!u.classes.includes(`${d}-${h}`))free++;}const desired=[3,5,8][u.time];return clamp(j.scheduleFit*(free/total)-Math.max(0,j.shiftHours-desired)*[7,3,0][u.time]);}
export const calculateTypeScore=(j,u)=>j.type===u.type?100:65;
export function getUserWeights(u){const w={gold:[.13,.22,.38][u.pay],real:[.15,.22,.27][u.pay],distance:[.4,.18,.08][u.distance],schedule:u.type==='long'?.25:.18,transport:.09,workload:[.27,.16,.06][u.workload],type:.07};const sum=Object.values(w).reduce((a,b)=>a+b,0);return Object.fromEntries(Object.entries(w).map(([k,v])=>[k,v/sum]));}
export function analyze(job,u){const j=effectiveJob(job,u);const stats={gold:calculatePayScore(j),real:clamp(calculateRealHourlyPay(j)/13500*100),distance:calculateDistanceScore(j,u),schedule:calculateScheduleScore(j,u),transport:calculateTransportScore(j,u),workload:calculateWorkloadScore(j,u),type:calculateTypeScore(j,u)};const weights=getUserWeights(u);const power=Math.round(Object.entries(stats).reduce((a,[k,v])=>a+v*weights[k],0)/100*9999);return {...j,stats,weights,power,grade:calculateGrade(power),realPay:calculateRealHourlyPay(j),fit:Math.round(stats.schedule),lifeDamage:Math.round(100-(stats.schedule+stats.workload+stats.distance)/3)};}
export const calculatePower=(j,u)=>analyze(j,u).power;
export function calculateGrade(p){return p>=9500?'SSS+':p>=9200?'SSS':p>=8500?'SS':p>=7600?'S':p>=6500?'A':p>=5500?'B':'C';}
export const calculateLifeDamage=(j,u)=>analyze(j,u).lifeDamage;
