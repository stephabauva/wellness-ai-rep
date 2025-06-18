import React from 'react';
import { View, StyleSheet, useWindowDimensions, Text as RNText } from 'react-native'; // Added RNText for "No data"
import { Canvas, Path, Line, Text as SkiaText, Skia, PaintStyle, Circle } from '@shopify/react-native-skia';

interface ActivityTrendChartProps {
  data: number[];
  labels: string[];
  height?: number;
  width?: number; // Optional width, otherwise derived from screen
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
  // Chart dimensions
  const canvasHeight = height;
  // Allow prop overriding for width, else calculate based on screen width and padding
  const componentWidth = propWidth || screenWidth - 32; // 16 padding on each side from parent container
  const paddingHorizontal = 20; // Padding inside the canvas for labels
  const paddingVertical = 20;   // Padding inside the canvas for labels

  const chartWidth = componentWidth - (paddingHorizontal * 2);
  const chartHeight = canvasHeight - (paddingVertical * 2);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height: canvasHeight, justifyContent: 'center' }]}>
        <RNText style={styles.noDataText}>{noDataText}</RNText>
      </View>
    );
  }

  const maxValue = Math.max(...data, 0);
  const dataPoints = data.map((value, index) => ({
    x: data.length === 1 ? chartWidth / 2 : (chartWidth / (data.length - 1)) * index, // Center if single point
    y: chartHeight - (value / (maxValue === 0 ? 1 : maxValue)) * chartHeight,
  }));

  const path = Skia.Path.Make();
  if (dataPoints.length > 0) {
    path.moveTo(dataPoints[0].x, dataPoints[0].y);
    for (let i = 1; i < dataPoints.length; i++) {
      path.lineTo(dataPoints[i].x, dataPoints[i].y);
    }
  } else if (dataPoints.length === 1) { // Draw just a point if only one data item
     path.addCircle(dataPoints[0].x, dataPoints[0].y, 2);
  }


  const linePaint = Skia.Paint();
  linePaint.setStrokeWidth(2);
  linePaint.setColor(Skia.Color('rgba(75, 101, 178, 1)')); // A nice blue
  linePaint.setStyle(PaintStyle.Stroke);

  const axisPaint = Skia.Paint();
  axisPaint.setStrokeWidth(1);
  axisPaint.setColor(Skia.Color('rgba(200, 200, 200, 1)')); // Light grey

  const circlePaint = Skia.Paint();
  circlePaint.setColor(Skia.Color('rgba(75, 101, 178, 1)'));

  const labelPaint = Skia.Paint();
  labelPaint.setColor(Skia.Color('rgba(100, 100, 100, 1)')); // Darker grey for text

  const FONT_SIZE = 10;

  return (
    <View style={[styles.container, {width: componentWidth}]}>
      <Canvas style={{ height: canvasHeight, width: componentWidth }}>
        {/* Y-axis */}
        <Line
          p1={{ x: paddingHorizontal, y: paddingVertical }}
          p2={{ x: paddingHorizontal, y: chartHeight + paddingVertical }}
          paint={axisPaint}
        />
        {/* X-axis */}
        <Line
          p1={{ x: paddingHorizontal, y: chartHeight + paddingVertical }}
          p2={{ x: chartWidth + paddingHorizontal, y: chartHeight + paddingVertical }}
          paint={axisPaint}
        />

        <Path
          path={path.transform(Skia.Matrix().translate(paddingHorizontal, paddingVertical))}
          paint={linePaint}
        />

        {dataPoints.map((point, index) => (
          <Circle
            key={index}
            cx={point.x + paddingHorizontal}
            cy={point.y + paddingVertical}
            r={4}
            paint={circlePaint}
          />
        ))}

        {labels.map((label, index) => (
           <SkiaText
            key={`x-label-${index}`}
            x={(data.length === 1 ? chartWidth / 2 : (chartWidth / (labels.length - 1)) * index) + paddingHorizontal - (FONT_SIZE / 2) } // Adjust for centering
            y={chartHeight + paddingVertical + FONT_SIZE + 5} // Below x-axis
            text={label}
            color={labelPaint.getColor()} // Use paint color
            // font={font} // Requires useFont for custom fonts
          />
        ))}

        <SkiaText
          x={paddingHorizontal - FONT_SIZE - 5} y={paddingVertical + FONT_SIZE/2} text={maxValue.toString()} color={labelPaint.getColor()}
          // font={font}
          textAlign="right"
        />
        <SkiaText
          x={paddingHorizontal - FONT_SIZE - 5} y={chartHeight + paddingVertical} text="0" color={labelPaint.getColor()}
          // font={font}
          textAlign="right"
        />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // padding is now handled by chart internal padding variables for canvas calculations
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginVertical: 8,
    backgroundColor: '#fff',
    alignItems: 'center', // Center canvas if its explicit width is less than View's width
  },
  noDataText: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
  }
});

export default ActivityTrendChart;
