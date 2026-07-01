// props.mjs — style-fidelity 하네스의 계약(SSOT).
//
// 픽셀 diff가 못 잡는 computed-style 속성 집합 + 값 정규화 로직을 한 곳에 둔다.
// fingerprint.js(브라우저 주입)와 diff.mjs(노드)가 **동일한** 이 정의를 공유한다.
// (retro #9 "포팅 이음새/에이전트 간 데이터형태 계약 없음" 재발 방지 — seam 단일 저작.)
//
// 브라우저(fingerprint.js)는 import를 못 하므로, 노드 측이 FINGERPRINT_PROPS를
// page.evaluate 인자로 넘겨준다. 정규화(normalize*/compareValue)는 diff.mjs(노드)에서만 쓴다.

// ── 지문 속성셋 ────────────────────────────────────────────────
// 픽셀 diff가 놓치는 것 위주: 모서리 반경, 옅은 그림자, 1px 테두리, 폰트, 간격, 토큰 색.
export const FINGERPRINT_PROPS = [
  // box shape
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
  'boxShadow',
  'outlineWidth', 'outlineStyle', 'outlineColor',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  // type
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'color',
  // fill
  'backgroundColor', 'backgroundImage', 'opacity',
  // space
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'gap', 'rowGap', 'columnGap',
  // layout
  'display', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'boxSizing',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  // motion (정적 스냅샷 — 애니 자체가 아니라 존재/설정 대조)
  'transform', 'transition',
];

// map의 shorthand를 위 롱핸드로 펼친다. (사람이 map에 'borderRadius'라 써도 되게)
export const SHORTHAND_EXPANSION = {
  borderRadius: ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'],
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  margin: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
  borderWidth: ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'],
  borderColor: ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'],
  borderStyle: ['borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle'],
  border: [
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  ],
  outline: ['outlineWidth', 'outlineStyle', 'outlineColor'],
};

// 프로퍼티 → 값 종류
const COLOR_PROPS = new Set([
  'color', 'backgroundColor', 'outlineColor',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
]);
const LENGTH_PROPS = new Set([
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
  'outlineWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'fontSize', 'letterSpacing',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'gap', 'rowGap', 'columnGap',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
]);
const SHADOW_PROPS = new Set(['boxShadow']);
const GRADIENT_PROPS = new Set(['backgroundImage']);
const TRANSFORM_PROPS = new Set(['transform']);
const NUMERIC_PROPS = new Set(['opacity', 'fontWeight']);
const LINEHEIGHT_PROPS = new Set(['lineHeight']);
// letter/word-spacing의 'normal'은 0과 시각 동일 (Chrome 기본값 vs 명시 0px 오탐 방지)
const SPACING_NORMAL_ZERO = new Set(['letterSpacing', 'wordSpacing']);
const FONT_WEIGHT_KEYWORDS = { normal: '400', bold: '700' };
// 나머지(display, flexDirection, fontFamily, transform, transition, *Style, textTransform, boxSizing …)는 문자열 비교.

// 토큰 미해석 의심 프로퍼티: 레퍼런스엔 실색이 있는데 타깃이 transparent/none/empty면
// "var(--x) 미정의로 폴백 실패" 신호. (retro #8: --bar-track/--success/--delta-up 투명 렌더)
const TOKEN_SENSITIVE_PROPS = new Set([
  'color', 'backgroundColor', 'boxShadow', 'backgroundImage',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
]);

// ── 정규화 헬퍼 ────────────────────────────────────────────────

