import React,{useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Crown,Shield,Zap,Swords,MapPin,Heart,Timer,Scale,CalendarDays,ArrowUpRight,ArrowLeft,ExternalLink} from 'lucide-react';
import {Rankings} from './Board.jsx';
import {QuestCard,RankBadge,money} from '../components/UI.jsx';
import {jobs as rawJobs} from '../data/jobs.js';
import {hunterTypes,rankForType} from '../data/hunterTypes.js';
import {anamListings} from '../data/anamListings.js';
import {titleGenerator} from '../utils/titleGenerator.js';
import {options} from './Onboarding.jsx';

const icons={shield:Shield,zap:Zap,swords:Swords,map:MapPin,heart:Heart,timer:Timer,scale:Scale,calendar:CalendarDays};
const categories=['전체','카페','편의점','학원','사무','행사','매장','음식점','물류'];

function TypeSettings({type}) {
  return <div className="type-preferences"><span>{type.preferences.type==='short'?'단기':'장기'}</span>{Object.entries(options).map(([key,values])=><span key={key}>{values} {type.preferences[key]}점</span>)}</div>;
}

export function HunterRankings({user,jobs,onReason,...props}) {
  const [params,setParams]=useSearchParams();
  const filter=params.get('category')||'전체';
  const selected=hunterTypes.find(type=>type.id===params.get('type'));
  const mine=titleGenerator(user);
  const mineType=hunterTypes.find(type=>type.name===mine);
  const currentRanks=new Map(jobs.filter(j=>filter==='전체'||j.category===filter).map((j,i)=>[j.id,i+1]));
  const pickType=id=>setParams({view:'types',...(id?{type:id}:{}),...(filter!=='전체'?{category:filter}:{})});
  const pickCategory=category=>setParams({view:'types',...(selected?{type:selected.id}:{}),...(category!=='전체'?{category}:{})});
  const list=selected?rankForType(rawJobs,user,selected,filter):[];

  return <section className="hunter-rankings">
    <span className="eyebrow">HUNTER CLASS LEADERBOARDS / 08 TYPES</span>
    <h1>{selected?`${selected.name} 랭킹`:<>모든 유형의 랭킹<span className="dot">.</span></>}</h1>
    <p className="muted">{selected?selected.description:'같은 퀘스트, 다른 1위. 여덟 헌터 유형의 순위를 한눈에 비교해봐.'}</p>
    <div className="ranking-context"><Shield size={23}/><div><b>내 유형 · {mine}</b><p>학교·지역·선호 시간는 내 설정을 유지하고, 각 유형의 대표 선호로 순위를 계산해.</p><small>가상 공고 {rawJobs.length}개 기준 · 실제 이용자 집계가 아닌 유형별 시뮬레이션</small></div>{mineType&&<button className="secondary" onClick={()=>pickType(mineType.id)}>내 유형 랭킹 <ArrowUpRight size={15}/></button>}</div>
    <div className="type-shortcuts" aria-label="헌터 유형 선택"><button className={!selected?'active':''} onClick={()=>pickType(null)}>전체 유형</button>{hunterTypes.map(type=><button key={type.id} className={selected?.id===type.id?'active':''} onClick={()=>pickType(type.id)}>{type.name}{type.name===mine&&<small>MY</small>}</button>)}</div>
    <div className="filters" aria-label="유형 랭킹 카테고리">{categories.map(category=><button key={category} className={filter===category?'selected':''} aria-pressed={filter===category} onClick={()=>pickCategory(category)}>{category}</button>)}</div>
    {selected?<>
      <button className="type-back" onClick={()=>pickType(null)}><ArrowLeft size={15}/> 모든 유형 순위표</button>
      <div className="selected-type-summary" style={{'--type-color':selected.color}}><span className="eyebrow">{selected.english} / REPRESENTATIVE PREFERENCES</span><TypeSettings type={selected}/><p className="muted">카드의 점수와 추천 이유는 <b>{selected.name}</b> 기준이야. 상세 페이지와 배틀은 내 개인 설정 기준으로 열려.</p></div>
      <div className="section-label"><span>{list.length} QUESTS · {selected.name} 기준</span><small>POWER 높은 순</small></div>
      <div className="quest-grid ranking-grid">{list.map((job,i)=><QuestCard key={job.id} job={job} index={i} featured={i===0} {...props} onReason={onReason} saved={props.saved.includes(job.id)}/>)}</div>
    </>:<div className="type-leaderboards">{hunterTypes.map(type=>{
      const ranked=rankForType(rawJobs,user,type,filter),Icon=icons[type.icon];
      return <article className={`type-board ${type.name===mine?'my-type-board':''}`} key={type.id} style={{'--type-color':type.color}}>
        <div className="type-board-top"><span className="type-emblem"><Icon size={22}/></span><span className="eyebrow">{type.english}</span>{type.name===mine&&<span className="my-type-label">MY TYPE</span>}</div>
        <h2>{type.name} 랭킹</h2><p className="muted">{type.description}</p><TypeSettings type={type}/>
        <div className="type-list-head"><span>RANK / QUEST</span><span>GRADE · POWER</span></div>
        <ol className="type-rank-list">{ranked.map((job,i)=>{
          const delta=currentRanks.get(job.id)-(i+1);
          return <li key={job.id}><button aria-label={`${type.name} ${i+1}위 ${job.name}, ${job.grade}, 전투력 ${money(job.power)}. 추천 이유 보기`} onClick={()=>onReason(job)}>
            <span className={`position ${i===0?'first':''}`}>{i===0?<Crown size={18}/>:String(i+1).padStart(2,'0')}</span>
            <span className="type-job-name"><b>{job.name}</b><small>{job.category} · {money(job.hourlyPay)}원 <em className={delta>0?'rank-up':delta<0?'rank-down':''}>{delta>0?`내 순위보다 ↑${delta}`:delta<0?`내 순위보다 ↓${-delta}`:'내 순위와 같음'}</em></small></span>
            <span className="type-job-score"><RankBadge grade={job.grade}/><b>{money(job.power)}</b></span>
          </button></li>;
        })}</ol><button className="type-full-link" onClick={()=>pickType(type.id)}>{type.name} 전체 랭킹 <ArrowUpRight size={17}/></button>
      </article>;
    })}</div>}
  </section>;
}

