import {
  calculateRealHourlyPay
} from './realHourlyPay.js';


export {
  calculateRealHourlyPay
};


const clamp = n =>
  Math.max(
    0,
    Math.min(100, n)
  );


export const defaultUser = {
  type: 'long',
  workload: 1,
  time: 1,
  pay: 1,
  distance: 1,

  school: '고려대학교',
  area: '성북구 안암동',

  days: [0, 1, 2, 3, 4, 5, 6],

  transport: '버스',

  maxTravel: 30,

  classes: [
    '0-9',
    '0-10',
    '2-9',
    '2-10',
    '4-10'
  ],

  complete: false
};


// ======================================================
// 실제 추천 계산에 사용할 공고
// ======================================================

export function effectiveJob(j, u) {

  let minutes =
    Number(j.commuteMinutes) || 0;


  let transportCost =
    Number(j.transportCost) || 0;


  // --------------------------------------------------
  // 실제 서울시 공고
  //
  // 서버에서 이미
  //
  // 사용자 출발지
  //      ↓
  // ODsay
  //      ↓
  // 실제 이동시간 / 실제 교통비
  //
  // 를 계산했으므로 추가 보정하지 않는다.
  // --------------------------------------------------

  if (j.isReal) {

    return {
      ...j,

      commuteMinutes:
        minutes,

      transportCost:
        transportCost
    };

  }


  // --------------------------------------------------
  // 데모 / 가상 공고
  // 기존 보정 로직 유지
  // --------------------------------------------------

  const near =
    j.school &&
    u.school.trim() === j.school;


  const home =
    j.area !== '재택' &&
    u.area.includes(j.area);


  if (
    j.school &&
    !near &&
    !home
  ) {

    minutes += 20;

  }


  if (
    home &&
    !near
  ) {

    minutes =
      Math.max(
        3,
        minutes - 8
      );

  }


  if (
    u.transport === '자전거'
  ) {

    minutes =
      Math.round(
        minutes * 0.7
      );

    transportCost = 0;

  }


  if (
    u.transport === '도보'
  ) {

    if (minutes > 15) {

      minutes =
        Math.round(
          minutes * 1.8
        );

    }

    transportCost = 0;

  }


  return {
    ...j,

    commuteMinutes:
      minutes,

    transportCost:
      transportCost
  };

}


// ======================================================
// 표시 시급 점수
// ======================================================

export const calculatePayScore = j =>
  clamp(
    j.hourlyPay /
    15000 *
    100
  );


// ======================================================
// 이동시간 점수
//
// commuteMinutes = 편도 실제 이동시간
// ======================================================

export const calculateDistanceScore =
  (j, u) => {

    const maxTravel =
      Math.max(
        5,
        Number(u.maxTravel) || 30
      );


    const penalty =
      [45, 25, 12][u.distance] ??
      25;


    return clamp(
      100 -
      (
        j.commuteMinutes /
        maxTravel
      ) *
      penalty
    );

  };


// ======================================================
// 교통비 점수
//
// transportCost = 편도 교통비
//
// 0원      → 100
// 1,500원  → 70
// 3,000원  → 40
// 5,000원+ → 0
// ======================================================

export const calculateTransportScore =
  j =>
    clamp(
      100 -
      (
        Number(j.transportCost) || 0
      ) / 50
    );


// ======================================================
// 업무강도 점수
// ======================================================

export const calculateWorkloadScore =
  (j, u) =>
    clamp(
      100 -
      (j.workload - 1) *
      [19, 10, 3][u.workload]
    );


// ======================================================
// 시간표 적합도
// ======================================================

export function calculateScheduleScore(
  j,
  u
) {

  let total = 0;
  let free = 0;


  for (const d of j.days) {

    for (
      let h = j.start;
      h < j.start + j.shiftHours;
      h++
    ) {

      total++;


      if (
        u.days.includes(d) &&
        !u.classes.includes(
          `${d}-${h}`
        )
      ) {

        free++;

      }

    }

  }


  // 데이터가 이상해서 근무시간 계산이 안 된 경우
  if (total <= 0) {
    return 0;
  }


  const desired =
    [3, 5, 8][u.time];


  return clamp(

    j.scheduleFit *
    (free / total)

    -

    Math.max(
      0,
      j.shiftHours - desired
    ) *

    [7, 3, 0][u.time]

  );

}


// ======================================================
// 단기 / 장기 유형 적합도
// ======================================================

export const calculateTypeScore =
  (j, u) =>
    j.type === u.type
      ? 100
      : 65;


// ======================================================
// 사용자 선택에 따른 가중치
// ======================================================

export function getUserWeights(u) {

  const w = {

    // 표시 시급
    gold:
      [0.13, 0.22, 0.38][u.pay],

    // 진짜 시급
    real:
      [0.15, 0.22, 0.27][u.pay],

    // 실제 이동시간
    distance:
      [0.40, 0.18, 0.08][u.distance],

    // 시간표
    schedule:
      u.type === 'long'
        ? 0.25
        : 0.18,

    // 교통비
    transport:
      0.09,

    // 업무강도
    workload:
      [0.27, 0.16, 0.06][u.workload],

    // 단기 / 장기
    type:
      0.07

  };


  const sum =
    Object.values(w)
      .reduce(
        (a, b) => a + b,
        0
      );


  return Object.fromEntries(

    Object.entries(w)
      .map(
        ([key, value]) => [
          key,
          value / sum
        ]
      )

  );

}


// ======================================================
// 최종 분석
// ======================================================

export function analyze(
  job,
  u
) {

  const j =
    effectiveJob(
      job,
      u
    );


  const realPay =
    calculateRealHourlyPay(j);


  const stats = {

    // 표시 시급
    gold:
      calculatePayScore(j),


    // 진짜 시급
    real:
      clamp(
        realPay /
        13500 *
        100
      ),


    // 실제 이동시간
    distance:
      calculateDistanceScore(
        j,
        u
      ),


    // 시간표
    schedule:
      calculateScheduleScore(
        j,
        u
      ),


    // 교통비
    transport:
      calculateTransportScore(j),


    // 업무강도
    workload:
      calculateWorkloadScore(
        j,
        u
      ),


    // 단기 / 장기
    type:
      calculateTypeScore(
        j,
        u
      )

  };


  const weights =
    getUserWeights(u);


  const weightedScore =
    Object.entries(stats)
      .reduce(
        (sum, [key, value]) =>
          sum +
          value *
          weights[key],
        0
      );


  const power =
    Math.round(
      weightedScore /
      100 *
      9999
    );


  return {

    ...j,

    stats,

    weights,

    power,

    grade:
      calculateGrade(power),

    realPay,

    fit:
      Math.round(
        stats.schedule
      ),

    lifeDamage:
      Math.round(
        100 -
        (
          stats.schedule +
          stats.workload +
          stats.distance
        ) /
        3
      )

  };

}


// ======================================================
// POWER
// ======================================================

export const calculatePower =
  (j, u) =>
    analyze(j, u).power;


// ======================================================
// 등급
// ======================================================

export function calculateGrade(p) {

  return p >= 9500
    ? 'SSS+'

    : p >= 9200
    ? 'SSS'

    : p >= 8500
    ? 'SS'

    : p >= 7600
    ? 'S'

    : p >= 6500
    ? 'A'

    : p >= 5500
    ? 'B'

    : 'C';

}


// ======================================================
// LIFE DAMAGE
// ======================================================

export const calculateLifeDamage =
  (j, u) =>
    analyze(j, u).lifeDamage;
