const ALL_COURSES = require('../../data/courses.js').courses;

const SEMESTER_START = new Date('2026-03-02T00:00:00');
const TOTAL_WEEKS = 16;
const DAYS = ['周一','周二','周三','周四','周五','周六','周日'];

const P_IDX = {'01':0,'02':1,'03':2,'04':3,'05':4,'06':5,'07':6,'08':7,'09':8,'10':9,'11':10,'12':11,'13':12};

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

const COLOR_CACHE = {};
function courseColor(name) {
  if (COLOR_CACHE[name]) return COLOR_CACHE[name];
  var h = 0;
  for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  COLOR_CACHE[name] = PALETTE[h % PALETTE.length];
  return COLOR_CACHE[name];
}

function currentWeek() {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  if (today < SEMESTER_START) return 1;
  var days = Math.floor((today - SEMESTER_START) / 86400000);
  return Math.min(Math.floor(days / 7) + 1, TOTAL_WEEKS);
}

function weekStartDate(week) {
  return new Date(SEMESTER_START.getTime() + (week - 1) * 7 * 86400000);
}

function courseMatchesWeek(course, week) {
  var weeks = course.weeks;
  if (!weeks || weeks.length === 0) return true;
  var found = false;
  for (var i = 0; i < weeks.length; i++) { if (weeks[i] === week) { found = true; break; } }
  if (!found) return false;
  if (course.parity === 'odd'  && week % 2 === 0) return false;
  if (course.parity === 'even' && week % 2 === 1) return false;
  return true;
}

var WEEK_NUMS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

Page({
  data: {
    week: 1,
    weekNums: WEEK_NUMS,
    weekDate: '',
    todayBadge: '',
    dayHeaders: [],
    courseBlocks: [],
    allWeekCourses: [],
  },

  onLoad: function() {
    this.renderWeek(currentWeek());
  },

  onWeekTap: function(e) {
    this.renderWeek(e.currentTarget.dataset.week);
  },

  renderWeek: function(week) {
    var ws = weekStartDate(week);
    var we = new Date(ws.getTime() + 6 * 86400000);
    var weekDate = (ws.getMonth()+1) + '/' + ws.getDate() + ' – ' + (we.getMonth()+1) + '/' + we.getDate();

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1;
    var isThisWeek = today >= ws && today <= we;
    var DOW = ['日','一','二','三','四','五','六'];
    var todayBadge = '今天 周' + DOW[today.getDay()] + ' ' + (today.getMonth()+1) + '/' + today.getDate();

    var dayHeaders = [];
    for (var di = 0; di < 7; di++) {
      var d = new Date(ws.getTime() + di * 86400000);
      dayHeaders.push({
        name: DAYS[di],
        date: (d.getMonth()+1) + '/' + d.getDate(),
        isToday: isThisWeek && di === todayDow,
        col: di + 2,
      });
    }

    var allWeekCourses = [];
    var courseBlocks = [];
    for (var ci = 0; ci < ALL_COURSES.length; ci++) {
      var c = ALL_COURSES[ci];
      if (!courseMatchesWeek(c, week)) continue;
      if (!c.day_num) {
        allWeekCourses.push({name: c.name, classroom: c.classroom});
        continue;
      }
      var periods = c.periods.slice().sort();
      var pi0 = P_IDX[periods[0]];
      var pi1 = P_IDX[periods[periods.length - 1]];
      if (pi0 === undefined || pi1 === undefined) continue;
      var clr = courseColor(c.name);
      var parity = c.parity === 'odd' ? '单' : c.parity === 'even' ? '双' : '';
      courseBlocks.push({
        name: c.name,
        classroom: c.classroom || '',
        parity: parity,
        style: 'grid-column:' + (c.day_num + 1) + ';grid-row:' + (pi0 + 2) + '/' + (pi1 + 3) + ';background:' + clr.bg + ';border-left-color:' + clr.border + ';color:' + clr.color + ';',
      });
    }

    this.setData({week: week, weekDate: weekDate, todayBadge: todayBadge, dayHeaders: dayHeaders, courseBlocks: courseBlocks, allWeekCourses: allWeekCourses});
  },
});
