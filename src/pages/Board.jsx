import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Swords,
  ShieldAlert,
  Bookmark,
  Zap
} from 'lucide-react';

import {
  QuestCard,
  RankBadge,
  CombatPower,
  StatPanel,
  money
} from '../components/UI.jsx';

import { titleGenerator } from '../utils/titleGenerator.js';
import { jobTitleGenerator } from '../utils/jobTitleGenerator.js';
import { days } from '../data/jobs.js';
import { options } from './Onboarding.jsx';


// ======================================================
// HOME
// ======================================================

export function Home({
  user,
  jobs,
  jobsLoading,
  jobsError,
  ...props
}) {

  // ====================================================
  // 실제 공고 로딩 중
  // ====================================================

  if (jobsLoading) {
    return (
      <div className="panel">
        <span className="eyebrow">
          REAL JOB DATA
        </span>

        <h1>
          실제 알바 공고를
          <br />
          불러오는 중<span className="dot">.</span>
        </h1>

        <p className="muted">
          서울시 채용정보와 위치를 분석하고 있어.
        </p>
      </div>
    );
  }


  // ====================================================
  // 서버/API 오류
  // ====================================================

  if (jobsError) {
    return (
      <div className="panel">

        <span className="eyebrow">
          SYSTEM ERROR
        </span>

        <h1>
          공고를 불러오지 못했어.
        </h1>

        <p className="muted">
          {jobsError}
        </p>

        <p className="muted">
          Node 서버가 실행 중인지 확인해줘.
        </p>

      </div>
    );
  }


  // ====================================================
  // 공고 없음
  // ====================================================

  if (!jobs || jobs.length === 0) {
    return (
      <div className="panel">

        <span className="eyebrow">
          NO QUEST FOUND
        </span>

        <h1>
          조건에 맞는 알바가 없어.
        </h1>

        <p className="muted">
          지역이나 이동 조건을 조금 넓혀봐.
        </p>

        <Link
          className="button"
          to="/setup"
        >
          조건 다시 설정
        </Link>

      </div>
    );
  }


  // ====================================================
  // 1위 공고
  // ====================================================

  const top = jobs[0];


  // ====================================================
  // 위험 공고
  //
  // 예전에는 id === "5"인 가짜 공고를 사용했지만
  // 이제 실제 공고이므로 LIFE DAMAGE가 가장 높은
  // 공고를 자동 선택
  // ====================================================

  const trap =
    [...jobs]
      .filter(job => job.id !== top.id)
      .sort(
        (a, b) =>
          b.lifeDamage - a.lifeDamage
      )[0] || null;


  return (
    <>

      {/* =================================================
          PAGE HEADING
      ================================================= */}

      <div className="page-heading">

        <div>

          <span className="eyebrow">
            HUNTER BOARD / PERSONALIZED FOR YOU
          </span>

          <h1>
            오늘도 SSS 하나
            <br />
            찾아볼까
            <span className="dot">?</span>
          </h1>

          <p className="muted">
            좋은 알바 말고,{' '}
            <span className="white">
              나한테 SSS급인 알바.
            </span>
          </p>

        </div>


        <div className="hunter-chip">

          <Zap />

          <div>

            <small>
              AWAKENED HUNTER
            </small>

            <b>
              {titleGenerator(user)}
            </b>

            <span>
              {user.school} · {user.transport}
            </span>

          </div>

          <Link to="/my">
            ↗
          </Link>

        </div>

      </div>


      {/* =================================================
          DISCOVER
      ================================================= */}

      <div className="discover-rankings">

        <Link to="/ranking?view=types">

          <Swords size={21} />

          <span>

            <b>
              다른 헌터는 어떤 알바가 1위일까?
            </b>

            <small>
              유형별 전체 순위 보기
            </small>

          </span>

          <ArrowRight size={18} />

        </Link>


        <Link to="/ranking?view=anam">

          <Bookmark size={21} />

          <span>

            <b>
              실제 공고 탐색
            </b>

            <small>
              서울시 실제 채용정보 기반
            </small>

          </span>

          <ArrowRight size={18} />

        </Link>

      </div>


      {/* =================================================
          MAIN BOARD
      ================================================= */}

      <div className="board-layout">

        <section>

          <div className="section-label">

            <span>
              <i /> TODAY'S BEST QUEST
            </span>

            <small>
              나의 전투력 기준 #1
            </small>

          </div>


          <QuestCard
            job={top}
            featured
            {...props}
            saved={
              props.saved.includes(top.id)
            }
          />

        </section>


        <aside>

          {/* =============================================
              SYSTEM STATUS
          ============================================= */}

          <div className="panel system-panel">

            <span className="eyebrow">
              SYSTEM STATUS
            </span>

            <h2>
              너의 일상에
              <br />
              맞춰진 퀘스트.
            </h2>


            <div className="system-count">

              <strong>
                {jobs.length}
              </strong>

              <span>
                QUESTS
                <br />
                ANALYZED
              </span>

            </div>


            <div className="status-line">

              <span>
                시간표 동기화
              </span>

              <b>
                COMPLETE
              </b>

            </div>


            <div className="status-line">

              <span>
                실제 위치 반영
              </span>

              <b>
                ACTIVE
              </b>

            </div>


            <Link to="/setup">

              시간표 업데이트

              <ArrowRight size={15} />

            </Link>

          </div>


          {/* =============================================
              DANGER QUEST
          ============================================= */}

          {trap && (

            <div className="danger-panel">

              <span className="eyebrow">

                <ShieldAlert size={14} />

                DANGER QUEST

              </span>


              <h3>
                시급만 보면 속을 뻔했다.
              </h3>


              <p>
                {trap.name}
              </p>


              <div className="trap-pay">

                <del>
                  {money(trap.hourlyPay)}원
                </del>

                <ArrowRight size={15} />

                <b>
                  {money(trap.realPay)}원
                </b>

              </div>


              <small>
                이동시간과 근무조건까지 계산하면
                결과가 달라질 수 있어.
              </small>


              <button
                onClick={() =>
                  props.onBattle(
                    top.id,
                    trap.id
                  )
                }
              >

                최고 퀘스트와 비교

                <Swords size={16} />

              </button>

            </div>

          )}

        </aside>

      </div>


      {/* =================================================
          NEXT QUESTS
      ================================================= */}

      <div className="section-label spaced">

        <span>
          YOUR NEXT QUESTS
        </span>

        <Link to="/ranking">

          전체 랭킹

          <ArrowRight size={15} />

        </Link>

      </div>


      <div className="quest-grid">

        {jobs
          .slice(1, 4)
          .map(
            (job, index) => (

              <QuestCard
                key={job.id}
                job={job}
                index={index + 1}
                {...props}
                saved={
                  props.saved.includes(job.id)
                }
              />

            )
          )}

      </div>

    </>
  );
}