// 표준 CSS named colors (손작성 spec에서 named color를 hex/rgb 등가물과 대조 가능하게).
const CSS_NAMED_HEX = {
  aliceblue: '#f0f8ff', antiquewhite: '#faebd7', aqua: '#00ffff', aquamarine: '#7fffd4', azure: '#f0ffff',
  beige: '#f5f5dc', bisque: '#ffe4c4', black: '#000000', blanchedalmond: '#ffebcd', blue: '#0000ff',
  blueviolet: '#8a2be2', brown: '#a52a2a', burlywood: '#deb887', cadetblue: '#5f9ea0', chartreuse: '#7fff00',
  chocolate: '#d2691e', coral: '#ff7f50', cornflowerblue: '#6495ed', cornsilk: '#fff8dc', crimson: '#dc143c',
  cyan: '#00ffff', darkblue: '#00008b', darkcyan: '#008b8b', darkgoldenrod: '#b8860b', darkgray: '#a9a9a9',
  darkgreen: '#006400', darkgrey: '#a9a9a9', darkkhaki: '#bdb76b', darkmagenta: '#8b008b', darkolivegreen: '#556b2f',
  darkorange: '#ff8c00', darkorchid: '#9932cc', darkred: '#8b0000', darksalmon: '#e9967a', darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b', darkslategray: '#2f4f4f', darkslategrey: '#2f4f4f', darkturquoise: '#00ced1', darkviolet: '#9400d3',
  deeppink: '#ff1493', deepskyblue: '#00bfff', dimgray: '#696969', dimgrey: '#696969', dodgerblue: '#1e90ff',
  firebrick: '#b22222', floralwhite: '#fffaf0', forestgreen: '#228b22', fuchsia: '#ff00ff', gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff', gold: '#ffd700', goldenrod: '#daa520', gray: '#808080', green: '#008000',
  greenyellow: '#adff2f', grey: '#808080', honeydew: '#f0fff0', hotpink: '#ff69b4', indianred: '#cd5c5c',
  indigo: '#4b0082', ivory: '#fffff0', khaki: '#f0e68c', lavender: '#e6e6fa', lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00', lemonchiffon: '#fffacd', lightblue: '#add8e6', lightcoral: '#f08080', lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2', lightgray: '#d3d3d3', lightgreen: '#90ee90', lightgrey: '#d3d3d3', lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a', lightseagreen: '#20b2aa', lightskyblue: '#87cefa', lightslategray: '#778899', lightslategrey: '#778899',
  lightsteelblue: '#b0c4de', lightyellow: '#ffffe0', lime: '#00ff00', limegreen: '#32cd32', linen: '#faf0e6',
  magenta: '#ff00ff', maroon: '#800000', mediumaquamarine: '#66cdaa', mediumblue: '#0000cd', mediumorchid: '#ba55d3',
  mediumpurple: '#9370db', mediumseagreen: '#3cb371', mediumslateblue: '#7b68ee', mediumspringgreen: '#00fa9a', mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585', midnightblue: '#191970', mintcream: '#f5fffa', mistyrose: '#ffe4e1', moccasin: '#ffe4b5',
  navajowhite: '#ffdead', navy: '#000080', oldlace: '#fdf5e6', olive: '#808000', olivedrab: '#6b8e23',
  orange: '#ffa500', orangered: '#ff4500', orchid: '#da70d6', palegoldenrod: '#eee8aa', palegreen: '#98fb98',
  paleturquoise: '#afeeee', palevioletred: '#db7093', papayawhip: '#ffefd5', peachpuff: '#ffdab9', peru: '#cd853f',
  pink: '#ffc0cb', plum: '#dda0dd', powderblue: '#b0e0e6', purple: '#800080', rebeccapurple: '#663399',
  red: '#ff0000', rosybrown: '#bc8f8f', royalblue: '#4169e1', saddlebrown: '#8b4513', salmon: '#fa8072',
  sandybrown: '#f4a460', seagreen: '#2e8b57', seashell: '#fff5ee', sienna: '#a0522d', silver: '#c0c0c0',
  skyblue: '#87ceeb', slateblue: '#6a5acd', slategray: '#708090', slategrey: '#708090', snow: '#fffafa',
  springgreen: '#00ff7f', steelblue: '#4682b4', tan: '#d2b48c', teal: '#008080', thistle: '#d8bfd8',
  tomato: '#ff6347', turquoise: '#40e0d0', violet: '#ee82ee', wheat: '#f5deb3', white: '#ffffff',
  whitesmoke: '#f5f5f5', yellow: '#ffff00', yellowgreen: '#9acd32',
};

