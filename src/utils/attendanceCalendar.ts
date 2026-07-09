import type { AttendanceCalendar, AttendanceMonth } from '../types/appState';

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatKstDateString(year: number, month: number, dayOfMonth: number): string {
  const monthText = String(month).padStart(2, '0');
  const dayText = String(dayOfMonth).padStart(2, '0');
  return `${year}-${monthText}-${dayText}`;
}

export function createAttendanceCalendar(attendance: AttendanceMonth): AttendanceCalendar {
  const daysInMonth = getDaysInMonth(attendance.year, attendance.month);
  const attendedSet = new Set(attendance.attendedDatesKst);

  const cells = Array.from({ length: daysInMonth }, (_unused, dayIndex) => {
    const dayOfMonth = dayIndex + 1;
    const dateKst = formatKstDateString(attendance.year, attendance.month, dayOfMonth);

    return {
      dateKst,
      dayOfMonth,
      isToday: dateKst === attendance.todayKst,
      hasAttended: attendedSet.has(dateKst),
    };
  });

  return {
    year: attendance.year,
    month: attendance.month,
    cells,
  };
}

export function hasAttendedToday(attendance: AttendanceMonth): boolean {
  return attendance.attendedDatesKst.includes(attendance.todayKst);
}
