import "dotenv/config";

// ======================================================
// API KEY
// ======================================================

const SEOUL_API_KEY = process.env.SEOUL_API_KEY;
const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const ODSAY_API_KEY = process.env.ODSAY_API_KEY;


// ======================================================
// 설정
// ======================================================

// 사용자 출발지
const USER_ADDRESS = "서울특별시 성북구 안암동";

// 서울시에서 일단 1000개 조회
const JOB_COUNT = 1000;

// 너무 먼 공고를 ODsay에 넣지 않기 위한 직선거리 제한
const MAX_DISTANCE_KM = 10;


// ======================================================
// 알바성 공고 판별
// ======================================================

function isPartTimeJob(job) {

  const salary = job.SAL_TP_NM || "";
  const workTime = job.WORKDAY_WORKHR_CONT || "";
  const employment = job.EMP_TP_NM || "";

  const isHourly =
    salary.includes("시급");

  const hasWorkTime =
    workTime.trim() !== "";

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
// 서울시 API
// ======================================================

async function fetchSeoulJobs() {

  const url =
    `http://openapi.seoul.go.kr:8088/${SEOUL_API_KEY}` +
    `/json/recMntList/1/${JOB_COUNT}/`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `서울시 API 오류: ${response.status}`
    );
  }

  const data = await response.json();

  const jobs = data?.recMntList?.row;

  if (!Array.isArray(jobs)) {

    console.dir(data, {
      depth: null
    });

    throw new Error(
      "서울시 공고 데이터를 가져오지 못했습니다."
    );
  }

  return jobs;
}


// ======================================================
// 카카오 주소 → 좌표
// ======================================================

async function getCoordinates(address) {

  if (!address) {
    return null;
  }

  const url =
    "https://dapi.kakao.com/v2/local/search/address.json" +
    `?query=${encodeURIComponent(address)}`;

  const response = await fetch(url, {

    headers: {
      Authorization:
        `KakaoAK ${KAKAO_API_KEY}`
    }

  });

  if (!response.ok) {

    throw new Error(
      `카카오 API 오류: ${response.status}`
    );

  }

  const data =
    await response.json();

  if (
    !data.documents ||
    data.documents.length === 0
  ) {
    return null;
  }

  const result =
    data.documents[0];

  return {

    latitude:
      Number(result.y),

    longitude:
      Number(result.x)

  };
}


// ======================================================
// 두 좌표 직선거리
// ======================================================

function calculateDistance(
  lat1,
  lon1,
  lat2,
  lon2
) {

  const R = 6371;

  const toRad =
    degree =>
      degree * Math.PI / 180;

  const dLat =
    toRad(lat2 - lat1);

  const dLon =
    toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +

    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *

    Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}


// ======================================================
// ODsay
// ======================================================

async function getTransitRoute(
  start,
  end
) {

  const params =
    new URLSearchParams({

      SX:
        String(start.longitude),

      SY:
        String(start.latitude),

      EX:
        String(end.longitude),

      EY:
        String(end.latitude),

      apiKey:
        ODSAY_API_KEY

    });


  const url =
    "https://api.odsay.com/v1/api/searchPubTransPathT?" +
    params.toString();


  const response =
    await fetch(url);


  const data =
    await response.json();


  if (
    !response.ok ||
    data.error
  ) {

    console.log(
      "ODsay 원본 응답:"
    );

    console.dir(
      data,
      {
        depth: null
      }
    );

    return null;
  }


  const paths =
    data?.result?.path;


  if (
    !Array.isArray(paths) ||
    paths.length === 0
  ) {
    return null;
  }


  // 가장 빠른 경로
  const best =
    [...paths].sort(
      (a, b) =>
        a.info.totalTime -
        b.info.totalTime
    )[0];


  const info =
    best.info;


  const transitCount =
    Math.max(
      0,

      (info.busTransitCount || 0) +

      (info.subwayTransitCount || 0) -

      1
    );


  return {

    totalTime:
      info.totalTime,

    payment:
      info.payment,

    totalWalk:
      info.totalWalk,

    transitCount,

    pathCount:
      paths.length

  };
}


// ======================================================
// 실행
// ======================================================

