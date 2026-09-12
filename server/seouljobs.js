import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());


// ======================================================
// API KEY
// ======================================================

const SEOUL_API_KEY =
  process.env.SEOUL_API_KEY;

const KAKAO_API_KEY =
  process.env.KAKAO_REST_API_KEY;

const ODSAY_API_KEY =
  process.env.ODSAY_API_KEY;


// ======================================================
// 기본 설정
// ======================================================

// 서울시에서 가져올 최대 공고 수
const SEOUL_JOB_COUNT = 1000;

// 카카오 API 동시 요청 개수
// 너무 많이 동시에 보내지 않도록 제한
const GEOCODE_CONCURRENCY = 5;

// ODsay Basic 호출량 절약: 가까운 공고 최대 20개만 조회
const ODSAY_JOB_LIMIT = 20;
const ODSAY_CONCURRENCY = 2;


// ======================================================
// 좌표 캐시
//
// 같은 주소를 다시 카카오 API에 요청하지 않도록 저장
// 서버가 실행 중인 동안 유지됨
// ======================================================

const coordinateCache =
  new Map();

const odsayCache =
  new Map();


// ======================================================
// 1. 시급 파싱
// ======================================================

function parseWage(salaryText) {

  if (!salaryText) {

    return {
      minWage: null,
      maxWage: null
    };

  }


  const numbers =
    salaryText.match(/[\d,]+/g);


  if (!numbers) {

    return {
      minWage: null,
      maxWage: null
    };

  }


  const wages =
    numbers.map(number =>

      Number(
        number.replaceAll(",", "")
      )

    );


  return {

    minWage:
      wages[0],

    maxWage:
      wages[1] || wages[0]

  };

}


// ======================================================
// 2. 오전 / 오후 → 24시간
// ======================================================

function convertTime(
  period,
  hour,
  minute
) {

  let h =
    Number(hour);

  const m =
    Number(minute || 0);


  if (
    period === "오후" &&
    h !== 12
  ) {

    h += 12;

  }


  if (
    period === "오전" &&
    h === 12
  ) {

    h = 0;

  }


  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0")
  );

}


// ======================================================
// 3. 근무시간 파싱
// ======================================================

function parseWorkTime(workTimeText) {

  if (!workTimeText) {

    return {
      startTime: null,
      endTime: null
    };

  }


  // --------------------------------------------------
  // 형식 1
  //
  // 오전 9시 ~ 오후 6시
  // (오전) 9시 00분 ~ (오후) 6시 00분
  // --------------------------------------------------

  const koreanTimePattern =
    /\(?\s*(오전|오후)\s*\)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/g;


  const koreanMatches =
    [
      ...workTimeText.matchAll(
        koreanTimePattern
      )
    ];


  if (
    koreanMatches.length >= 2
  ) {

    return {

      startTime:
        convertTime(
          koreanMatches[0][1],
          koreanMatches[0][2],
          koreanMatches[0][3]
        ),

      endTime:
        convertTime(
          koreanMatches[1][1],
          koreanMatches[1][2],
          koreanMatches[1][3]
        )

    };

  }


  // --------------------------------------------------
  // 형식 2
  //
  // 09:00 ~ 18:00
  // --------------------------------------------------

  const normalTimePattern =
    /(\d{1,2}):(\d{2})/g;


  const normalMatches =
    [
      ...workTimeText.matchAll(
        normalTimePattern
      )
    ];


  if (
    normalMatches.length >= 2
  ) {

    return {

      startTime:
        `${String(
          normalMatches[0][1]
        ).padStart(2, "0")}:${normalMatches[0][2]}`,

      endTime:
        `${String(
          normalMatches[1][1]
        ).padStart(2, "0")}:${normalMatches[1][2]}`

    };

  }


  return {
    startTime: null,
    endTime: null
  };

}


// ======================================================
// 4. 근무요일 파싱
// ======================================================