// ======================================================
// RANKINGS
// ======================================================

export function Rankings({
  jobs,
  ...props
}) {

  const [filter, setFilter] =
    useState('전체');


  const visible =
    jobs.filter(
      job =>
        filter === '전체' ||
        job.category === filter
    );


  return (
    <>

      <span className="eyebrow">
        PERSONAL QUEST LEADERBOARD
      </span>


      <h1>
        HUNTER BOARD
        <span className="dot">.</span>
      </h1>


      <p className="muted">
        나에게 맞는 퀘스트 랭킹 · 같은 퀘스트도
        헌터마다 등급은 다르다.
      </p>


      <div className="filters">

        {[
          '전체',
          '카페',
          '편의점',
          '학원',
          '사무',
          '행사',
          '매장',
          '음식점',
          '물류',
          '기타'
        ].map(category => (

          <button
            key={category}
            className={
              filter === category
                ? 'selected'
                : ''
            }
            onClick={() =>
              setFilter(category)
            }
          >
            {category}
          </button>

        ))}

      </div>


      <div className="section-label">

        <span>
          {visible.length} QUESTS FOUND
        </span>

        <small>
          POWER 높은 순
        </small>

      </div>


      <div className="quest-grid ranking-grid">

        {visible.map(
          (job, index) => (

            <QuestCard
              key={job.id}
              job={job}
              index={index}
              featured={index === 0}
              {...props}
              saved={
                props.saved.includes(job.id)
              }
            />

          )
        )}

      </div>

    </>
  );
}


