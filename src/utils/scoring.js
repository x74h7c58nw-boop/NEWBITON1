import {calculateRealHourlyPay} from './realHourlyPay.js';
export {calculateRealHourlyPay};
const clamp=n=>Math.max(0,Math.min(100,n));
export const defaultUser={name:'',email:'',profileReady:false,type:'long',time:34,pay:33,distance:33,categories:[],school:'고려대학교',area:'성북구 안암동',days:[0,1,2,3,4,5,6],transport:'버스',maxTravel:30,preferredStart:9,preferredEnd:18,complete:false};
export function effectiveJob(j,u){const near=j.school&&u.school.trim()===j.school;const home=j.area!=='재택'&&u.area.includes(j.area);let minutes=j.commuteMinutes;if(j.school&&!near&&!home)minutes+=20;if(home&&!near)minutes=Math.max(3,minutes-8);if(u.transport==='자전거')minutes=Math.round(minutes*.7);if(u.transport==='도보'&&minutes>15)minutes=Math.round(minutes*1.8);return {...j,commuteMinutes:minutes,transportCost:['도보','자전거'].includes(u.transport)?0:j.transportCost};}
export const calculatePayScore=j=>clamp(j.hourlyPay/15000*100);
export const calculateDistanceScore=(j,u)=>clamp(100-j.commuteMinutes/Math.max(5,u.maxTravel)*45);
export const calculateTransportScore=j=>clamp(100-j.transportCost/50);
export function calculateScheduleScore(j,u){const start=u.preferredStart??9,end=u.preferredEnd??18;const preferred=h=>start===end|| (start<end?h>=start&&h<end:h>=start||h<end);let total=0,free=0;for(const d of j.days)for(let h=j.start;h<j.start+j.shiftHours;h++){total++;if(u.days.includes((d+Math.floor(h/24))%7)&&preferred(h%24))free++;}return clamp(100*(total?free/total:0));}
export const calculateTypeScore=(j,u)=>j.type===u.type?100:65;
export function getUserWeights(u){const sum=u.time+u.pay+u.distance||100;return {gold:u.pay/sum,distance:u.distance/sum,schedule:u.time/sum};}
export function redistribute(u,key,value){const next=Math.max(0,Math.min(100,Math.round(Number(value)||0)));const others=['time','pay','distance'].filter(k=>k!==key);const total=u[others[0]]+u[others[1]];const first=Math.round((100-next)*(total?u[others[0]]/total:0.5));return {...u,[key]:next,[others[0]]:first,[others[1]]:100-next-first};}
export function analyze(job,u){const j=effectiveJob(job,u);const stats={gold:calculatePayScore(j),real:clamp(calculateRealHourlyPay(j)/13500*100),distance:calculateDistanceScore(j,u),schedule:calculateScheduleScore(j,u),transport:calculateTransportScore(j,u),type:calculateTypeScore(j,u)};const weights=getUserWeights(u);const power=Math.round(Object.entries(weights).reduce((a,[k,v])=>a+stats[k]*v,0)/100*9999);return {...j,stats,weights,power,grade:calculateGrade(power),realPay:calculateRealHourlyPay(j),fit:Math.round(stats.schedule),lifeDamage:Math.round(100-(stats.schedule+stats.distance)/2)};}
export const calculatePower=(j,u)=>analyze(j,u).power;
export function calculateGrade(p){return p>=9500?'SSS+':p>=9200?'SSS':p>=8500?'SS':p>=7600?'S':p>=6500?'A':p>=5500?'B':'C';}
export const calculateLifeDamage=(j,u)=>analyze(j,u).lifeDamage;
