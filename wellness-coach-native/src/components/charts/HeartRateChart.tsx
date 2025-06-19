import React from 'react';
import { View, StyleSheet, useWindowDimensions, Text as RNText } from 'react-native';
import { Canvas, Path, Line, Text as SkiaText, Skia, PaintStyle, Circle } from '@shopify/react-native-skia';
import { COLORS, SPACING, FONT_SIZES } from '../../theme'; // Assuming theme path

interface HeartRateDataPoint {
  value: number; // BPM
  timestamp: Date; // Date object for time
}

interface HeartRateChartProps {
  data: HeartRateDataPoint[];
  height?: number;
  width?: number;
  noDataText?: string;
}

const HeartRateChart: React.FC<HeartRateChartProps> = ({
  data,
  height = 200,
  width: propWidth,
  noDataText = "No heart rate data available."
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const canvasHeight = height;
  const componentWidth = propWidth || screenWidth - (SPACING.md * 2); // Screen width minus padding
  const paddingHorizontal = SPACING.lg; // Increased padding for time labels
  const paddingVertical = SPACING.md;

  const chartWidth = componentWidth - (paddingHorizontal * 2);
  const chartHeight = canvasHeight - (paddingVertical * 2);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height: canvasHeight, justifyContent: 'center', width: componentWidth }]}>
        <RNText style={styles.noDataText}>{noDataText}</RNText>
      </View>
    );
  }

  // Sort data by timestamp if not already sorted
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const minBpm = Math.min(...sortedData.map(p => p.value), 40); // Assume a baseline min if data is higher
  const maxBpm = Math.max(...sortedData.map(p => p.value), 100); // Assume a baseline max
  const rangeBpm = maxBpm - minBpm === 0 ? 1 : maxBpm - minBpm; // Avoid division by zero

  const firstTimestamp = sortedData[0].timestamp.getTime();
  const lastTimestamp = sortedData[sortedData.length - 1].timestamp.getTime();
  const timeRange = lastTimestamp - firstTimestamp === 0 ? 1 : lastTimestamp - firstTimestamp; // Avoid division by zero

  const dataPoints = sortedData.map(point => ({
    x: sortedData.length === 1 ? chartWidth / 2 : ((point.timestamp.getTime() - firstTimestamp) / timeRange) * chartWidth,
    y: chartHeight - ((point.value - minBpm) / rangeBpm) * chartHeight,
  }));

  const path = Skia.Path.Make();
  if (dataPoints.length > 0) {
    path.moveTo(dataPoints[0].x, dataPoints[0].y);
    for (let i = 1; i < dataPoints.length; i++) {
      path.lineTo(dataPoints[i].x, dataPoints[i].y);
    }
  } else if (dataPoints.length === 1) {
     path.addCircle(dataPoints[0].x, dataPoints[0].y, 2);
  }

  const linePaint = Skia.Paint();
  linePaint.setStrokeWidth(2);
  linePaint.setColor(COLORS.chartLineRed); // Use a red color for heart rate
  linePaint.setStyle(PaintStyle.Stroke);

  const axisPaint = Skia.Paint();
  axisPaint.setStrokeWidth(1);
  axisPaint.setColor(COLORS.chartGrid);

  const circlePaint = Skia.Paint();
  circlePaint.setColor(COLORS.chartLineRed);

  const labelPaint = Skia.Paint();
  labelPaint.setColor(COLORS.textSecondary);
  const FONT_SIZE = FONT_SIZES.caption - 2; // Smaller for chart labels

  return (
    <View style={[styles.container, { width: componentWidth }]}>
      <Canvas style={{ height: canvasHeight, width: componentWidth }}>
        {/* Y-axis */}
        <Line p1={{ x: paddingHorizontal, y: paddingVertical }} p2={{ x: paddingHorizontal, y: chartHeight + paddingVertical }} paint={axisPaint} />
        {/* X-axis */}
        <Line p1={{ x: paddingHorizontal, y: chartHeight + paddingVertical }} p2={{ x: chartWidth + paddingHorizontal, y: chartHeight + paddingVertical }} paint={axisPaint} />

        <Path path={path.transform(Skia.Matrix().translate(paddingHorizontal, paddingVertical))} paint={linePaint} />

        {dataPoints.map((point, index) => (
          <Circle key={index} cx={point.x + paddingHorizontal} cy={point.y + paddingVertical} r={3} paint={circlePaint} />
        ))}

        {/* X-axis Labels (Time) - Simplified: Start and End Time */}
        {sortedData.length > 0 && (
          <>
            <SkiaText
              x={paddingHorizontal}
              y={chartHeight + paddingVertical + FONT_SIZE + SPACING.xs}
              text={sortedData[0].timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              color={labelPaint.getColor()} size={FONT_SIZE}
            />
            {sortedData.length > 1 && (
              <SkiaText
                x={chartWidth + paddingHorizontal - FONT_SIZE * 3} // Adjust for text length
                y={chartHeight + paddingVertical + FONT_SIZE + SPACING.xs}
                text={sortedData[sortedData.length - 1].timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                color={labelPaint.getColor()} size={FONT_SIZE}
              />
            )}
          </>
        )}

        {/* Y-axis Labels (BPM) */}
        <SkiaText x={paddingHorizontal - FONT_SIZE * 2 - SPACING.xs} y={paddingVertical + FONT_SIZE / 2} text={maxBpm.toFixed(0)} color={labelPaint.getColor()} size={FONT_SIZE} textAlign="right"/>
        <SkiaText x={paddingHorizontal - FONT_SIZE * 2 - SPACING.xs} y={chartHeight + paddingVertical} text={minBpm.toFixed(0)} color={labelPaint.getColor()} size={FONT_SIZE} textAlign="right"/>
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

export default HeartRateChart;