// 색을 canonical {r,g,b,a}로. 파싱 실패 시 null.
export function normalizeColor(value) {
  if (value == null) return null;
  const v = String(value).trim().toLowerCase();
  if (v === '' || v === 'none' || v === 'currentcolor' || v === 'inherit' || v === 'initial') return null;
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (CSS_NAMED_HEX[v]) return normalizeColor(CSS_NAMED_HEX[v]); // hex 파서로 재귀 해석

  // rgb()/rgba()  — 쉼표 또는 공백/슬래시(css color-4) 구분 모두 허용
  let m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length >= 3) {
      const r = parseChannel(parts[0], 255);
      const g = parseChannel(parts[1], 255);
      const b = parseChannel(parts[2], 255);
      const a = parts[3] != null ? parseAlpha(parts[3]) : 1;
      if ([r, g, b].every((x) => x != null) && a != null) return { r, g, b, a };
    }
    return null;
  }

  // #rgb / #rgba / #rrggbb / #rrggbbaa
  m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    const h = m[1];
    const exp = (s) => s + s;
    if (h.length === 3) return { r: hx(exp(h[0])), g: hx(exp(h[1])), b: hx(exp(h[2])), a: 1 };
    if (h.length === 4) return { r: hx(exp(h[0])), g: hx(exp(h[1])), b: hx(exp(h[2])), a: round2(hx(exp(h[3])) / 255) };
    if (h.length === 6) return { r: hx(h.slice(0, 2)), g: hx(h.slice(2, 4)), b: hx(h.slice(4, 6)), a: 1 };
    if (h.length === 8) return { r: hx(h.slice(0, 2)), g: hx(h.slice(2, 4)), b: hx(h.slice(4, 6)), a: round2(hx(h.slice(6, 8)) / 255) };
  }
  return null;
}

function parseChannel(tok, max) {
  tok = tok.trim();
  if (tok.endsWith('%')) {
    const n = parseFloat(tok);
    return Number.isNaN(n) ? null : Math.round((n / 100) * max);
  }
  const n = parseFloat(tok);
  return Number.isNaN(n) ? null : Math.round(n);
}
function parseAlpha(tok) {
  tok = tok.trim();
  if (tok.endsWith('%')) {
    const n = parseFloat(tok);
    return Number.isNaN(n) ? null : round2(n / 100);
  }
  const n = parseFloat(tok);
  return Number.isNaN(n) ? null : round2(n);
}
function hx(s) { return parseInt(s, 16); }
function round2(n) { return Math.round(n * 100) / 100; }

// 길이를 px 숫자로. 'normal'/'auto'/'none' 등 키워드는 그대로 문자열 반환.
export function normalizeLength(value) {
  if (value == null) return null;
  const v = String(value).trim().toLowerCase();
  if (v === '') return null;
  if (/^-?[\d.]+px$/.test(v)) return round2(parseFloat(v));
  if (/^-?[\d.]+$/.test(v)) return round2(parseFloat(v)); // unitless (lineHeight 등)
  if (v === '0') return 0;
  return v; // 'normal', 'auto', 'none', '50%' …
}

// 파렌 안 쉼표를 지키며 top-level 쉼표로 split (rgba(...) 보호).
export function splitTopLevel(str, sep = ',') {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of String(str)) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim() !== '') out.push(cur.trim());
  return out;
}

// boxShadow → 정규화 배열. 'none' → [].
// 각 그림자: { inset, color:{r,g,b,a}|raw, lengths:[px…] }
export function normalizeShadow(value) {
  if (value == null) return null;
  const v = String(value).trim();
  if (v === '' || v.toLowerCase() === 'none') return [];
  return splitTopLevel(v, ',').map((oneStr) => {
    let one = oneStr.trim();
    let inset = false;
    if (/(^|\s)inset(\s|$)/.test(one)) { inset = true; one = one.replace(/(^|\s)inset(\s|$)/, ' ').trim(); }
    // 색 토큰 추출 (rgb/rgba/#hex/named)
    let color = null;
    const rgbM = one.match(/rgba?\([^)]*\)/i);
    if (rgbM) { color = normalizeColor(rgbM[0]); one = one.replace(rgbM[0], ' ').trim(); }
    else {
      const hexM = one.match(/#[0-9a-fA-F]{3,8}/);
      if (hexM) { color = normalizeColor(hexM[0]); one = one.replace(hexM[0], ' ').trim(); }
      else {
        const nameM = one.match(/\b([a-zA-Z]+)\b/);
        if (nameM && normalizeColor(nameM[1])) { color = normalizeColor(nameM[1]); one = one.replace(nameM[0], ' ').trim(); }
      }
    }
    const lengths = one.split(/\s+/).filter(Boolean).map((t) => {
      const n = parseFloat(t);
      return Number.isNaN(n) ? t : round2(n);
    });
    return { inset, color, lengths };
  });
}

