import test from 'node:test';
import assert from 'node:assert/strict';
import {hunterTypes,rankForType} from './hunterTypes.js';
import {jobs} from './jobs.js';
import {defaultUser,analyze} from '../utils/scoring.js';
import {titleGenerator} from '../utils/titleGenerator.js';

test('8가지 대표 설정은 표시된 칭호와 일치한다',()=>{
  assert.equal(hunterTypes.length,8);
  for(const type of hunterTypes) assert.equal(titleGenerator({...defaultUser,...type.preferences}),type.name);
});
test('모든 유형은 원본 10개 공고를 독립 계산하고 내림차순 정렬한다',()=>{
  const orders=new Set();
  for(const type of hunterTypes){
    const ranked=rankForType(jobs,defaultUser,type);
    assert.equal(new Set(ranked.map(j=>j.id)).size,jobs.length);
    assert.ok(ranked.every((j,i)=>i===0||ranked[i-1].power>=j.power));
    for(const job of ranked) assert.equal(job.power,analyze(jobs.find(j=>j.id===job.id),{...defaultUser,...type.preferences}).power);
    orders.add(ranked.map(j=>j.id).join(','));
  }
  assert.ok(orders.size>1,'유형마다 실제로 다른 순위가 나와야 함');
});
test('카테고리와 사용자의 시간표를 보존하며 사용자 설정은 변경하지 않는다',()=>{
  const user=structuredClone(defaultUser),before=JSON.stringify(user);
  const cafes=rankForType(jobs,user,hunterTypes[0],'카페');
  assert.equal(cafes.length,2);
  assert.ok(cafes.every(j=>j.category==='카페'));
  assert.equal(JSON.stringify(user),before);
  const unavailable=rankForType(jobs,{...user,days:[]},hunterTypes[0]);
  assert.ok(unavailable.every(j=>j.fit===0));
});