// ======================================================
// JOB DETAIL
// ======================================================

export function JobDetail({
  jobs,
  onBattle,
  onReason,
  onSave,
  saved
}) {

  const { id } =
    useParams();


  const job =
    jobs.find(
      job =>
        job.id === id
    );


  // 실제 API가 아직 로딩 중이거나
  // 해당 공고가 없는 경우
  if (!job) {

    return (

      <div className="panel">

        <h1>
          퀘스트를 찾을 수 없어.
        </h1>

        <Link to="/ranking">
          랭킹으로 돌아가기
        </Link>

      </div>

    );

  }


  return (
    <>

      <Link
        className="back"
        to="/ranking"
      >
        ← 퀘스트 랭킹
      </Link>


      {/* =================================================
          DETAIL HEADING
      ================================================= */}

      <div className="detail-heading">

        <div>

          <span className="eyebrow">
            QUEST #{job.id} / {job.category}
          </span>

          <h1>
            {job.name}
          </h1>

          <p className="muted">
            {jobTitleGenerator(job)}
          </p>

        </div>


        <RankBadge
          grade={job.grade}
          large
        />

      </div>


      {/* =================================================
          DETAIL GRID
      ================================================= */}

      <div className="detail-grid">

        {/* ===============================================
            QUEST ANALYSIS
        =============================================== */}

        <div className="panel">

          <CombatPower
            power={job.power}
          />


          <h3>
            QUEST ANALYSIS
          </h3>


          <StatPanel
            job={job}
          />


          <div className="damage">

            LIFE DAMAGE

            <b>
              {job.lifeDamage}
            </b>

            <span>
              낮을수록 일상 부담이 적어
            </span>

          </div>


          <div className="buff">

            + 시간표 적합 {job.fit}%
            · {job.commuteMinutes}분 이동

            <br />

            + {
              job.transportCost === 0
                ? '교통비 0원'
                : `왕복 교통비 ${money(job.transportCost)}원 반영`
            }

          </div>


          <div className="debuff">

            − {job.caution}

            {job.days.some(
              day => day > 4
            ) && (
              <>
                <br />
                − 주말 근무 포함
              </>
            )}

          </div>


          <button
            className="secondary"
            onClick={() =>
              onReason(job)
            }
          >
            왜 {job.grade}야?
          </button>

        </div>


        {/* ===============================================
            REAL REWARD
        =============================================== */}

        <div className="panel">

          <span className="eyebrow">
            REAL REWARD ANALYSIS
          </span>


          <h2>
            진짜 시급은 얼마일까?
          </h2>


          <div className="pay-analysis">

            <span>

              표시 시급

              <b>
                {money(job.hourlyPay)}원
              </b>

            </span>


            <span>

              근무 수익 · {job.shiftHours}시간

              <b>
                {money(
                  job.hourlyPay *
                  job.shiftHours
                )}원
              </b>

            </span>


            <span>

              왕복 교통비

              <b>
                −{money(job.transportCost)}원
              </b>

            </span>


            <span>

              왕복 이동시간

              <b>
                +{job.commuteMinutes * 2}분
              </b>

            </span>


            <span>

              총 사용시간

              <b>
                {(
                  job.shiftHours +
                  job.commuteMinutes * 2 / 60
                ).toFixed(1)}시간
              </b>

            </span>

          </div>


          <div className="real-total">

            <small>
              REAL REWARD / HOUR
            </small>

            <strong>
              {money(job.realPay)}
              <em>원</em>
            </strong>

          </div>


          <p className="muted">
            (근무 수익 − 왕복 교통비)
            ÷ (근무시간 + 왕복 이동시간)
          </p>


          <h3>
            퀘스트 정보
          </h3>


          <p>
            {job.description}
          </p>


          {/* 실제 API 정보 */}

          {job.company && (

            <p className="muted">
              회사 · {job.company}
            </p>

          )}


          {job.address && (

            <p className="muted">
              근무지 · {job.address}
            </p>

          )}


          <p className="muted">

            {
              job.type === 'short'
                ? '단기'
                : '장기'
            }

            {' · '}

            {job.days
              .map(day => days[day])
              .join(' / ')}

            <br />

            {
              job.startTime
                ? `${job.startTime} ~ ${job.endTime}`
                : `${job.start}:00 ~ ${job.start + job.shiftHours}:00`
            }

            {' · '}

            업무강도 {job.workload}/5

          </p>


          {job.distance !== undefined && (

            <p className="muted">
              직선거리 · {job.distance}km
            </p>

          )}


          <div className="card-actions">

            <button
              className="button primary"
              onClick={() =>
                onBattle(job.id)
              }
            >

              <Swords size={17} />

              배틀에 추가

            </button>


            <button
              className="secondary"
              onClick={() =>
                onSave(job.id)
              }
            >

              <Bookmark size={16} />

              {
                saved.includes(job.id)
                  ? '찜 해제'
                  : '찜하기'
              }

            </button>

          </div>

        </div>

      </div>

    </>
  );
}