function AnamListings() {
  const [showClosed,setShowClosed]=useState(false),[category,setCategory]=useState('전체');
  const visible=anamListings.filter(j=>(showClosed||j.status!=='closed')&&(category==='전체'||j.category===category));
  return <section>
    <span className="eyebrow">ANAM LOCAL QUESTS / SOURCE LINKS</span><h1>안암에서 찾은 공고<span className="dot">.</span></h1>
    <p className="muted">실제 매장의 공개 채용 자료를 모았어. 마음에 드는 곳은 원문으로 이어서 확인해봐.</p>
    <div className="source-note"><MapPin size={22}/><div><b>안암 지역 · 공개 검색 자료 확인 2026.09.12</b><p>현재 모집 여부는 원문에서 다시 확인해줘. 확인되지 않은 급여·이동시간는 채워 넣지 않았고, POWER와 등급은 아직 계산하지 않아.</p></div></div>
    <div className="real-filter-row"><div className="filters">{['전체','카페','음식점','매장'].map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><label className="closed-toggle"><input type="checkbox" checked={showClosed} onChange={e=>setShowClosed(e.target.checked)}/> 마감 참고 공고 포함</label></div>
    <div className="section-label"><span>{visible.length} SOURCE LISTINGS</span><small>원문 출처가 있는 실제 공고 · 순위 아님</small></div>
    {visible.length===0?<div className="empty">이 분류에서 확인된 미마감 공고가 없어. 다른 분류를 보거나 마감 참고 공고를 포함해봐.</div>:<div className="real-listings">{visible.map(job=><article className="panel real-listing" key={job.id}><div className="real-listing-top"><span className="eyebrow">{job.source} / {job.category}</span><span className={`listing-status ${job.status==='closed'?'closed':''}`}>{job.statusLabel}</span></div><h2>{job.name}</h2><p className="muted">{job.role}</p><strong className="source-pay">{job.pay?<>시급 {money(job.pay)}<em>원</em></>:'급여 원문 확인'}</strong><dl><div><dt>일정</dt><dd>{job.schedule}</dd></div><div><dt>위치</dt><dd>{job.address}</dd></div></dl><p className="source-description">{job.note}</p><a className="button secondary" href={job.url} target="_blank" rel="noopener noreferrer">{job.status==='closed'?'마감 공고 원문':'원문에서 조건·모집 여부 확인'}<ExternalLink size={15}/></a><small className="source-date">검색 자료 확인일 {job.checkedAt} · 실시간 채용 연동 아님</small></article>)}</div>}
  </section>;
}

export default function RankingHub(props) {
  const [params]=useSearchParams();
  const requested=params.get('view');
  const view=['personal','types','anam'].includes(requested)?requested:'personal';
  return <><nav className="ranking-tabs" aria-label="랭킹 보기"><Link className={view==='personal'?'active':''} aria-current={view==='personal'?'page':undefined} to="/ranking"><Crown size={17}/> 내 맞춤 랭킹</Link><Link className={view==='types'?'active':''} aria-current={view==='types'?'page':undefined} to="/ranking?view=types"><Swords size={17}/> 모든 유형별 랭킹 <span>8</span></Link><Link className={view==='anam'?'active':''} aria-current={view==='anam'?'page':undefined} to="/ranking?view=anam"><MapPin size={17}/> 안암 실제 공고</Link></nav>{view==='types'?<HunterRankings {...props}/>:view==='anam'?<AnamListings/>:<><div className="my-ranking-title"><span>MY HUNTER CLASS</span><h2>{titleGenerator(props.user)} · 내 맞춤 랭킹</h2><Link to={`/ranking?view=types&type=${hunterTypes.find(t=>t.name===titleGenerator(props.user))?.id||'long'}`}>이 유형의 대표 순위 보기 <ArrowUpRight size={16}/></Link></div><Rankings {...props}/></>}</>;
}