// gradient/background-image 정규화: 공백 collapse + 색 canonical화한 문자열.
export function normalizeGradient(value) {
  if (value == null) return null;
  let v = String(value).trim();
  if (v === '' || v.toLowerCase() === 'none') return 'none';
  // 내부 rgb/rgba를 canonical 문자열로 치환
  v = v.replace(/rgba?\([^)]*\)/gi, (m) => {
    const c = normalizeColor(m);
    return c ? `c(${c.r},${c.g},${c.b},${c.a})` : m;
  });
  v = v.replace(/#[0-9a-fA-F]{3,8}/g, (m) => {
    const c = normalizeColor(m);
    return c ? `c(${c.r},${c.g},${c.b},${c.a})` : m;
  });
  // 공백 collapse + 쉼표/괄호 주변 공백 정규화 (`180deg, x` == `180deg,x`)
  return v
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .toLowerCase();
}

// transform: 'none'과 항등 행렬을 동치로, matrix 성분을 반올림 canonical화.
// Chrome은 transform 미설정 시 'none', 항등 설정 시 'matrix(1, 0, 0, 1, 0, 0)' 반환 → 렌더 동일.
export function normalizeTransform(value) {
  if (value == null) return 'none';
  const v = String(value).trim().toLowerCase();
  if (v === '' || v === 'none') return 'none';
  const m = v.match(/^(matrix3d|matrix)\(([^)]*)\)$/);
  if (m) {
    const nums = m[2].split(',').map((x) => round3(parseFloat(x)));
    const id2 = m[1] === 'matrix' && nums.length === 6 && arraysClose(nums, [1, 0, 0, 1, 0, 0]);
    const id3 = m[1] === 'matrix3d' && nums.length === 16 &&
      arraysClose(nums, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    if (id2 || id3) return 'none';
    return `${m[1]}(${nums.join(',')})`;
  }
  return v.replace(/\s*,\s*/g, ',').replace(/\s+/g, ' '); // 그 외 함수열은 공백/쉼표 정규화만
}
function round3(n) { return Number.isNaN(n) ? n : Math.round(n * 1000) / 1000; }
function arraysClose(a, b, tol = 0.001) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Number.isNaN(a[i]) || Number.isNaN(b[i])) return false; // 비수치 matrix 인자를 '항등'으로 오판 금지
    if (Math.abs(a[i] - b[i]) > tol) return false;
  }
  return true;
}

function colorsEqual(a, b, alphaTol = 0.03) {
  if (a == null || b == null) return a === b; // 둘 다 null이면 같음, 한쪽만 null이면 다름
  return a.r === b.r && a.g === b.g && a.b === b.b && Math.abs(a.a - b.a) <= alphaTol;
}
function lengthsEqual(a, b, tol) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol;
  return a === b; // 키워드끼리 문자열 비교
}

// 색이 "실질적으로 비어있음(투명/none/empty)"인가 — 토큰 미해석 탐지용
function isEffectivelyEmpty(prop, rawValue) {
  if (rawValue == null) return true;
  const v = String(rawValue).trim().toLowerCase();
  if (v === '' || v === 'none') return true;
  if (COLOR_PROPS.has(prop) || SHADOW_PROPS.has(prop)) {
    const c = normalizeColor(v);
    if (c && c.a === 0) return true; // 완전 투명
  }
  return false;
}

