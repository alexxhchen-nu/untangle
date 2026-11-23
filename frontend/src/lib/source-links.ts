// Links parsed tomb records back to the passages of source text they came from.
// The backend does not return offsets, so we locate each tomb by its number
// (M1, M23 …) and check which extracted values literally appear in that passage.

export type SourceSegment = {
  tombIndex: number;
  start: number;
  end: number;
};

export type FieldEvidence = {
  label: string;
  value: string;
  found: boolean;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function idPattern(tombId: string) {
  // "M1" must not match "M10"; allow "M 1" spacing used in OCR output.
  const spaced = tombId
    .split("")
    .map((ch) => escapeRegExp(ch))
    .join("\\s*");
  return `${spaced}(?![0-9A-Za-z])`;
}

function findTombStart(text: string, tombId: string, from: number) {
  const slice = text.slice(from);
  // Prefer a heading or a line that begins with the tomb number.
  const heading = new RegExp(`^[ \\t]*#{0,3}[ \\t]*${idPattern(tombId)}`, "m").exec(slice);
  if (heading) return from + heading.index;
  const anywhere = new RegExp(idPattern(tombId)).exec(slice);
  return anywhere ? from + anywhere.index : -1;
}

export function segmentSource(text: string, tombIds: string[]): SourceSegment[] {
  const starts: { tombIndex: number; start: number }[] = [];

  tombIds.forEach((id, tombIndex) => {
    if (!id) return;
    const start = findTombStart(text, id, 0);
    if (start >= 0) starts.push({ tombIndex, start });
  });

  starts.sort((a, b) => a.start - b.start);

  return starts.map((entry, i) => ({
    tombIndex: entry.tombIndex,
    start: entry.start,
    end: i + 1 < starts.length ? starts[i + 1].start : text.length,
  }));
}

function numberVariants(raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return [raw];
  const variants = new Set([raw, String(n)]);
  if (Number.isInteger(n)) variants.add(`${n}.0`);
  return Array.from(variants);
}

export function valueAppears(passage: string, value: string, numeric = false) {
  if (!value || value === "—") return false;
  const candidates = numeric ? numberVariants(value) : [value];
  return candidates.some((candidate) => {
    if (numeric) {
      return new RegExp(`(?<![0-9.])${escapeRegExp(candidate)}(?![0-9])`).test(passage);
    }
    return passage.includes(candidate);
  });
}

export type Mark = { start: number; end: number };

// Non-overlapping occurrences of the given terms, longest terms win.
export function findMarks(passage: string, terms: { value: string; numeric?: boolean }[]): Mark[] {
  const marks: Mark[] = [];
  const sorted = [...terms]
    .filter((t) => t.value && t.value !== "—")
    .sort((a, b) => b.value.length - a.value.length);

  for (const term of sorted) {
    const candidates = (term.numeric ? numberVariants(term.value) : [term.value]).sort((a, b) => b.length - a.length);
    for (const candidate of candidates) {
      const pattern = term.numeric
        ? new RegExp(`(?<![0-9.])${escapeRegExp(candidate)}(?![0-9])`, "g")
        : new RegExp(escapeRegExp(candidate), "g");
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(passage))) {
        const start = match.index;
        const end = start + match[0].length;
        if (!marks.some((m) => start < m.end && end > m.start)) {
          marks.push({ start, end });
        }
        if (match[0].length === 0) pattern.lastIndex += 1;
      }
    }
  }

  return marks.sort((a, b) => a.start - b.start);
}
