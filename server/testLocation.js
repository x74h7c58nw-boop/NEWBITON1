import "dotenv/config";

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;

async function getCoordinates(address) {

  const url =
    "https://dapi.kakao.com/v2/local/search/address.json" +
    `?query=${encodeURIComponent(address)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${KAKAO_KEY}`
    }
  });

  const data = await response.json();

  if (!data.documents || data.documents.length === 0) {
    console.log("주소를 찾지 못했습니다.");
    console.log(data);
    return;
  }

  const result = data.documents[0];

  console.log("주소:", result.address_name);
  console.log("위도:", result.y);
  console.log("경도:", result.x);
}

getCoordinates("서울특별시 성북구 안암동");