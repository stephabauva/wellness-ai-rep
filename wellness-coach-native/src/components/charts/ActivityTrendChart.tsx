import React from 'react';
import { View, StyleSheet, useWindowDimensions, Text as RNText } from 'react-native';
import { Canvas, Path, Line, Text as SkiaText, Skia, PaintStyle, Circle } from '@shopify/react-native-skia';
import { COLORS, SPACING, FONT_SIZES } from '../../theme';

interface ActivityTrendChartProps {
  data: number[];
  labels: string[];
  height?: number;
  width?: number;
  noDataText?: string;
}

const ActivityTrendChart: React.FC<ActivityTrendChartProps> = ({
  data,
  labels,
  height = 200,
  width: propWidth,
  noDataText = "No activity data available."
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const canvasHeight = height;
  const componentWidth = propWidth || screenWidth - (SPACING.md * 2);
  const paddingHorizontal = SPACING.lg; // Use theme spacing (e.g., 24)
  const paddingVertical = SPACING.lg;   // Use theme spacing

  const chartWidth = componentWidth - (paddingHorizontal * 2);
  const chartHeight = canvasHeight - (paddingVertical * 2);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height: canvasHeight, justifyContent: 'center', width: componentWidth }]}>
        <RNText style={styles.noDataText}>{noDataText}</RNText>
      </View>
    );
  }

  const maxValue = Math.max(...data, 0);
  const dataPoints = data.map((value, index) => ({
    x: data.length === 1 ? chartWidth / 2 : (chartWidth / (data.length - 1)) * index,
    y: chartHeight - (value / (maxValue === 0 ? 1 : maxValue)) * chartHeight,
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
  linePaint.setColor(Skia.Color(COLORS.chartLineBlue)); // Theme color
  linePaint.setStyle(PaintStyle.Stroke);

  const axisPaint = Skia.Paint();
  axisPaint.setStrokeWidth(1);
  axisPaint.setColor(Skia.Color(COLORS.chartGrid)); // Theme color

  const circlePaint = Skia.Paint();
  circlePaint.setColor(Skia.Color(COLORS.chartLineBlue)); // Theme color

  const labelPaint = Skia.Paint();
  labelPaint.setColor(Skia.Color(COLORS.textSecondary)); // Theme color

  const AXIS_LABEL_FONT_SIZE = FONT_SIZES.small; // Theme font size

  return (
    <View style={[styles.container, {width: componentWidth}]}>
      <Canvas style={{ height: canvasHeight, width: componentWidth }}>
        <Line p1={{ x: paddingHorizontal, y: paddingVertical }} p2={{ x: paddingHorizontal, y: chartHeight + paddingVertical }} paint={axisPaint} />
        <Line p1={{ x: paddingHorizontal, y: chartHeight + paddingVertical }} p2={{ x: chartWidth + paddingHorizontal, y: chartHeight + paddingVertical }} paint={axisPaint} />

        <Path path={path.transform(Skia.Matrix().translate(paddingHorizontal, paddingVertical))} paint={linePaint} />

        {dataPoints.map((point, index) => (
          <Circle key={index} cx={point.x + paddingHorizontal} cy={point.y + paddingVertical} r={4} paint={circlePaint} />
        ))}

        {labels.map((label, index) => (
           <SkiaText
            key={`x-label-${index}`}
            x={(data.length === 1 ? chartWidth / 2 : (chartWidth / (labels.length - 1)) * index) + paddingHorizontal - (AXIS_LABEL_FONT_SIZE / 2) }
            y={chartHeight + paddingVertical + AXIS_LABEL_FONT_SIZE + SPACING.xs}
            text={label}
            color={labelPaint.getColor()}
            size={AXIS_LABEL_FONT_SIZE}
          />
        ))}

        <SkiaText
          x={paddingHorizontal - AXIS_LABEL_FONT_SIZE - SPACING.xs} y={paddingVertical + AXIS_LABEL_FONT_SIZE/2}
          text={maxValue.toString()} color={labelPaint.getColor()} size={AXIS_LABEL_FONT_SIZE}
          textAlign="right"
        />
        <SkiaText
          x={paddingHorizontal - AXIS_LABEL_FONT_SIZE - SPACING.xs} y={chartHeight + paddingVertical}
          text="0" color={labelPaint.getColor()} size={AXIS_LABEL_FONT_SIZE}
          textAlign="right"
        />
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

export default ActivityTrendChart;
