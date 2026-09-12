import React, {
  useState,
  useMemo,
  useEffect
} from 'react';

import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';

import {
  HunterLogo,
  BottomNav,
  ReasonModal
} from './components/UI.jsx';

import Onboarding, {
  Landing
} from './pages/Onboarding.jsx';

import {
  Home,
  JobDetail,
  MyPage
} from './pages/Board.jsx';

import RankingHub from './pages/RankingHub.jsx';
import Battle from './pages/Battle.jsx';

import {
  analyze,
  defaultUser
} from './utils/scoring.js';


// ======================================================
// LOCAL STORAGE
// ======================================================

function read(key, fallback) {

  try {

    const value =
      JSON.parse(
        localStorage.getItem(key)
      );

    return value ?? fallback;

  } catch {

    return fallback;

  }

}


function useStored(key, initial) {

  const [value, setValue] =
    useState(
      () => read(key, initial)
    );


  const [error, setError] =
    useState(false);


  function update(next) {

    setValue(old => {

      const value =
        typeof next === 'function'
          ? next(old)
          : next;


      try {

        localStorage.setItem(
          key,
          JSON.stringify(value)
        );

        setError(false);

      } catch {

        setError(true);

      }


      return value;

    });

  }


  return [
    value,
    update,
    error
  ];

}


// ======================================================
// 시간 문자열 → 숫자
//
// 13:30 → 13.5
// ======================================================

function timeToNumber(time) {

  if (!time) {
    return 0;
  }


  const [hour, minute] =
    time
      .split(':')
      .map(Number);


  return (
    hour +
    minute / 60
  );

}


// ======================================================
// 요일 변환
//
// ["월", "수", "금"]
//
// ↓
//
// [0, 2, 4]
// ======================================================

const DAY_MAP = {

  월: 0,
  화: 1,
  수: 2,
  목: 3,
  금: 4,
  토: 5,
  일: 6

};


function convertDays(workDays = []) {

  return workDays
    .map(
      day =>
        DAY_MAP[day]
    )
    .filter(
      day =>
        day !== undefined
    );

}


// ======================================================
// 카테고리 추정
// ======================================================

function detectCategory(title = '') {

  const text =
    title.toLowerCase();


  if (
    text.includes('카페') ||
    text.includes('커피') ||
    text.includes('바리스타')
  ) {
    return '카페';
  }


  if (
    text.includes('편의점')
  ) {
    return '편의점';
  }


  if (
    text.includes('학원') ||
    text.includes('강사') ||
    text.includes('교육') ||
    text.includes('조교')
  ) {
    return '학원';
  }


  if (
    text.includes('음식') ||
    text.includes('식당') ||
    text.includes('주방') ||
    text.includes('조리') ||
    text.includes('서빙')
  ) {
    return '음식점';
  }


  if (
    text.includes('행사') ||
    text.includes('이벤트') ||
    text.includes('스태프')
  ) {
    return '행사';
  }


  if (
    text.includes('물류') ||
    text.includes('포장') ||
    text.includes('배송') ||
    text.includes('창고')
  ) {
    return '물류';
  }


  if (
    text.includes('사무') ||
    text.includes('문서') ||
    text.includes('행정') ||
    text.includes('데이터')
  ) {
    return '사무';
  }


  if (
    text.includes('매장') ||
    text.includes('판매') ||
    text.includes('마트')
  ) {
    return '매장';
  }


  return '기타';

}


// ======================================================
// 직선거리 → 예상 편도 이동시간
//
// ★ 아직 실제 길찾기 API가 아님.
//
// 도보:
// 직선거리 보정 × 약 4.5km/h
//
// 자전거:
// 직선거리 보정 × 약 13km/h
//
// 버스:
// 정류장 이동 + 대기 + 도로 우회 등을 간단히 반영
// ======================================================

function estimateCommuteMinutes(
  distance,
  transport
) {

  const km =
    Number(distance);


  if (
    !Number.isFinite(km) ||
    km < 0
  ) {
    return 9999;
  }


  // ------------------------------------------
  // 도보
  // ------------------------------------------

  if (transport === '도보') {

    const actualDistance =
      km * 1.25;

    return Math.max(
      1,
      Math.round(
        actualDistance /
        4.5 *
        60
      )
    );

  }


  // ------------------------------------------
  // 자전거
  // ------------------------------------------

  if (transport === '자전거') {

    const actualDistance =
      km * 1.2;


    return Math.max(
      1,
      Math.round(
        actualDistance /
        13 *
        60
      )
    );

  }


  // ------------------------------------------
  // 버스
  //
  // 단거리에서도 정류장 이동/대기시간이 있으므로
  // 기본 8분 + 이동시간
  // ------------------------------------------

  const actualDistance =
    km * 1.35;


  const movingMinutes =
    actualDistance /
    18 *
    60;


  return Math.max(
    5,
    Math.round(
      8 +
      movingMinutes
    )
  );

}


