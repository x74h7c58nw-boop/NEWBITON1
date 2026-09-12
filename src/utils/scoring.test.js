import test from 'node:test';
import assert from 'node:assert/strict';
import {jobs} from '../data/jobs.js';
import {analyze,defaultUser,calculateGrade,calculateRealHourlyPay,getUserWeights} from './scoring.js';
test('왕복 시간과 비용을 반영한 실제 시급',()=>{assert.equal(calculateRealHourlyPay(jobs[4]),11333);assert.equal(calculateRealHourlyPay(jobs[0]),12857);});
test('등급 경계',()=>{assert.deepEqual([9500,9200,8500,7600,6500,5500,5499].map(calculateGrade),['SSS+','SSS','SS','S','A','B','C']);});
test('선호도별 전투력 변화와 점수 범위',()=>{for(const j of jobs){const a=analyze(j,defaultUser),b=analyze(j,{...defaultUser,time:10,pay:80,distance:10,type:'short'});assert.notEqual(a.power,b.power);assert.ok(a.power>=0&&a.power<=9999);for(const v of Object.values(a.stats))assert.ok(v>=0&&v<=100);}assert.ok(Math.abs(Object.values(getUserWeights(defaultUser)).reduce((a,b)=>a+b)-1)<1e-10);});
test('선호 시간과 가능 요일이 적합도에 반영',()=>{const j=jobs[0];const a=analyze(j,defaultUser),b=analyze(j,{...defaultUser,days:[]});assert.ok(a.fit>b.fit);assert.equal(b.fit,0);const c=analyze(j,{...defaultUser,preferredStart:20,preferredEnd:24});assert.equal(c.fit,0);});
test('학교·지역·교통수단 및 단기 선호 반영',()=>{assert.ok(analyze(jobs[0],{...defaultUser,school:'다른 대학교',area:'다른 지역'}).commuteMinutes>analyze(jobs[0],defaultUser).commuteMinutes);assert.equal(analyze(jobs[4],{...defaultUser,transport:'자전거'}).transportCost,0);});

test('100점 배분은 경계값과 연속 변경에서도 합계 100을 유지한다',async()=>{const {redistribute}=await import('./scoring.js');let u={...defaultUser};for(const key of ['time','pay','distance'])for(let n=0;n<=100;n++){u=redistribute(u,key,n);assert.equal(u.time+u.pay+u.distance,100);assert.equal(u[key],n);assert.ok([u.time,u.pay,u.distance].every(v=>Number.isInteger(v)&&v>=0&&v<=100));}});
test('각 항목 100점은 해당 점수만 반영하며 업무강도는 영향이 없다',()=>{for(const [key,stat] of [['time','schedule'],['pay','gold'],['distance','distance']]){const u={...defaultUser,time:0,pay:0,distance:0,[key]:100};const a=analyze(jobs[0],u);assert.equal(a.power,Math.round(a.stats[stat]/100*9999));assert.equal(a.power,analyze({...jobs[0],workload:5},{...u,workload:2}).power);}});

test('선호 시간은 야간과 시간 무관을 지원한다',()=>{const j={...jobs[0],days:[0],start:22,shiftHours:8};assert.equal(analyze(j,{...defaultUser,preferredStart:22,preferredEnd:6}).fit,100);assert.equal(analyze(j,{...defaultUser,preferredStart:0,preferredEnd:0}).fit,100);assert.equal(analyze(j,{...defaultUser,preferredStart:9,preferredEnd:18}).fit,0);assert.equal(analyze(j,{...defaultUser,preferredStart:22,preferredEnd:6,days:[0]}).fit,25);});
