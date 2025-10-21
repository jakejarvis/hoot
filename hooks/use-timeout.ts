import * as React from "react";

export function useTimeout() {
  const ref = React.useRef<number | null>(null);
  const clear = React.useCallback(() => {
    if (ref.current) {
      window.clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);
  const set = React.useCallback(
    (fn: () => void, ms: number) => {
      clear();
      ref.current = window.setTimeout(fn, ms);
    },
    [clear],
  );
  React.useEffect(() => clear, [clear]);
  return { set, clear } as const;
}