// ======================================================
// 업무강도 추정
// ======================================================

function estimateWorkload(category) {

  switch (category) {

    case '물류':
      return 5;

    case '음식점':
      return 4;

    case '행사':
      return 4;

    case '편의점':
      return 3;

    case '매장':
      return 3;

    case '카페':
      return 3;

    case '학원':
      return 2;

    case '사무':
      return 1;

    default:
      return 2;

  }

}


// ======================================================
// 단기 / 장기 추정
// ======================================================

function detectJobType(
  employmentType = ''
) {

  const text =
    employmentType;


  // 기간의 정함이 없는 경우
  if (
    text.includes(
      '기간의 정함이 없는'
    )
  ) {
    return 'long';
  }


  // 기간제 / 단시간
  if (
    text.includes('기간') ||
    text.includes('단시간') ||
    text.includes('시간제')
  ) {
    return 'short';
  }


  return 'long';

}


// ======================================================
// 서울시 실제 공고
//
// ↓
//
// 기존 SSS ALBA 공고 구조
// ======================================================

function convertRealJob(
  job,
  index,
  user
) {

  const start =
    timeToNumber(
      job.startTime
    );


  const end =
    timeToNumber(
      job.endTime
    );


  let shiftHours =
    end - start;


  // 22:00 ~ 02:00 같은 야간근무
  if (shiftHours < 0) {

    shiftHours += 24;

  }


  // 이상한 시간 데이터 방어
  if (
    !Number.isFinite(shiftHours) ||
    shiftHours <= 0
  ) {

    shiftHours = 1;

  }


  const category =
    detectCategory(
      `${job.title || ''} ${job.company || ''}`
    );


  const commuteMinutes =
  Number.isFinite(Number(job.commuteMinutes))
    ? Number(job.commuteMinutes)
    : estimateCommuteMinutes(
        job.distance,
        user.transport
      );

  const workload =
    estimateWorkload(
      category
    );


  const type =
    detectJobType(
      job.employmentType
    );


  return {

    // ------------------------------------------
    // ID
    // ------------------------------------------

    id:
      `real-${index + 1}`,


    // ------------------------------------------
    // 기본 정보
    // ------------------------------------------

    name:
      job.title ||
      '채용 공고',


    company:
      job.company ||
      '',


    type,


    category,


    // ------------------------------------------
    // 급여
    // ------------------------------------------

    hourlyPay:
      Number(
        job.minWage
      ) || 0,


    minWage:
      job.minWage,


    maxWage:
      job.maxWage,


    // ------------------------------------------
    // 근무시간
    // ------------------------------------------

    shiftHours,


    start,


    startTime:
      job.startTime,


    endTime:
      job.endTime,


    days:
      convertDays(
        job.workDays
      ),


    // ------------------------------------------
    // 이동
    // ------------------------------------------

    distance:
      Number(
        job.distance
      ) || 0,


    commuteMinutes,


    transportCost:
  Number.isFinite(Number(job.transportCost))
    ? Number(job.transportCost)
    : 0,


    // ------------------------------------------
    // 점수 계산용
    // ------------------------------------------

    scheduleFit:
      100,


    workload,


    // ------------------------------------------
    // 지역
    // ------------------------------------------

    school:
      '',


    area:
      job.address ||
      '',


    address:
      job.address ||
      '',


    // ------------------------------------------
    // 원본 정보
    // ------------------------------------------

    employmentType:
      job.employmentType ||
      '',


    originalSalary:
      job.originalSalary ||
      '',


    originalWorkTime:
      job.originalWorkTime ||
      '',


    // ------------------------------------------
    // 실제 공고 표시
    // ------------------------------------------

    isReal:
      true,


    description:
      `${job.company || '기업'}에서 등록한 실제 채용 공고입니다.`,


    caution:
      workload >= 4
        ? '업무 강도가 높을 가능성이 있어 근무조건을 확인해봐.'
        : '실제 근무조건은 지원 전 공고 내용을 다시 확인해봐.'

  };

}


// ======================================================
// APP
// ======================================================

