export type LrcLine = { time: number; text: string };

const TIME_RE = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(input = ""): LrcLine[] {
  const lines: LrcLine[] = [];

  for (const rawLine of input.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(TIME_RE)];
    if (!matches.length) continue;
    const text = rawLine.replace(TIME_RE, "").trim();

    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fractionRaw = match[3] ?? "0";
      const fraction = Number(`0.${fractionRaw.padEnd(3, "0").slice(0, 3)}`);
      lines.push({ time: minutes * 60 + seconds + fraction, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

export function findActiveLine(lines: LrcLine[], currentTime: number) {
  if (!lines.length) return -1;
  let low = 0;
  let high = lines.length - 1;
  let answer = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lines[mid].time <= currentTime) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return answer;
}
