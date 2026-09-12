import test from 'node:test';
import assert from 'node:assert/strict';
import {jobs} from '../data/jobs.js';
import {analyze,defaultUser,calculateGrade,calculateRealHourlyPay,getUserWeights} from './scoring.js';
test('왕복 시간과 비용을 반영한 실제 시급',()=>{assert.equal(calculateRealHourlyPay(jobs[4]),11333);assert.equal(calculateRealHourlyPay(jobs[0]),12857);});
test('등급 경계',()=>{assert.deepEqual([9500,9200,8500,7600,6500,5500,5499].map(calculateGrade),['SSS+','SSS','SS','S','A','B','C']);});
test('선호도별 전투력 변화와 점수 범위',()=>{for(const j of jobs){const a=analyze(j,defaultUser),b=analyze(j,{...defaultUser,workload:2,pay:2,distance:2,type:'short'});assert.notEqual(a.power,b.power);assert.ok(a.power>=0&&a.power<=9999);for(const v of Object.values(a.stats))assert.ok(v>=0&&v<=100);}assert.ok(Math.abs(Object.values(getUserWeights(defaultUser)).reduce((a,b)=>a+b)-1)<1e-10);});
test('수업과 가능 요일이 적합도에 반영',()=>{const j=jobs[0];const a=analyze(j,defaultUser),b=analyze(j,{...defaultUser,days:[]});assert.ok(a.fit>b.fit);assert.equal(b.fit,0);const c=analyze(j,{...defaultUser,classes:['1-13','1-14','1-15','1-16','3-13','3-14','3-15','3-16']});assert.equal(c.fit,0);});
test('학교·지역·교통수단 및 단기 선호 반영',()=>{assert.ok(analyze(jobs[0],{...defaultUser,school:'다른 대학교',area:'다른 지역'}).commuteMinutes>analyze(jobs[0],defaultUser).commuteMinutes);assert.equal(analyze(jobs[4],{...defaultUser,transport:'자전거'}).transportCost,0);assert.ok(analyze(jobs[7],{...defaultUser,type:'short'}).power>analyze(jobs[7],defaultUser).power);});