function parseWorkDays(workText) {

  if (!workText) {
    return [];
  }


  const text =
    workText
      .replaceAll(" ", "")
      .replaceAll("요일", "");


  // --------------------------------------------------
  // 평일
  // --------------------------------------------------

  if (
    text.includes("평일") ||
    text.includes("월~금") ||
    text.includes("월-금")
  ) {

    return [
      "월",
      "화",
      "수",
      "목",
      "금"
    ];

  }


  // --------------------------------------------------
  // 주말
  // --------------------------------------------------

  if (
    text.includes("주말") ||
    text.includes("토~일") ||
    text.includes("토-일")
  ) {

    return [
      "토",
      "일"
    ];

  }


  // --------------------------------------------------
  // 월 ~ 토
  // --------------------------------------------------

  if (
    text.includes("월~토") ||
    text.includes("월-토")
  ) {

    return [
      "월",
      "화",
      "수",
      "목",
      "금",
      "토"
    ];

  }


  // --------------------------------------------------
  // 월 ~ 일
  // --------------------------------------------------

  if (
    text.includes("월~일") ||
    text.includes("월-일") ||
    text.includes("매일")
  ) {

    return [
      "월",
      "화",
      "수",
      "목",
      "금",
      "토",
      "일"
    ];

  }


  // --------------------------------------------------
  // 개별 요일
  //
  // 월,수,금
  // 화 목 토
  // --------------------------------------------------

  const allDays = [
    "월",
    "화",
    "수",
    "목",
    "금",
    "토",
    "일"
  ];


  return allDays.filter(
    day =>
      text.includes(day)
  );

}


// ======================================================
// 5. 주소 정리
// ======================================================

function cleanAddress(address) {

  if (!address) {
    return "";
  }


  return address
    .replace(/\s+/g, " ")
    .trim();

}


// ======================================================
// 6. 카카오 주소 → 좌표
// ======================================================

async function getCoordinates(address) {

  const cleanedAddress =
    cleanAddress(address);


  if (!cleanedAddress) {
    return null;
  }


  // --------------------------------------------------
  // 캐시에 이미 있으면 API 호출하지 않음
  // --------------------------------------------------

  if (
    coordinateCache.has(
      cleanedAddress
    )
  ) {

    return coordinateCache.get(
      cleanedAddress
    );

  }


  const url =
    "https://dapi.kakao.com/v2/local/search/address.json" +
    `?query=${encodeURIComponent(cleanedAddress)}`;


  try {

    const response =
      await fetch(
        url,
        {
          headers: {

            Authorization:
              `KakaoAK ${KAKAO_API_KEY}`

          }
        }
      );


    if (!response.ok) {

      console.log(
        "카카오 API 오류:",
        response.status,
        cleanedAddress
      );

      coordinateCache.set(
        cleanedAddress,
        null
      );

      return null;

    }


    const data =
      await response.json();


    if (
      !data.documents ||
      data.documents.length === 0
    ) {

      console.log(
        "주소 검색 실패:",
        cleanedAddress
      );


      coordinateCache.set(
        cleanedAddress,
        null
      );


      return null;

    }


    const result =
      data.documents[0];


    const coordinates = {

      latitude:
        Number(result.y),

      longitude:
        Number(result.x)

    };


    coordinateCache.set(
      cleanedAddress,
      coordinates
    );


    return coordinates;


  } catch (error) {

    console.log(
      "좌표 변환 오류:",
      cleanedAddress,
      error.message
    );


    coordinateCache.set(
      cleanedAddress,
      null
    );


    return null;

  }

}


// ======================================================
// 7. 좌표 사이 직선거리
//
// Haversine
//
// 결과 단위: km
// ======================================================

function calculateDistance(
  lat1,
  lon1,
  lat2,
  lon2
) {

  const EARTH_RADIUS =
    6371;


  const toRadians =
    degree =>
      degree *
      Math.PI /
      180;


  const dLat =
    toRadians(
      lat2 - lat1
    );


  const dLon =
    toRadians(
      lon2 - lon1
    );


  const a =

    Math.sin(
      dLat / 2
    ) ** 2

    +

    Math.cos(
      toRadians(lat1)
    )

    *

    Math.cos(
      toRadians(lat2)
    )

    *

    Math.sin(
      dLon / 2
    ) ** 2;


  const c =

    2 *

    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );


  return (
    EARTH_RADIUS * c
  );

}


// ======================================================
// 8. ODsay 실제 대중교통 이동시간 조회
// ======================================================

async function getPublicTransitRoute(startLocation, endLocation) {
  if (!ODSAY_API_KEY) {
    throw new Error("ODSAY_API_KEY가 .env에 없습니다.");
  }

  const cacheKey = [
    startLocation.longitude.toFixed(6),
    startLocation.latitude.toFixed(6),
    endLocation.longitude.toFixed(6),
    endLocation.latitude.toFixed(6)
  ].join(",");

  if (odsayCache.has(cacheKey)) {
    return odsayCache.get(cacheKey);
  }

  const params = new URLSearchParams({
    SX: String(startLocation.longitude),
    SY: String(startLocation.latitude),
    EX: String(endLocation.longitude),
    EY: String(endLocation.latitude),
    apiKey: ODSAY_API_KEY
  });

  const url =
    "https://api.odsay.com/v1/api/searchPubTransPathT?" +
    params.toString();

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
      console.log("ODsay API 오류:", data.error || response.status);
      odsayCache.set(cacheKey, null);
      return null;
    }

    const paths = data.result?.path;

    if (!Array.isArray(paths) || paths.length === 0) {
      odsayCache.set(cacheKey, null);
      return null;
    }

    const bestPath = [...paths].sort(
      (a, b) =>
        (a.info?.totalTime ?? Infinity) -
        (b.info?.totalTime ?? Infinity)
    )[0];

    const info =
  bestPath.info || {};


