import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LAYOUT, colors } from '../../constants/theme';
import type { AttendanceMonth } from '../../types/appState';
import { createAttendanceCalendar, hasAttendedToday } from '../../utils/attendanceCalendar';
import { screenStyles } from '../layout/screenStyles';

type AttendanceCardProps = {
  readonly attendance: AttendanceMonth;
  readonly isAttending?: boolean;
  readonly onAttend: () => void;
};

export function AttendanceCard({ attendance, isAttending = false, onAttend }: AttendanceCardProps) {
  const calendar = createAttendanceCalendar(attendance);
  const isTodayAttended = hasAttendedToday(attendance);
  const isDisabled = isTodayAttended || isAttending;
  const monthLabel = `${calendar.year}.${String(calendar.month).padStart(2, '0')}`;

  return (
    <View style={screenStyles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>출석하기</Text>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
      </View>

      <View style={styles.grid}>
        {calendar.cells.map((cell) => (
          <View
            key={cell.dateKst}
            style={[
              styles.dayCell,
              cell.isToday ? styles.todayCell : null,
              cell.hasAttended ? styles.completedCell : null,
            ]}
          >
            <Text style={[styles.dayText, cell.hasAttended ? styles.completedText : null]}>
              {cell.hasAttended ? '✓' : cell.dayOfMonth}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="출석하기"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={onAttend}
        style={({ pressed }) => [
          styles.attendButton,
          isDisabled ? styles.attendButtonDisabled : styles.attendButtonEnabled,
          pressed && !isDisabled ? screenStyles.pressed : null,
        ]}
      >
        <Text style={[styles.attendButtonText, isDisabled ? styles.attendButtonTextDisabled : null]}>
          {isTodayAttended ? '오늘 출석 완료' : isAttending ? '출석 중…' : '출석하고 1골드 받기'}
        </Text>
      </Pressable>
      <Text style={styles.description}>KST 기준 하루 한 번, 출석하면 1골드를 받을 수 있어요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: LAYOUT.attendanceGridRowGap,
  },
  dayCell: {
    width: LAYOUT.attendanceDayCellWidthPercent,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  todayCell: {
    backgroundColor: colors.primarySoft,
  },
  completedCell: {
    backgroundColor: colors.accentSoft,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  completedText: {
    color: colors.primaryPressed,
  },
  attendButton: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 18,
  },
  attendButtonEnabled: {
    backgroundColor: colors.primary,
  },
  attendButtonDisabled: {
    backgroundColor: colors.border,
  },
  attendButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textOnPrimary,
  },
  attendButtonTextDisabled: {
    color: colors.textTertiary,
  },
  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
