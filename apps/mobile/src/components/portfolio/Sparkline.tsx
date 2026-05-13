/**
 * Sparkline — pure SVG line chart for portfolio value history.
 * No external deps, just react-native-svg.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { SparklinePoint } from '../../hooks/usePortfolio';

interface SparklineProps {
  data: SparklinePoint[];
  width: number;
  height: number;
  positive?: boolean;
}

export function Sparkline({ data, width, height, positive = true }: SparklineProps) {
  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) return { linePath: '', areaPath: '' };

    const values = data.map((d) => d.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;

    const pad = 4;
    const plotW = width - pad * 2;
    const plotH = height - pad * 2;

    const points = data.map((d, i) => ({
      x: pad + (i / (data.length - 1)) * plotW,
      y: pad + plotH - ((d.value - minV) / range) * plotH,
    }));

    // Smooth bezier
    const buildPath = (pts: { x: number; y: number }[]) => {
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const cx1 = prev.x + (curr.x - prev.x) / 3;
        const cx2 = curr.x - (curr.x - prev.x) / 3;
        d += ` C ${cx1} ${prev.y} ${cx2} ${curr.y} ${curr.x} ${curr.y}`;
      }
      return d;
    };

    const lp = buildPath(points);
    const ap =
      `${lp} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { linePath: lp, areaPath: ap };
  }, [data, width, height]);

  const strokeColor = positive ? '#10b981' : '#ef4444';
  const gradId = positive ? 'sparkGradPos' : 'sparkGradNeg';
  const gradStart = positive ? '#10b98133' : '#ef444433';

  if (!linePath) return <View style={{ width, height }} />;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={gradStart} />
          <Stop offset="100%" stopColor="transparent" />
        </LinearGradient>
      </Defs>
      {/* Area fill */}
      <Path d={areaPath} fill={`url(#${gradId})`} />
      {/* Line */}
      <Path
        d={linePath}
        stroke={strokeColor}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({});