// ======================================================
// ODsay 응답 확인
// ======================================================

console.log(
  "ODsay info:",
  info
);


// ======================================================
// 실제 대중교통 정보
// ======================================================

const result = {

  // 편도 실제 이동시간
  commuteMinutes:
    Number(info.totalTime) ||
    null,


  // 편도 실제 교통비
  //
  // ODsay 응답에 따라
  // payment / totalPayment 둘 다 대응
  transportCost:
    Number(info.payment) ||
    Number(info.totalPayment) ||
    0,


  // 총 도보거리 (m)
  walkDistance:
    Number(info.totalWalk) ||
    0,


  // 환승 횟수
  transferCount:
    Math.max(
      0,

      (Number(info.busTransitCount) || 0) +

      (Number(info.subwayTransitCount) || 0) -

      1
    ),


  // 버스 이용 횟수
  busTransitCount:
    Number(info.busTransitCount) ||
    0,


  // 지하철 이용 횟수
  subwayTransitCount:
    Number(info.subwayTransitCount) ||
    0,


  // ODsay가 찾아준 경로 개수
  routeCount:
    paths.length

};


odsayCache.set(
  cacheKey,
  result
);


return result;

  } catch (error) {
    console.log("ODsay 조회 오류:", error.message);
    odsayCache.set(cacheKey, null);
    return null;
  }
}


// ======================================================
// 9. 동시 요청 제한 함수
//
// usableJobs가 많아져도 카카오에
// 한꺼번에 수백 요청을 보내지 않도록 함.
// ======================================================

async function mapWithConcurrency(
  items,
  limit,
  asyncFunction
) {

  const results =
    new Array(items.length);


  let nextIndex = 0;


  async function worker() {

    while (true) {

      const index =
        nextIndex++;


      if (
        index >= items.length
      ) {

        return;

      }


      try {

        results[index] =
          await asyncFunction(
            items[index],
            index
          );

      } catch (error) {

        results[index] =
          null;

      }

    }

  }


  const workerCount =
    Math.min(
      limit,
      items.length
    );


  const workers =
    Array.from(
      {
        length:
          workerCount
      },
      () =>
        worker()
    );


  await Promise.all(
    workers
  );


  return results;

}


// ======================================================
// 9. 서울시 채용공고 가져오기
// ======================================================

async function fetchSeoulJobs() {

  const url =
    `http://openapi.seoul.go.kr:8088/${SEOUL_API_KEY}/json/recMntList/1/${SEOUL_JOB_COUNT}/`;


  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      `서울시 API HTTP 오류: ${response.status}`
    );

  }


  const data =
    await response.json();


  if (
    !data.recMntList?.row
  ) {

    console.log(
      "서울시 API 원본 응답:",
      data
    );


    throw new Error(
      "서울시 채용정보를 가져오지 못했습니다."
    );

  }


  return data.recMntList.row;

}


// ======================================================
// 10. 알바성 공고인지 판별
// ======================================================

function isPartTimeJob(job) {

  const salary =
    job.SAL_TP_NM || "";


  const workTime =
    job.WORKDAY_WORKHR_CONT || "";


  const employment =
    job.EMP_TP_NM || "";


  // 시급 공고
  const isHourly =
    salary.includes("시급");


  // 근무시간 정보 있음
  const hasWorkTime =
    workTime.trim() !== "";


  // 기간제 / 시간제 계열
  const isPartTime =

    employment.includes("시간") ||

    employment.includes("기간") ||

    employment.includes("단시간");


  return (
    isHourly &&
    hasWorkTime &&
    isPartTime
  );

}


// ======================================================
// 11. 서울시 공고 → 추천용 데이터
// ======================================================