// ======================================================
// MY PAGE
// ======================================================

export function MyPage({
  user,
  jobs,
  saved,
  battles,
  ...props
}) {

  return (
    <>

      <span className="eyebrow">
        HUNTER PROFILE
      </span>


      <h1>
        나의 헌터 기록
        <span className="dot">.</span>
      </h1>


      <div className="panel profile-panel">

        <Zap size={46} />


        <h2>
          {titleGenerator(user)}
        </h2>


        <p className="muted">
          {user.school} · {user.area}
        </p>


        <div className="profile-stats">

          {[
            [
              '발견한 SSS',
              jobs.filter(
                job =>
                  job.grade &&
                  job.grade.startsWith('SSS')
              ).length
            ],

            [
              '배틀',
              battles
            ],

            [
              '찜',
              saved.length
            ]

          ].map(
            ([label, number]) => (

              <div key={label}>

                <strong>
                  {number}
                </strong>

                <span>
                  {label}
                </span>

              </div>

            )
          )}

        </div>


        <div className="profile-details">

          <span>

            알바 유형

            <b>
              {
                user.type === 'short'
                  ? '단기'
                  : '장기'
              }
            </b>

          </span>


          {Object.entries(options)
            .map(
              ([key, values], index) => (

                <span key={key}>

                  {
                    [
                      '업무강도',
                      '업무시간',
                      '시급',
                      '거리'
                    ][index]
                  }

                  <b>
                    {values[user[key]]}
                  </b>

                </span>

              )
            )}

        </div>


        <div className="card-actions">

          <Link
            className="button"
            to="/onboarding/type"
          >
            헌터 타입 다시 설정
          </Link>


          <Link
            className="secondary button"
            to="/setup"
          >
            시간표 / 지역 수정
          </Link>

        </div>

      </div>


      <h2>
        저장한 퀘스트
      </h2>


      {!saved.length
        ? (

          <div className="empty">

            아직 저장한 퀘스트가 없어.
            마음에 드는 카드의 하트를 눌러봐.

            <Link to="/ranking">
              퀘스트 둘러보기 →
            </Link>

          </div>

        )
        : (

          <div className="quest-grid">

            {jobs
              .filter(
                job =>
                  saved.includes(job.id)
              )
              .map(
                job => (

                  <QuestCard
                    job={job}
                    key={job.id}
                    {...props}
                    saved
                    onSave={props.onSave}
                  />

                )
              )}

          </div>

        )}

    </>
  );
}