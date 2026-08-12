import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

/** Bottone con animazione scale al press (stile Duolingo). */
export function PressScale({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.94,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function down() {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }
  function up() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 8,
    }).start();
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={down}
      onPressOut={up}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
