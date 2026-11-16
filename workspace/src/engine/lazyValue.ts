/** Memoized thunk: `compute` runs on the first call only, so module import does not pay for it. */
export function lazyValue<T>(compute: () => T): () => T {
  let computed = false;
  let value: T;
  return () => {
    if (!computed) {
      value = compute();
      computed = true;
    }
    return value;
  };
}
