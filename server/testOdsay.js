import "dotenv/config";

const ODSAY_API_KEY = process.env.ODSAY_API_KEY;

// 테스트 좌표
// 출발: 고려대학교 안암캠퍼스 근처
// 도착: 서울역 근처
const start = {
  x: 127.0324,
  y: 37.5894
};

const end = {
  x: 126.9707,
  y: 37.5547
};

async function testOdsay() {
  try {
    if (!ODSAY_API_KEY) {
      throw new Error("ODSAY_API_KEY가 .env에 없습니다.");
    }

    const params = new URLSearchParams({
      SX: String(start.x),
      SY: String(start.y),
      EX: String(end.x),
      EY: String(end.y),
      apiKey: ODSAY_API_KEY
    });

    const url =
      `https://api.odsay.com/v1/api/searchPubTransPathT?${params}`;

    console.log("==============================");
    console.log("ODsay 대중교통 테스트");
    console.log("출발: 고려대학교 근처");
    console.log("도착: 서울역 근처");
    console.log("==============================");

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("ODsay API 오류:");
      console.dir(data, { depth: null });
      return;
    }

    const paths = data?.result?.path;

    if (!paths || paths.length === 0) {
      console.log("대중교통 경로가 없습니다.");
      return;
    }

    const best = [...paths].sort(
      (a, b) => a.info.totalTime - b.info.totalTime
    )[0];

    console.log("");
    console.log("===== 최적 경로 =====");
    console.log(`총 소요시간: ${best.info.totalTime}분`);
    console.log(`총 요금: ${best.info.payment}원`);
    console.log(`도보거리: ${best.info.totalWalk}m`);
    console.log(`환승횟수: ${best.info.busTransitCount + best.info.subwayTransitCount - 1}`);
    console.log("");
    console.log(`검색된 경로 수: ${paths.length}개`);

  } catch (error) {
    console.error("테스트 실패:", error);
  }
}

testOdsay();