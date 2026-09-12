const rows = [
['학교 앞 카페','long','카페',13500,4,6,0,98,3,[1,3],13,'고려대학교','안암동'],
['역 근처 편의점','long','편의점',12000,5,12,1250,90,2,[0,2,4],16,'고려대학교','안암동'],
['도서관 스터디카페','long','카페',11000,4,8,0,88,1,[0,2],17,'고려대학교','안암동'],
['학교 근처 학원 조교','long','학원',15000,3,9,0,95,2,[1,3],17,'고려대학교','안암동'],
['강남 고시급 술집','long','음식점',18000,4,60,4000,55,5,[4,5],18,'','강남구'],
['주말 행사 스태프','short','행사',16000,8,35,3000,82,4,[5,6],10,'','종로구'],
['하루 물류센터','short','물류',17000,8,40,2800,90,5,[0,2,4],9,'','성동구'],
['재택 문서 정리','short','사무',13000,3,0,0,95,1,[1,3],14,'','재택'],
['학교 축제 스태프','short','행사',14500,5,5,0,96,3,[2,3],12,'고려대학교','안암동'],
['쇼핑몰 의류 매장','long','매장',12000,6,25,1500,72,3,[4,5,6],14,'','동대문구']
];
export const days=['월','화','수','목','금','토','일'];
export const jobs=rows.map((r,i)=>{const [name,type,category,hourlyPay,shiftHours,commuteMinutes,transportCost,scheduleFit,workload,days,start,school,area]=r;return {id:String(i+1),name,type,category,hourlyPay,shiftHours,commuteMinutes,transportCost,scheduleFit,workload,days,start,school,area,description:category==='사무'?'집에서 문서 분류와 자료 입력을 도와줘. 기본적인 문서 도구 사용이 가능하면 좋아.':`${name}에서 함께할 동료를 찾고 있어. ${category} 운영 보조와 고객 응대를 담당해.`,caution:workload>=3?'피크타임에는 업무가 몰릴 수 있어.':'반복 업무가 있으니 미리 확인해봐.'};});
