import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import type { RoadmapNode } from "../lib/types";
import { colors, radius, shadow } from "../theme";
import { PressScale } from "./PressScale";
import { playTap } from "../lib/sounds";

const NODE = 72;
const ROW_H = 118;
const AMP = 58; // zigzag X

function nodeOffsetX(i: number): number {
  const pattern = [0, -AMP, 0, AMP];
  return pattern[i % 4];
}

function typeEmoji(t: RoadmapNode["type"]) {
  switch (t) {
    case "read":
      return "📖";
    case "flashcards":
      return "🃏";
    case "quiz":
      return "❓";
    case "review":
      return "🔁";
    case "chest":
      return "🎁";
    default:
      return "•";
  }
}

type Props = {
  nodes: RoadmapNode[];
  unitTitle: string;
  unitSubtitle: string;
  xp: number;
  onSelect: (node: RoadmapNode) => void;
};

export function StudyPath({
  nodes,
  unitTitle,
  unitSubtitle,
  xp,
  onSelect,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const pathW = Math.min(winW - 40, 400);
  const centerX = pathW / 2;
  const height = Math.max(ROW_H, nodes.length * ROW_H + 24);

  const points = useMemo(() => {
    return nodes.map((_, i) => ({
      x: centerX + nodeOffsetX(i),
      y: 40 + i * ROW_H + NODE / 2,
    }));
  }, [nodes, centerX]);

  const pathD = useMemo(() => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const midY = (prev.y + cur.y) / 2;
      d += ` C ${prev.x} ${midY}, ${cur.x} ${midY}, ${cur.x} ${cur.y}`;
    }
    return d;
  }, [points]);

  const doneCount = nodes.filter((n) => n.status === "done").length;
  const progress =
    nodes.length > 1 ? doneCount / Math.max(1, nodes.length - 1) : doneCount;

  // pulse sul nodo current
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.wrap}>
      {/* Unit banner sticky-like */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerKicker}>{unitSubtitle}</Text>
          <Text style={styles.bannerTitle} numberOfLines={1}>
            {unitTitle}
          </Text>
        </View>
        <View style={styles.xpChip}>
          <Text style={styles.xpText}>{xp} XP</Text>
        </View>
      </View>
      <View style={styles.bannerBar}>
        <View
          style={[styles.bannerFill, { width: `${Math.min(100, progress * 100)}%` }]}
        />
      </View>

      <View style={[styles.pathBox, { width: pathW, height }]}>
        <Svg
          width={pathW}
          height={height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* track grigio */}
          {pathD ? (
            <Path
              d={pathD}
              stroke="#d4d4d8"
              strokeWidth={8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {/* progress verde (semplice: intero path se done ratio) */}
          {pathD ? (
            <Path
              d={pathD}
              stroke={colors.emerald}
              strokeWidth={8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.35 + progress * 0.55}
            />
          ) : null}
        </Svg>

        {nodes.map((node, i) => {
          const done = node.status === "done";
          const current = node.status === "current";
          const locked = node.status === "locked";
          const x = points[i].x - NODE / 2;
          const y = points[i].y - NODE / 2;

          const circle = (
            <View
              style={[
                styles.circle,
                done && styles.circleDone,
                current && styles.circleCurrent,
                locked && styles.circleLocked,
              ]}
            >
              <Text
                style={[
                  styles.circleEmoji,
                  done && styles.circleEmojiDone,
                ]}
              >
                {done ? "✓" : locked ? "🔒" : typeEmoji(node.type)}
              </Text>
            </View>
          );

          return (
            <View
              key={node.id}
              style={[styles.nodeAbs, { left: x, top: y - 22, width: NODE }]}
            >
              <Text
                style={[
                  styles.dayChip,
                  current && styles.dayCurrent,
                  done && styles.dayDone,
                ]}
              >
                Giorno {node.day}
              </Text>
              <PressScale
                disabled={locked}
                onPress={() => {
                  if (locked) return;
                  void playTap();
                  onSelect(node);
                }}
                scaleTo={0.9}
              >
                {current ? (
                  <Animated.View style={{ transform: [{ scale: pulse }] }}>
                    {circle}
                  </Animated.View>
                ) : (
                  circle
                )}
              </PressScale>
              <Text
                style={[
                  styles.nodeLabel,
                  current && styles.labelCurrent,
                  done && styles.labelDone,
                  locked && styles.labelLocked,
                ]}
                numberOfLines={2}
              >
                {node.title}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.emerald,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadow.soft,
  },
  bannerKicker: {
    fontSize: 11,
    fontWeight: "800",
    color: "#d1fae5",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginTop: 2,
  },
  xpChip: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  xpText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  bannerBar: {
    height: 8,
    backgroundColor: "rgba(4,120,87,0.45)",
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: "hidden",
    marginBottom: 18,
  },
  bannerFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  pathBox: {
    alignSelf: "center",
    position: "relative",
  },
  nodeAbs: {
    position: "absolute",
    alignItems: "center",
    zIndex: 2,
  },
  dayChip: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  dayCurrent: {
    backgroundColor: colors.amberSoft,
    color: "#92400e",
  },
  dayDone: {
    backgroundColor: colors.emeraldSoft,
    color: colors.emeraldDeep,
  },
  circle: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 5,
    borderColor: colors.emerald,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  circleDone: {
    backgroundColor: colors.emerald,
    borderColor: colors.emeraldDeep,
  },
  circleCurrent: {
    borderColor: "#34d399",
    backgroundColor: "#fff",
    shadowOpacity: 0.25,
  },
  circleLocked: {
    backgroundColor: "#f4f4f5",
    borderColor: "#e4e4e7",
    shadowOpacity: 0,
    elevation: 0,
  },
  circleEmoji: {
    fontSize: 26,
    fontWeight: "800",
  },
  circleEmojiDone: {
    color: "#fff",
    fontSize: 30,
  },
  nodeLabel: {
    marginTop: 8,
    maxWidth: 120,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    lineHeight: 15,
  },
  labelCurrent: { color: colors.emeraldDeep },
  labelDone: { color: colors.text },
  labelLocked: { color: colors.textSoft },
});