function convertJob(job) {

  const wage =
    parseWage(
      job.SAL_TP_NM
    );


  const time =
    parseWorkTime(
      job.WORKDAY_WORKHR_CONT
    );


  const workDays =
    parseWorkDays(
      job.WORKDAY_WORKHR_CONT
    );


  return {

    company:
      job.COMPANY || "",


    title:
      job.TITLE || "",


    minWage:
      wage.minWage,


    maxWage:
      wage.maxWage,


    workDays,


    startTime:
      time.startTime,


    endTime:
      time.endTime,


    address:
      cleanAddress(
        job.WORK_REGION
      ),


    employmentType:
      job.EMP_TP_NM || "",


    originalSalary:
      job.SAL_TP_NM || "",


    originalWorkTime:
      job.WORKDAY_WORKHR_CONT || ""

  };

}


// ======================================================
// 12. 추천 가능한 공고인지 검사
// ======================================================

function isUsableJob(job) {

  const hasWage =
    Number.isFinite(
      job.minWage
    );


  const hasTime =
    job.startTime !== null &&
    job.endTime !== null;


  const hasDays =
    Array.isArray(
      job.workDays
    ) &&
    job.workDays.length > 0;


  const hasAddress =
    Boolean(
      job.address &&
      job.address.trim()
    );


  return (
    hasWage &&
    hasTime &&
    hasDays &&
    hasAddress
  );

}


// ======================================================
// 13. 전체 추천 처리
// ======================================================

async function getJobs(
  address,
  maxDistance
) {

  // --------------------------------------------------
  // 사용자 위치
  // --------------------------------------------------

  const userLocation =
    await getCoordinates(
      address
    );


  if (!userLocation) {

    throw new Error(
      "사용자 주소를 찾을 수 없습니다."
    );

  }


  // --------------------------------------------------
  // 서울시 실제 공고
  // --------------------------------------------------

  const allJobs =
    await fetchSeoulJobs();


  console.log(
    "서울시 전체 공고:",
    allJobs.length
  );


  // --------------------------------------------------
  // 알바성 공고 필터
  // --------------------------------------------------

  const partTimeJobs =
    allJobs.filter(
      isPartTimeJob
    );


  console.log(
    "알바성 공고:",
    partTimeJobs.length
  );


  // --------------------------------------------------
  // 추천 데이터로 변환
  // --------------------------------------------------

  const convertedJobs =
    partTimeJobs.map(
      convertJob
    );


  // --------------------------------------------------
  // 시간 / 요일 / 시급 / 주소
  // 파싱 성공한 것만
  // --------------------------------------------------

  const usableJobs =
    convertedJobs.filter(
      isUsableJob
    );


  console.log(
    "추천 가능 공고:",
    usableJobs.length
  );


  // --------------------------------------------------
  // 같은 주소 공고가 여러 개 있을 수 있으므로
  // 주소 목록 확인
  // --------------------------------------------------

  const uniqueAddresses =
    new Set(
      usableJobs.map(
        job =>
          job.address
      )
    );


  console.log(
    "고유 근무지 주소:",
    uniqueAddresses.size
  );


  // --------------------------------------------------
  // 좌표 + 거리 계산
  // 동시 요청 5개 제한
  // --------------------------------------------------

  const distanceResults =
    await mapWithConcurrency(

      usableJobs,

      GEOCODE_CONCURRENCY,

      async job => {

        const jobLocation =
          await getCoordinates(
            job.address
          );


        if (!jobLocation) {
          return null;
        }


        const distance =
          calculateDistance(

            userLocation.latitude,

            userLocation.longitude,

            jobLocation.latitude,

            jobLocation.longitude

          );


        return {

          ...job,


          latitude:
            jobLocation.latitude,


          longitude:
            jobLocation.longitude,


          distance:
            Number(
              distance.toFixed(2)
            )

        };

      }

    );


  const jobsWithDistance =
    distanceResults.filter(
      Boolean
    );


  console.log(
    "거리 계산 성공:",
    jobsWithDistance.length
  );


  // --------------------------------------------------
  // 사용자가 설정한 거리 이내
  // --------------------------------------------------

  const nearbyJobs =
    jobsWithDistance.filter(
      job =>
        job.distance <=
        maxDistance
    );


  // --------------------------------------------------
  // 가까운 순
  // --------------------------------------------------

  nearbyJobs.sort(
    (a, b) =>
      a.distance -
      b.distance
  );


  console.log(
    `${maxDistance}km 이내 공고:`,
    nearbyJobs.length
  );


  // --------------------------------------------------
  // ODsay 실제 대중교통 조회
  // 가까운 공고 최대 20개만 API 호출
  // --------------------------------------------------

  const odsayTargets =
    nearbyJobs.slice(0, ODSAY_JOB_LIMIT);

  console.log(
    "ODsay 조회 대상:",
    odsayTargets.length
  );

  const jobsWithTransit =
    await mapWithConcurrency(
      odsayTargets,
      ODSAY_CONCURRENCY,
      async job => {
        const route =
          await getPublicTransitRoute(
            userLocation,
            {
              latitude: job.latitude,
              longitude: job.longitude
            }
          );

        if (!route) {
          return {
            ...job,
            commuteMinutes: null,
            transportCost: null,
            walkDistance: null,
            transferCount: null,
            transitAvailable: false
          };
        }

        return {
          ...job,
          ...route,
          transitAvailable: true
        };
      }
    );

  const transitSuccess =
    jobsWithTransit.filter(
      job => job?.transitAvailable
    ).length;

  console.log(
    "ODsay 조회 성공:",
    transitSuccess
  );

  jobsWithTransit.sort((a, b) => {
    if (a.transitAvailable && !b.transitAvailable) return -1;
    if (!a.transitAvailable && b.transitAvailable) return 1;

    if (a.transitAvailable && b.transitAvailable) {
      return a.commuteMinutes - b.commuteMinutes;
    }

    return a.distance - b.distance;
  });


  return {

    stats: {

      total:
        allJobs.length,

      partTime:
        partTimeJobs.length,

      usable:
        usableJobs.length,

      distanceSuccess:
        jobsWithDistance.length,

      nearby:
        nearbyJobs.length,

      odsayRequested:
        odsayTargets.length,

      odsaySuccess:
        transitSuccess

    },

    jobs:
      jobsWithTransit

  };

}