// ── 단일 프로퍼티 비교 ────────────────────────────────────────
// expected(레퍼런스/spec)와 actual(타깃) raw 문자열을 받아 판정.
// 반환: { prop, equal, expected, actual, kind, tokenSuspect }
export function compareValue(prop, expected, actual, opts = {}) {
  const lengthTol = opts.lengthTol ?? 0.5;
  const alphaTol = opts.alphaTol ?? 0.03;
  const base = { prop, expected, actual };

  // 토큰 미해석 의심: 레퍼런스는 값 있는데 타깃이 비었을 때
  let tokenSuspect = false;
  if (TOKEN_SENSITIVE_PROPS.has(prop) && !isEffectivelyEmpty(prop, expected) && isEffectivelyEmpty(prop, actual)) {
    tokenSuspect = true;
  }

  let kind = 'string', equal;
  if (COLOR_PROPS.has(prop)) {
    kind = 'color';
    const ce = normalizeColor(expected), ca = normalizeColor(actual);
    // 둘 다 파싱 실패(inherit/initial/미등록 named)면 원문 문자열로 비교 — 서로 다르면 오통과 금지
    equal = (ce === null && ca === null) ? normStr(expected) === normStr(actual) : colorsEqual(ce, ca, alphaTol);
  } else if (SHADOW_PROPS.has(prop)) {
    kind = 'shadow';
    equal = shadowsEqual(normalizeShadow(expected), normalizeShadow(actual), lengthTol, alphaTol);
  } else if (GRADIENT_PROPS.has(prop)) {
    kind = 'gradient';
    equal = normalizeGradient(expected) === normalizeGradient(actual);
  } else if (TRANSFORM_PROPS.has(prop)) {
    kind = 'transform';
    equal = normalizeTransform(expected) === normalizeTransform(actual);
  } else if (NUMERIC_PROPS.has(prop)) {
    kind = 'numeric';
    let e = expected, a = actual;
    if (prop === 'fontWeight') { e = fontWeightNum(e); a = fontWeightNum(a); }
    const ev = parseFloat(e), av = parseFloat(a);
    equal = !Number.isNaN(ev) && !Number.isNaN(av) ? Math.abs(ev - av) <= (opts.numericTol ?? 0.01) : normStr(e) === normStr(a);
  } else if (LENGTH_PROPS.has(prop) || LINEHEIGHT_PROPS.has(prop)) {
    kind = 'length';
    let e = expected, a = actual;
    if (SPACING_NORMAL_ZERO.has(prop)) {
      if (String(e).trim().toLowerCase() === 'normal') e = '0px';
      if (String(a).trim().toLowerCase() === 'normal') a = '0px';
    }
    equal = lengthsEqual(normalizeLength(e), normalizeLength(a), lengthTol);
  } else {
    kind = 'string';
    equal = normStr(expected) === normStr(actual);
  }
  return { ...base, equal, kind, tokenSuspect };
}

function shadowsEqual(a, b, lengthTol, alphaTol) {
  if (a == null || b == null) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const s1 = a[i], s2 = b[i];
    if (s1.inset !== s2.inset) return false;
    if (!colorsEqual(s1.color, s2.color, alphaTol)) return false;
    if (s1.lengths.length !== s2.lengths.length) return false;
    for (let j = 0; j < s1.lengths.length; j++) {
      if (!lengthsEqual(s1.lengths[j], s2.lengths[j], lengthTol)) return false;
    }
  }
  return true;
}

// 문자열 kind 정규화: 공백 collapse + 쉼표 주변 공백 + 따옴표 제거 + lowercase.
// (fontFamily "Roboto", sans-serif == Roboto, sans-serif / transition·transform 손작성 spec 견고)
function normStr(v) {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .replace(/["']/g, '')
    .toLowerCase();
}

function fontWeightNum(v) {
  const s = String(v).trim().toLowerCase();
  return FONT_WEIGHT_KEYWORDS[s] ?? v; // bold→700, normal→400, 그 외(숫자·lighter/bolder)는 원문
}

// map의 props를 롱핸드로 펼침. 문자열 오타는 배열로 강제(silent-pass 방지). 미지정 시 전체.
export function expandProps(props) {
  if (typeof props === 'string') props = [props];
  if (!Array.isArray(props) || props.length === 0) return [...FINGERPRINT_PROPS];
  const out = [];
  for (const p of props) {
    if (SHORTHAND_EXPANSION[p]) out.push(...SHORTHAND_EXPANSION[p]);
    else out.push(p);
  }
  return [...new Set(out)];
}

export const _internal = { normStr, colorsEqual, lengthsEqual, isEffectivelyEmpty, shadowsEqual };
