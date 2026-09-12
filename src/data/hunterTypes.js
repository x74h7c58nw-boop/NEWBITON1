import {analyze} from '../utils/scoring.js';

// 생활 조건은 그대로 두고 네 가지 선호와 계약 유형만 비교한다.
export const hunterTypes = [
  {id:'long',name:'장기전의 지배자',english:'LONG GAME',icon:'shield',color:'#8c9eff',description:'장기 근무와 꾸준한 수입을 선호하는 헌터.',preferences:{type:'long',workload:1,time:2,pay:1,distance:1}},
  {id:'gold',name:'단기 폭딜 골드헌터',english:'GOLD HUNTER',icon:'zap',color:'#ffc857',description:'짧은 기간, 짧은 근무로 골드를 모으는 헌터.',preferences:{type:'short',workload:1,time:0,pay:2,distance:1}},
  {id:'berserker',name:'고시급 버서커',english:'BERSERKER',icon:'swords',color:'#ff657d',description:'높은 시급을 위해 강도와 이동을 감수하는 헌터.',preferences:{type:'short',workload:2,time:2,pay:2,distance:2}},
  {id:'near',name:'5분컷 장인',english:'CLOSE RANGE',icon:'map',color:'#68d9c0',description:'이동을 줄여 내 시간을 지키는 헌터.',preferences:{type:'long',workload:1,time:1,pay:1,distance:0}},
  {id:'comfort',name:'현생 수호자',english:'LIFE GUARDIAN',icon:'heart',color:'#d198ff',description:'편한 업무와 일상의 여유를 중시하는 헌터.',preferences:{type:'long',workload:0,time:1,pay:0,distance:1}},
  {id:'quick',name:'치고 빠지는 자',english:'HIT & RUN',icon:'timer',color:'#ffab7c',description:'긴 근무보다 짧은 근무를 선호하는 헌터.',preferences:{type:'short',workload:1,time:0,pay:0,distance:1}},
  {id:'balanced',name:'밸런스 마스터',english:'BALANCE MASTER',icon:'scale',color:'#90b5ff',description:'보상, 시간, 강도의 균형을 찾는 헌터.',preferences:{type:'long',workload:1,time:1,pay:1,distance:1}},
  {id:'gap',name:'공강 암살자',english:'GAP ASSASSIN',icon:'calendar',color:'#b5abff',description:'비는 일정에 단기 퀘스트를 넣는 헌터.',preferences:{type:'short',workload:1,time:1,pay:0,distance:2}}
];

export function rankForType(jobs,user,type,category='전체') {
  const profile={...user,...type.preferences};
  return jobs.filter(job=>category==='전체'||job.category===category)
    .map(job=>({...analyze(job,profile),analysisContext:`${type.name} · 대표 설정`}))
    .sort((a,b)=>b.power-a.power||Number(a.id)-Number(b.id));
}