export default function App() {

  // ====================================================
  // USER
  // ====================================================

  const [
    stored,
    setUser,
    e1
  ] =
    useStored(
      'sss-user-v1',
      defaultUser
    );


  const [
    saved,
    setSaved,
    e2
  ] =
    useStored(
      'sss-saved-v1',
      []
    );


  const [
    battles,
    setBattles,
    e3
  ] =
    useStored(
      'sss-battles-v1',
      0
    );


  const user = {

    ...defaultUser,
    ...stored

  };


  // ====================================================
  // 실제 공고 상태
  // ====================================================

  const [
    rawJobs,
    setRawJobs
  ] =
    useState([]);


  const [
    jobsLoading,
    setJobsLoading
  ] =
    useState(false);


  const [
    jobsError,
    setJobsError
  ] =
    useState(null);


  const [
    serverStats,
    setServerStats
  ] =
    useState(null);


  // ====================================================
  // 서울시 실제 공고 요청
  // ====================================================

  useEffect(() => {

    if (!user.complete) {
      return;
    }


    let cancelled =
      false;


    async function loadJobs() {

      try {

        setJobsLoading(true);

        setJobsError(null);


        // ------------------------------------------
        // 사용자 주소
        // ------------------------------------------

        const address =
          user.area.includes('서울')
            ? user.area
            : `서울특별시 ${user.area}`;


        // ------------------------------------------
        // 서버에서는 우선 넓게 10km까지 가져옴.
        //
        // 그 후 프론트에서 사용자 maxTravel을
        // 이용해 이동시간 기준으로 다시 필터링.
        // ------------------------------------------

        const searchDistance =
          10;


        const url =
          `http://localhost:3001/api/jobs` +
          `?address=${encodeURIComponent(address)}` +
          `&maxDistance=${searchDistance}`;


        console.log(
          '=============================='
        );

        console.log(
          '실제 공고 요청'
        );

        console.log(
          '주소:',
          address
        );

        console.log(
          '교통수단:',
          user.transport
        );

        console.log(
          '최대 이동시간:',
          user.maxTravel + '분'
        );


        const response =
          await fetch(url);


        if (!response.ok) {

          let message =
            `서버 오류 ${response.status}`;


          try {

            const errorData =
              await response.json();


            if (errorData.error) {

              message =
                errorData.error;

            }

          } catch {
            // JSON 오류 무시
          }


          throw new Error(
            message
          );

        }


        const data =
          await response.json();


        if (cancelled) {
          return;
        }


        console.log(
          '서버 통계:',
          data.stats
        );


        console.log(
          '서버 공고:',
          data.jobs?.length || 0
        );


        setServerStats(
          data.stats || null
        );


        // ------------------------------------------
        // SSS ALBA 구조로 변환
        // ------------------------------------------

        const converted =
          (data.jobs || [])
            .map(
              (job, index) =>
                convertRealJob(
                  job,
                  index,
                  user
                )
            );


        // ------------------------------------------
        // 사용자 최대 이동시간 필터
        //
        // 예:
        //
        // maxTravel = 30
        //
        // → 예상 편도 이동시간 30분 이하만
        // ------------------------------------------

        const withinTravelTime =
          converted.filter(
            job =>
              job.commuteMinutes <=
              user.maxTravel
          );


        console.log(
          '이동시간 필터 전:',
          converted.length
        );


        console.log(
          '이동시간 필터 후:',
          withinTravelTime.length
        );


        console.log(
          '=============================='
        );


        setRawJobs(
          withinTravelTime
        );


      } catch (error) {

        if (cancelled) {
          return;
        }


        console.error(
          '실제 공고 로딩 실패:',
          error
        );


        setJobsError(
          error.message
        );


        setRawJobs([]);

      } finally {

        if (!cancelled) {

          setJobsLoading(false);

        }

      }

    }


    loadJobs();


    return () => {

      cancelled = true;

    };


  }, [
    user.complete,
    user.area,
    user.transport,
    user.maxTravel
  ]);


  // ====================================================
  // 기존 SSS 점수 알고리즘
  // ====================================================

  const jobs =
    useMemo(
      () =>

        rawJobs

          .map(
            job =>
              analyze(
                job,
                user
              )
          )

          .sort(
            (a, b) =>
              b.power -
              a.power
          ),

      [
        rawJobs,
        JSON.stringify(user)
      ]
    );


  // ====================================================
  // BATTLE
  // ====================================================

  const [
    pair,
    setPair
  ] =
    useState([]);


  const [
    reason,
    setReason
  ] =
    useState(null);


  const navigate =
    useNavigate();


  const location =
    useLocation();


  function onBattle(
    id,
    other
  ) {

    const fallback =
      jobs.find(
        job =>
          job.id !== id
      );


    const secondId =
      other ||
      fallback?.id;


    // 비교할 두 번째 공고가 없는 경우
    if (!secondId) {
      return;
    }


    setPair([
      id,
      secondId
    ]);


    navigate(
      '/battle'
    );

  }


  // ====================================================
  // SAVE
  // ====================================================

  function onSave(id) {

    setSaved(prev =>

      prev.includes(id)

        ? prev.filter(
            savedId =>
              savedId !== id
          )

        : [
            ...prev,
            id
          ]

    );

  }


  // ====================================================
  // 공통 PROPS
  // ====================================================

  const props = {

    jobs,

    user,

    saved,

    onSave,

    onBattle,

    onReason:
      setReason,

    jobsLoading,

    jobsError,

    serverStats

  };


  // ====================================================
  // INTRO 화면 여부
  // ====================================================

  const intro =

    location.pathname === '/' ||

    location.pathname.includes(
      'onboarding'
    ) ||

    location.pathname === '/setup';


  // ====================================================
  // RENDER
  // ====================================================

  return (
    <>

      {/* =================================================
          HEADER
      ================================================= */}

      <header>

        <HunterLogo />


        {!intro && (
          <BottomNav />
        )}


        <span className="header-status">

          <i />

          SYSTEM ONLINE

          <small>
            REAL JOB API
          </small>

        </span>

      </header>


      {/* =================================================
          STORAGE WARNING
      ================================================= */}

      {(e1 || e2 || e3) && (

        <div
          role="status"
          className="storage-warning"
        >

          브라우저 저장 공간을 사용할 수 없어.
          현재 탭에서는 계속 사용할 수 있지만
          새로고침하면 변경이 사라질 수 있어.

        </div>

      )}


      {/* =================================================
          ROUTES
      ================================================= */}

      <main
        key={location.pathname}
        className={
          intro
            ? 'intro-main'
            : 'app-main'
        }
      >

        <Routes>

          {/* ---------------------------------------------
              LANDING
          --------------------------------------------- */}

          <Route
            path="/"
            element={
              user.complete

                ? (
                  <Navigate
                    to="/home"
                    replace
                  />
                )

                : (
                  <Landing />
                )
            }
          />


          {/* ---------------------------------------------
              ONBOARDING
          --------------------------------------------- */}

          <Route
            path="/onboarding/type"
            element={
              <Onboarding
                step={0}
                user={user}
                setUser={setUser}
              />
            }
          />


          <Route
            path="/onboarding/preferences"
            element={
              <Onboarding
                step={1}
                user={user}
                setUser={setUser}
              />
            }
          />


          <Route
            path="/onboarding/title"
            element={
              <Onboarding
                step={2}
                user={user}
                setUser={setUser}
              />
            }
          />


          <Route
            path="/setup"
            element={
              <Onboarding
                step={3}
                user={user}
                setUser={setUser}
              />
            }
          />


          {/* ---------------------------------------------
              HOME
          --------------------------------------------- */}

          <Route
            path="/home"
            element={
              <Home
                {...props}
              />
            }
          />


          {/* ---------------------------------------------
              RANKING
          --------------------------------------------- */}

          <Route
            path="/ranking"
            element={
              <RankingHub
                {...props}
              />
            }
          />


          {/* ---------------------------------------------
              JOB DETAIL
          --------------------------------------------- */}

          <Route
            path="/job/:id"
            element={
              <JobDetail
                {...props}
              />
            }
          />


          {/* ---------------------------------------------
              BATTLE
          --------------------------------------------- */}

          <Route
            path="/battle"
            element={
              <Battle
                jobs={jobs}
                pair={pair}
                setPair={setPair}
                onComplete={
                  () =>
                    setBattles(
                      count =>
                        count + 1
                    )
                }
              />
            }
          />


          {/* ---------------------------------------------
              MY PAGE
          --------------------------------------------- */}

          <Route
            path="/my"
            element={
              <MyPage
                {...props}
                battles={battles}
              />
            }
          />


          {/* ---------------------------------------------
              UNKNOWN
          --------------------------------------------- */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </main>


      {/* =================================================
          FOOTER
      ================================================= */}

      <footer>

        <span>
          SSS ALBA © 2026
        </span>

        <span>
          YOUR TIME. YOUR GOLD. YOUR QUEST.
        </span>

        <span>
          실제 서울시 채용정보 기반 추천
        </span>

      </footer>


      {/* =================================================
          REASON MODAL
      ================================================= */}

      {reason && (

        <ReasonModal
          job={reason}
          onClose={
            () =>
              setReason(null)
          }
        />

      )}

    </>
  );

}
