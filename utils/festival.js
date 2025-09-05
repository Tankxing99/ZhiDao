// 节日计算与本地兜底
// 支持固定日期与规则型节日（母亲节：5月第二个周日；父亲节：6月第三个周日）
// 其余如中秋/春节等农历节日，依赖后端配置；本地仅做占位映射

function pad(n) { return n < 10 ? '0' + n : '' + n; }

// 计算当年某月第n个周几（0=周日）
function nthWeekdayOfMonth(year, month/*1-12*/, weekday/*0-6*/, n/*1-5*/) {
  const first = new Date(year, month - 1, 1);
  let add = (weekday - first.getDay() + 7) % 7; // 第一个目标周几相对1号偏移
  const day = 1 + add + (n - 1) * 7;
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  // 仅日期部分，假定东八区展示用
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}

// 公历固定节日（仅示例，最终以后端为准）
const FIXED_FESTIVALS = [
  { key: 'womens_day', name: '妇女节', month: 3, day: 8, rec: [{ id: 'carnation', name: '康乃馨', reason: '致敬与关怀', cover: '' }] },
  { key: 'youth_day', name: '青年节', month: 5, day: 4, rec: [{ id: 'pothos', name: '绿萝', reason: '生机勃勃', cover: '' }] },
  { key: 'childrens_day', name: '儿童节', month: 6, day: 1, rec: [{ id: 'boston_fern', name: '波士顿蕨', reason: '安全友好', cover: '' }] },
  { key: 'valentine', name: '情人节', month: 2, day: 14, rec: [{ id: 'rose', name: '玫瑰', reason: '表达爱意', cover: '' }] },
  { key: 'dragon_boat', name: '端午节', month: 6, day: 10, rec: [{ id: 'lucky_bamboo', name: '富贵竹', reason: '节日寓意', cover: '' }] },
  // 中秋/春节为农历，前端不计算，留空由后端提供
];

function getMothersDay(year) {
  return nthWeekdayOfMonth(year, 5, 0, 2); // 5月第二个周日
}
function getFathersDay(year) {
  return nthWeekdayOfMonth(year, 6, 0, 3); // 6月第三个周日
}

function asFestivalObj(key, name, date, rec){
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  return {
    id: `${key}_${date.getFullYear()}`,
    festivalKey: key,
    name,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    recommendations: rec || [],
  };
}

function getActiveFestivalLocal(now){
  const y = now.getFullYear();
  // 母亲节
  const md = getMothersDay(y);
  if (sameDay(now, md)) return asFestivalObj('mothers_day', '母亲节', md, [{ id: 'carnation', name: '康乃馨', reason: '感恩母爱', cover: '' }]);
  // 父亲节
  const fd = getFathersDay(y);
  if (sameDay(now, fd)) return asFestivalObj('fathers_day', '父亲节', fd, [{ id: 'spathiphyllum', name: '白鹤芋', reason: '坚韧与守护', cover: '' }]);
  // 固定节日
  for(const f of FIXED_FESTIVALS){
    const d = new Date(y, f.month - 1, f.day);
    if (sameDay(now, d)) return asFestivalObj(f.key, f.name, d, f.rec);
  }
  // 农历类暂不在前端处理
  return null;
}

function sameDay(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function getNextFestivalLocal(now){
  const y = now.getFullYear();
  const cands = [];
  // 规则型
  cands.push(getMothersDay(y));
  cands.push(getFathersDay(y));
  // 固定型
  FIXED_FESTIVALS.forEach(f=>cands.push(new Date(y, f.month-1, f.day)));
  // 去过去的日期，排序后取最近
  const future = cands.filter(d=>d.getTime() >= startOfDay(now).getTime()).sort((a,b)=>a-b);
  if (future.length>0){
    const d = future[0];
    const map = {
      [toISODate(getMothersDay(y))]: ['mothers_day','母亲节', [{ id: 'carnation', name: '康乃馨', reason: '感恩母爱', cover: '' }]],
      [toISODate(getFathersDay(y))]: ['fathers_day','父亲节', [{ id: 'spathiphyllum', name: '白鹤芋', reason: '坚韧与守护', cover: '' }]],
    };
    // 固定节日回填
    FIXED_FESTIVALS.forEach(f=>{
      map[toISODate(new Date(y, f.month-1, f.day))] = [f.key, f.name, f.rec];
    });
    const [key,name,rec] = map[toISODate(d)] || ['unknown','即将到来节日', []];
    return asFestivalObj(key, name, d, rec);
  }
  return null;
}

function startOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0); }

function toDateRangeText(startISO, endISO){
  // 简化展示：YYYY-MM-DD
  const s = new Date(startISO);
  const e = new Date(endISO);
  return `${s.getFullYear()}-${pad(s.getMonth()+1)}-${pad(s.getDate())}`;
}

// 构造全年节日列表（本地兜底）
function listAllFestivalsLocal(year){
  const list = [];
  // 规则型节日
  const md = getMothersDay(year);
  list.push(asFestivalObj('mothers_day', '母亲节', md, [{ id: 'carnation', name: '康乃馨', reason: '感恩母爱', cover: '' }]));
  const fd = getFathersDay(year);
  list.push(asFestivalObj('fathers_day', '父亲节', fd, [{ id: 'spathiphyllum', name: '白鹤芋', reason: '坚韧与守护', cover: '' }]));
  // 固定型节日
  FIXED_FESTIVALS.forEach(f => {
    const d = new Date(year, f.month - 1, f.day);
    list.push(asFestivalObj(f.key, f.name, d, f.rec));
  });
  // 按开始日期排序
  return list.sort((a,b)=> new Date(a.startDate) - new Date(b.startDate));
}


// 映射：节日key -> 本地图片文件名（中文拼音命名）
const FESTIVAL_IMAGE_FILENAME_MAP = {
  mothers_day: 'muqinjie.jpg',
  fathers_day: 'fuqinjie.jpg',
  womens_day: 'funvjie.jpg',
  youth_day: 'qingnianjie.jpg',
  childrens_day: 'ertongjie.jpg',
  valentine: 'qingrenjie.jpg',
  dragon_boat: 'duanwujie.jpg',
  teachers_day: 'jiaoshijie.jpg', // 预留
};

// 名称到key的兜底映射（避免后端缺少 festivalKey 时无法匹配）
const FESTIVAL_NAME_TO_KEY = {
  '母亲节': 'mothers_day',
  '父亲节': 'fathers_day',
  '妇女节': 'womens_day',
  '青年节': 'youth_day',
  '儿童节': 'childrens_day',
  '情人节': 'valentine',
  '端午节': 'dragon_boat',
  '教师节': 'teachers_day',
};

// 根据 festivalKey 或 name 返回本地图片路径（images/festivals/*）
function getFestivalImagePath(f){
  if (!f) return '';
  const key = (f.festivalKey || '').trim() || FESTIVAL_NAME_TO_KEY[(f.name || '').trim()] || '';
  const filename = FESTIVAL_IMAGE_FILENAME_MAP[key];
  return filename ? `/images/festivals/${filename}` : '';
}

module.exports = {
  getActiveFestivalLocal,
  getNextFestivalLocal,
  toDateRangeText,
  listAllFestivalsLocal,
  getFestivalImagePath,
};

