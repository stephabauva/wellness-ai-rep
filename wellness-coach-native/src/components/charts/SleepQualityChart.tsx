import React from 'react';
import { View, StyleSheet, useWindowDimensions, Text as RNText } from 'react-native';
import { Canvas, Rect, Text as SkiaText, Skia, PaintStyle } from '@shopify/react-native-skia';
import { COLORS, SPACING, FONT_SIZES } from '../../theme';

export interface SleepDataSegment {
  type: 'AWAKE' | 'ASLEEP' | 'INBED' | 'REM' | 'LIGHT' | 'DEEP' | string; // Allow custom types
  startDate: Date;
  endDate: Date;
  value?: string; // Original value from source if needed
}

interface SleepQualityChartProps {
  data: SleepDataSegment[];
  height?: number;
  width?: number;
  noDataText?: string;
  // Optional: a date for which the sleep is shown, for labeling purposes
  displayDate?: Date;
}

const STAGE_COLORS: Record<string, string> = {
  AWAKE: COLORS.warning,
  ASLEEP: COLORS.primary, // General 'asleep'
  INBED: COLORS.lightGray,
  REM: COLORS.secondary,   // Example: Purple for REM
  LIGHT: COLORS.chartLineBlue, // Example: Blue for Light
  DEEP: COLORS.deepSleep,      // Using theme color
  UNKNOWN: COLORS.mediumGray,
};

const SleepQualityChart: React.FC<SleepQualityChartProps> = ({
  data,
  height = 150, // Reduced height for potentially simpler bar chart
  width: propWidth,
  noDataText = "No sleep data available.",
  displayDate
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const canvasHeight = height;
  const componentWidth = propWidth || screenWidth - (SPACING.md * 2);
  const paddingHorizontal = SPACING.md;
  const paddingVertical = SPACING.lg; // More padding for time labels at bottom

  const chartWidth = componentWidth - (paddingHorizontal * 2);
  const chartHeight = canvasHeight - (paddingVertical * 2); // Actual drawing height for bars

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height: canvasHeight, justifyContent: 'center', width: componentWidth }]}>
        <RNText style={styles.noDataText}>{noDataText}</RNText>
      </View>
    );
  }

  const sortedData = [...data].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const firstTimestamp = sortedData[0].startDate.getTime();
  const lastTimestampOverall = Math.max(...sortedData.map(s => s.endDate.getTime()));
  const totalTimeRange = lastTimestampOverall - firstTimestamp === 0 ? 1 : lastTimestampOverall - firstTimestamp;

  const barHeight = chartHeight * 0.6; // Height of each sleep stage bar
  const barY = paddingVertical + (chartHeight * 0.2); // Y position of the bar

  const labelPaint = Skia.Paint();
  labelPaint.setColor(COLORS.textSecondary);
  const FONT_SIZE = FONT_SIZES.caption - 2;

  return (
    <View style={[styles.container, { width: componentWidth }]}>
      <Canvas style={{ height: canvasHeight, width: componentWidth }}>
        {/* X-axis line (Timeline) */}
        <Line
          p1={{ x: paddingHorizontal, y: barY + barHeight + SPACING.xs }}
          p2={{ x: paddingHorizontal + chartWidth, y: barY + barHeight + SPACING.xs }}
          color={COLORS.chartGrid} strokeWidth={1}
        />

        {/* Sleep Segments */}
        {sortedData.map((segment, index) => {
          const xStart = ((segment.startDate.getTime() - firstTimestamp) / totalTimeRange) * chartWidth;
          const xEnd = ((segment.endDate.getTime() - firstTimestamp) / totalTimeRange) * chartWidth;
          const segmentWidth = Math.max(1, xEnd - xStart); // Ensure minimum width of 1 for visibility

          const paint = Skia.Paint();
          paint.setColor(Skia.Color(STAGE_COLORS[segment.type.toUpperCase()] || STAGE_COLORS.UNKNOWN));
          paint.setStyle(PaintStyle.Fill);

          return (
            <Rect
              key={index}
              x={paddingHorizontal + xStart}
              y={barY}
              width={segmentWidth}
              height={barHeight}
              paint={paint}
            />
          );
        })}

        {/* X-axis Labels (Time) - Start and End of overall period */}
        {sortedData.length > 0 && (
          <>
            <SkiaText
              x={paddingHorizontal}
              y={barY + barHeight + SPACING.sm + FONT_SIZE}
              text={new Date(firstTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              color={labelPaint.getColor()} size={FONT_SIZE}
            />
            <SkiaText
              x={paddingHorizontal + chartWidth - (FONT_SIZE*3)} // Adjust for text length
              y={barY + barHeight + SPACING.sm + FONT_SIZE}
              text={new Date(lastTimestampOverall).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              color={labelPaint.getColor()} size={FONT_SIZE}
            />
             {displayDate && (
                 <SkiaText
                    x={paddingHorizontal + chartWidth / 2 - (FONT_SIZE*2.5)} // Centered date
                    y={paddingVertical / 2 + FONT_SIZE / 2} // Top area
                    text={displayDate.toLocaleDateString([], {month: 'short', day: 'numeric'})}
                    color={labelPaint.getColor()} size={FONT_SIZE+2}
                 />
             )}
          </>
        )}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  }
});

export default SleepQualityChart;
