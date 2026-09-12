export function titleGenerator(u){
  const max=Math.max(u.time,u.pay,u.distance),min=Math.min(u.time,u.pay,u.distance);
  if(max-min<=10)return '밸런스 마스터';
  if(u.pay===max)return u.type==='short'?'단기 폭딜 골드헌터':'고시급 버서커';
  if(u.distance===max)return '5분컷 장인';
  if(u.time>=70)return u.type==='short'?'치고 빠지는 자':'현생 수호자';
  return u.type==='short'?'공강 암살자':'장기전의 지배자';
}
