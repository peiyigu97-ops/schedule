const BASE_URL = 'https://schedule-six-blush.vercel.app';
const TOTAL_WEEKS = 16;
const DAYS = ['周一','周二','周三','周四','周五','周六','周日'];
const PERIODS = [
  {n:'01',t:'08:00',e:'08:45',s:'上午'},
  {n:'02',t:'08:50',e:'09:35',s:''},
  {n:'03',t:'09:40',e:'10:25',s:''},
  {n:'04',t:'10:40',e:'11:25',s:''},
  {n:'05',t:'11:30',e:'12:15',s:''},
  {n:'06',t:'14:00',e:'14:45',s:'下午'},
  {n:'07',t:'14:50',e:'15:35',s:''},
  {n:'08',t:'15:50',e:'16:35',s:''},
  {n:'09',t:'16:40',e:'17:25',s:''},
  {n:'10',t:'17:30',e:'18:15',s:''},
  {n:'11',t:'19:00',e:'19:45',s:'晚上'},
  {n:'12',t:'19:50',e:'20:35',s:''},
  {n:'13',t:'20:40',e:'21:25',s:''},
];
const P_IDX = {};
PERIODS.forEach((p, i) => P_IDX[p.n] = i);
const BREAK_IDX = new Set([0, 5, 10]);

const PALETTE = [
  {bg:'#EEF2FF',border:'#818CF8',color:'#3730A3'},
  {bg:'#ECFDF5',border:'#34D399',color:'#065F46'},
  {bg:'#FFF7ED',border:'#FB923C',color:'#9A3412'},
  {bg:'#FDF4FF',border:'#C084FC',color:'#7E22CE'},
  {bg:'#F0F9FF',border:'#38BDF8',color:'#0C4A6E'},
  {bg:'#FFF1F2',border:'#FB7185',color:'#9F1239'},
  {bg:'#F7FEE7',border:'#86EFAC',color:'#166534'},
  {bg:'#FFFBEB',border:'#FCD34D',color:'#92400E'},
];

function courseColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

Page({
  data: {
    week: 1,
    weekNums: Array.from({length: TOTAL_WEEKS}, (_, i) => i + 1),
    weekDate: '',
    todayBadge: '',
    dayHeaders: [],
    timeCells: [],
    bgCells: [],
    courseBlocks: [],
    allWeekCourses: [],
    scrollHeight: 500,
  },

  onLoad() {
    const { windowHeight } = wx.getSystemInfoSync();
    this.headerHeight = 0;
    this.windowHeight = windowHeight;
    this.fetchWeek('current');
  },

  onHeaderLayout(e) {
    const h = e.detail.height;
    this.setData({ scrollHeight: this.windowHeight - h });
  },

  onWeekTap(e) {
    this.fetchWeek(e.currentTarget.dataset.week);
  },

  fetchWeek(week) {
    const url = week === 'current'
      ? `${BASE_URL}/api/current`
      : `${BASE_URL}/api/week/${week}`;
    wx.showNavigationBarLoading();
    wx.request({
      url,
      success: (res) => this.renderWeek(res.data),
      fail: () => wx.showToast({ title: '加载失败', icon: 'error' }),
      complete: () => wx.hideNavigationBarLoading(),
    });
  },

  renderWeek(data) {
    const { week, week_start, courses } = data;
    const ws = new Date(week_start + 'T00:00:00');
    const we = new Date(ws.getTime() + 6 * 86400000);
    const weekDate = `${ws.getMonth()+1}/${ws.getDate()} – ${we.getMonth()+1}/${we.getDate()}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const isThisWeek = today >= ws && today <= we;
    const DOW = ['日','一','二','三','四','五','六'];
    const todayBadge = `今天 周${DOW[today.getDay()]} ${today.getMonth()+1}/${today.getDate()}`;

    const dayHeaders = DAYS.map((name, di) => {
      const d = new Date(ws.getTime() + di * 86400000);
      return {
        name,
        date: `${d.getMonth()+1}/${d.getDate()}`,
        isToday: isThisWeek && di === todayDow,
        col: di + 2,
      };
    });

    const timeCells = PERIODS.map((p, pi) => ({
      idx: pi + 1,
      t: p.t,
      e: p.e,
      sLabel: p.s,
      isBreak: BREAK_IDX.has(pi) && pi > 0,
      style: `grid-column:1;grid-row:${pi + 2};`,
    }));

    const bgCells = [];
    PERIODS.forEach((_, pi) => {
      DAYS.forEach((_, di) => {
        bgCells.push({
          style: `grid-column:${di + 2};grid-row:${pi + 2};`,
          isToday: isThisWeek && di === todayDow,
          isBreak: BREAK_IDX.has(pi) && pi > 0,
        });
      });
    });

    const gridCourses = courses.filter(c => c.day_num);
    const allWeekCourses = courses.filter(c => !c.day_num);

    const courseBlocks = gridCourses.map(c => {
      const periods = (Array.isArray(c.periods) ? c.periods : c.periods.split(' ')).sort();
      const pi0 = P_IDX[periods[0]];
      const pi1 = P_IDX[periods[periods.length - 1]];
      if (pi0 === undefined || pi1 === undefined) return null;
      const clr = courseColor(c.name);
      const parity = c.parity === 'odd' ? '单' : c.parity === 'even' ? '双' : '';
      return {
        name: c.name,
        classroom: c.classroom || '',
        parity,
        span: pi1 - pi0 + 1,
        style: `grid-column:${c.day_num + 1};grid-row:${pi0 + 2}/${pi1 + 3};background:${clr.bg};border-left-color:${clr.border};color:${clr.color};`,
      };
    }).filter(Boolean);

    this.setData({ week, weekDate, todayBadge, dayHeaders, timeCells, bgCells, courseBlocks, allWeekCourses });
  },
});