// ======================================================
// 14. 서버 상태 확인
//
// http://localhost:3001/
// ======================================================

app.get(
  "/",

  (req, res) => {

    res.json({

      service:
        "SSS-ALBA API",

      status:
        "online",

      seoulJobCount:
        SEOUL_JOB_COUNT,

      coordinateCache:
        coordinateCache.size,

      odsayCache:
        odsayCache.size,

      odsayJobLimit:
        ODSAY_JOB_LIMIT

    });

  }
);


// ======================================================
// 15. 실제 공고 API
//
// 예:
//
// /api/jobs
// ?address=서울특별시 성북구 안암동
// &maxDistance=10
// ======================================================

app.get(
  "/api/jobs",

  async (req, res) => {

    try {

      const address =
        String(
          req.query.address || ""
        ).trim();


      const maxDistance =
        Number(
          req.query.maxDistance
        );


      // ------------------------------------------------
      // 주소 검사
      // ------------------------------------------------

      if (!address) {

        return res
          .status(400)
          .json({

            error:
              "address가 필요합니다."

          });

      }


      // ------------------------------------------------
      // 거리 검사
      //
      // 현재 프론트 최대 10km 기준
      // ------------------------------------------------

      if (
        !Number.isFinite(
          maxDistance
        ) ||
        maxDistance < 0 ||
        maxDistance > 10
      ) {

        return res
          .status(400)
          .json({

            error:
              "maxDistance는 0~10 사이여야 합니다."

          });

      }


      console.log(
        "\n================================"
      );

      console.log(
        "새로운 추천 요청"
      );

      console.log(
        "주소:",
        address
      );

      console.log(
        "최대 거리:",
        `${maxDistance}km`
      );


      const result =
        await getJobs(
          address,
          maxDistance
        );


      console.log(
        "최종 반환 공고:",
        result.jobs.length
      );

      console.log(
        "좌표 캐시:",
        coordinateCache.size
      );

      console.log(
        "================================\n"
      );


      // ------------------------------------------------
      // React로 반환
      // ------------------------------------------------

      return res.json({

        user: {

          address,

          maxDistance

        },


        stats:
          result.stats,


        count:
          result.jobs.length,


        jobs:
          result.jobs

      });


    } catch (error) {

      console.error(
        "추천 API 오류:",
        error
      );


      return res
        .status(500)
        .json({

          error:
            error.message ||
            "서버 오류가 발생했습니다."

        });

    }

  }
);


// ======================================================
// 16. 서버 실행
// ======================================================

app.listen(
  PORT,

  () => {

    console.log(
      "================================"
    );

    console.log(
      "SSS-ALBA 서버 실행 성공"
    );

    console.log(
      `http://localhost:${PORT}`
    );

    console.log(
      `서울시 최대 공고: ${SEOUL_JOB_COUNT}개`
    );

    console.log(
      `카카오 동시 요청: ${GEOCODE_CONCURRENCY}개`
    );

    console.log(
      `ODsay 최대 조회 공고: ${ODSAY_JOB_LIMIT}개`
    );

    console.log(
      `ODsay 동시 요청: ${ODSAY_CONCURRENCY}개`
    );

    console.log(
      "================================"
    );

  }
);