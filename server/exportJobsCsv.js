import "dotenv/config";
import fs from "fs";

const SEOUL_API_KEY = process.env.SEOUL_API_KEY;

const JOB_COUNT = 1000;


// ======================================================
// CSV 안전 처리
// ======================================================

function csv(value) {

  if (value === null || value === undefined) {
    return '""';
  }

  const text = String(value)
    .replace(/\r?\n/g, " ")
    .replace(/"/g, '""');

  return `"${text}"`;
}


// ======================================================
// 알바성 공고 판별
// seoulJobs.js와 동일 기준
// ======================================================

function isPartTimeJob(job) {

  const salary =
    job.SAL_TP_NM || "";

  const workTime =
    job.WORKDAY_WORKHR_CONT || "";

  const employment =
    job.EMP_TP_NM || "";

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

async function fetchJobs() {

  const url =
    `http://openapi.seoul.go.kr:8088/${SEOUL_API_KEY}/json/recMntList/1/${JOB_COUNT}/`;

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `서울시 API 오류: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (!data.recMntList?.row) {

    console.log(data);

    throw new Error(
      "채용정보를 가져오지 못했습니다."
    );
  }

  return data.recMntList.row;
}


// ======================================================
// CSV 생성
// ======================================================

async function exportCsv() {

  console.log("서울시 공고 불러오는 중...");

  const allJobs =
    await fetchJobs();

  console.log(
    `전체 공고: ${allJobs.length}개`
  );


  const jobs =
    allJobs.filter(
      isPartTimeJob
    );

  console.log(
    `알바성 공고: ${jobs.length}개`
  );


  // ====================================================
  // CSV 컬럼
  //
  // 원본 API 값을 최대한 그대로 저장
  // ====================================================

  const headers = [

    "회사명",
    "공고제목",

    "근무지역",
    "주소",

    "급여",
    "근무시간",

    "고용형태",

    "직종",
    "업종",

    "경력조건",

    "최소학력",
    "최대학력",

    "등록일",
    "마감일",

    "모집인원",

    "모집내용",

    "전형방법",
    "접수방법",
    "제출서류",

    "담당부서",
    "연락처",

    "원본_근무조건"

  ];


  const rows =
    jobs.map(job => [

      job.COMPANY,

      job.TITLE,

      job.WORK_REGION,

      job.CORP_ADDR,

      job.SAL_TP_NM,

      job.WORKDAY_WORKHR_CONT,

      job.EMP_TP_NM,

      job.JOBS_NM,

      job.IND_TP_CD_NM,

      job.CAREER,

      job.MIN_EDUBG,

      job.MAX_EDUBG,

      job.REG_DT,

      job.CLOSE_DT,

      job.RCRIT_NM,

      job.JOB_CONT,

      job.SEL_MTHD,

      job.RCPT_MTHD,

      job.SUBMIT_DOC,

      job.EMP_CHARGER_DPT,

      job.CONTACT_TELNO,

      job.WORKDAY_WORKHR_CONT

    ]);


  // ====================================================
  // 문자열 생성
  // ====================================================

  const content = [

    headers
      .map(csv)
      .join(","),

    ...rows.map(
      row =>
        row
          .map(csv)
          .join(",")
    )

  ].join("\n");


  // ====================================================
  // Excel 한글 깨짐 방지
  //
  // UTF-8 BOM 추가
  // ====================================================

  const output =
    "\uFEFF" + content;


  const filename =
    "seoul_parttime_jobs.csv";


  fs.writeFileSync(
    filename,
    output,
    "utf8"
  );


  console.log("");
  console.log("==============================");
  console.log("CSV 생성 완료");
  console.log(`파일명: ${filename}`);
  console.log(`공고 수: ${jobs.length}개`);
  console.log("==============================");

}


// ======================================================
// 실행
// ======================================================

exportCsv()
  .catch(error => {

    console.error(
      "CSV 생성 실패:",
      error
    );

    process.exit(1);

  });