async function main() {

  try {

    // --------------------------------------------------
    // KEY 검사
    // --------------------------------------------------

    if (!SEOUL_API_KEY) {
      throw new Error(
        ".env에 SEOUL_API_KEY가 없습니다."
      );
    }

    if (!KAKAO_API_KEY) {
      throw new Error(
        ".env에 KAKAO_REST_API_KEY가 없습니다."
      );
    }

    if (!ODSAY_API_KEY) {
      throw new Error(
        ".env에 ODSAY_API_KEY가 없습니다."
      );
    }


    console.log(
      "========================================"
    );

    console.log(
      "서울시 실제 알바 1개 + ODsay 테스트"
    );

    console.log(
      "========================================"
    );


    // --------------------------------------------------
    // 1. 사용자 좌표
    // --------------------------------------------------

    console.log(
      "\n[1/5] 사용자 주소 좌표 변환"
    );

    console.log(
      "출발지:",
      USER_ADDRESS
    );


    const userLocation =
      await getCoordinates(
        USER_ADDRESS
      );


    if (!userLocation) {
      throw new Error(
        "사용자 주소 좌표 변환 실패"
      );
    }


    console.log(
      "출발 좌표:",
      userLocation
    );


    // --------------------------------------------------
    // 2. 서울시 공고
    // --------------------------------------------------

    console.log(
      "\n[2/5] 서울시 공고 조회"
    );


    const allJobs =
      await fetchSeoulJobs();


    console.log(
      `전체 공고: ${allJobs.length}개`
    );


    const partTimeJobs =
      allJobs.filter(
        isPartTimeJob
      );


    console.log(
      `알바성 공고: ${partTimeJobs.length}개`
    );


    // --------------------------------------------------
    // 3. 실제 공고 중 좌표 변환 가능한 것 탐색
    // --------------------------------------------------

    console.log(
      "\n[3/5] 실제 근무지 탐색"
    );


    let selectedJob = null;
    let selectedLocation = null;
    let selectedDistance = null;


    for (const job of partTimeJobs) {

      const address =
        job.CORP_ADDR ||
        job.WORK_REGION;


      if (!address) {
        continue;
      }


      try {

        const location =
          await getCoordinates(
            address
          );


        if (!location) {
          continue;
        }


        const distance =
          calculateDistance(

            userLocation.latitude,
            userLocation.longitude,

            location.latitude,
            location.longitude

          );


        // 10km 안에 있는 첫 실제 공고 선택
        if (
          distance <=
          MAX_DISTANCE_KM
        ) {

          selectedJob =
            job;

          selectedLocation =
            location;

          selectedDistance =
            distance;

          break;

        }

      } catch {

        continue;

      }

    }


    if (!selectedJob) {

      throw new Error(
        `${MAX_DISTANCE_KM}km 이내에서 테스트 가능한 공고를 찾지 못했습니다.`
      );

    }


    // --------------------------------------------------
    // 실제 공고 출력
    // --------------------------------------------------

    const jobAddress =
      selectedJob.CORP_ADDR ||
      selectedJob.WORK_REGION;


    console.log(
      "\n선택된 실제 공고"
    );

    console.log(
      "회사:",
      selectedJob.COMPANY
    );

    console.log(
      "제목:",
      selectedJob.TITLE
    );

    console.log(
      "주소:",
      jobAddress
    );

    console.log(
      "급여:",
      selectedJob.SAL_TP_NM
    );

    console.log(
      "근무시간:",
      selectedJob.WORKDAY_WORKHR_CONT
    );

    console.log(
      "고용형태:",
      selectedJob.EMP_TP_NM
    );


    // --------------------------------------------------
    // 4. 거리
    // --------------------------------------------------

    console.log(
      "\n[4/5] 거리 계산"
    );


    console.log(
      `직선거리: ${selectedDistance.toFixed(2)}km`
    );


    console.log(
      "근무지 좌표:",
      selectedLocation
    );


    // --------------------------------------------------
    // 5. ODsay
    // --------------------------------------------------

    console.log(
      "\n[5/5] ODsay 실제 대중교통 조회"
    );


    const transit =
      await getTransitRoute(

        userLocation,
        selectedLocation

      );


    if (!transit) {

      throw new Error(
        "ODsay에서 대중교통 경로를 찾지 못했습니다."
      );

    }


    // --------------------------------------------------
    // 최종 결과
    // --------------------------------------------------

    console.log(
      "\n========================================"
    );

    console.log(
      "실제 공고 이동시간 조회 성공"
    );

    console.log(
      "========================================"
    );


    console.log(
      "회사:",
      selectedJob.COMPANY
    );

    console.log(
      "공고:",
      selectedJob.TITLE
    );

    console.log(
      "주소:",
      jobAddress
    );

    console.log(
      ""
    );

    console.log(
      "직선거리:",
      `${selectedDistance.toFixed(2)}km`
    );

    console.log(
      "대중교통 이동시간:",
      `${transit.totalTime}분`
    );

    console.log(
      "요금:",
      `${transit.payment}원`
    );

    console.log(
      "도보거리:",
      `${transit.totalWalk}m`
    );

    console.log(
      "환승횟수:",
      `${transit.transitCount}회`
    );

    console.log(
      "검색된 경로:",
      `${transit.pathCount}개`
    );


    console.log(
      "========================================"
    );

  }

  catch (error) {

    console.error(
      "\n테스트 실패:"
    );

    console.error(
      error.message
    );

  }

}


main();