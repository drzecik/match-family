/** Bounded Damerau-Levenshtein distance for short model identifiers. */
export function editDistance(left: string, right: string, upperBound = 3): number {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > upperBound) return upperBound + 1;

  const previousPrevious = new Array<number>(right.length + 1).fill(0);
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = new Array<number>(right.length + 1).fill(0);
    current[0] = leftIndex;
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + substitutionCost,
      );

      if (
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        current[rightIndex] = Math.min(
          current[rightIndex] ?? Number.POSITIVE_INFINITY,
          (previousPrevious[rightIndex - 2] ?? 0) + 1,
        );
      }
      rowMinimum = Math.min(rowMinimum ?? Number.POSITIVE_INFINITY, current[rightIndex] ?? 0);
    }

    if (rowMinimum > upperBound) return upperBound + 1;
    previousPrevious.splice(0, previousPrevious.length, ...previous);
    previous = current;
  }

  return previous[right.length] ?? upperBound + 1;
}

export function similarity(left: string, right: string): number {
  const longest = Math.max(left.length, right.length);
  if (longest === 0) return 1;
  const distance = editDistance(left, right, 3);
  // The bounded distance returns 4 for any larger difference. Treating that
  // sentinel as an exact distance would make unrelated long labels look close.
  if (distance > 3) return 0;
  return 1 - distance / longest;
}
