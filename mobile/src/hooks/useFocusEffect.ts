import { useEffect } from "react";

/** Semplice "on mount" (sostituto leggero di useFocusEffect di navigation). */
export function useFocusEffect(fn: () => void | Promise<void>) {
  useEffect(() => {
    void fn();
  }, [fn]);
}
