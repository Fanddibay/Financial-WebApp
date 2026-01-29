/**
 * Built-in avatar gallery for profile customization.
 * All avatars are inline SVG data URLs for full offline use.
 * Male/Female with distinct hair styles.
 */

export type AvatarCategoryId =
  | 'male'
  | 'female'
  | 'kids'
  | 'youngAdult'
  | 'adult'
  | 'senior'
  | 'accessories'

export interface AvatarPreset {
  id: string
  url: string
  label?: string
}

export interface AvatarCategory {
  id: AvatarCategoryId
  labelKey: string
  avatars: AvatarPreset[]
}

function svgDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
}

const BG = '#e8f4f8'
const SKIN_LIGHT = '#f5d0b0'
const SKIN_MED = '#e8c4a0'
const SKIN_TAN = '#e0b090'
const SKIN_SENIOR = '#d4a574'
const HAIR_BLACK = '#2c1810'
const HAIR_BROWN = '#4a3728'
const HAIR_DARK = '#3d2314'
const HAIR_BLONDE = '#8b6914'
const HAIR_GRAY = '#6b5344'
const EYE = '#2d2d2d'
const MOUTH = '#8b4513'

// —— Male: short hair (crew cut, buzz), optional stubble, more defined face ——
function maleSvg(opts: {
  skin?: string
  hair?: string
  hairStyle?: 'short' | 'buzz' | 'side' | 'curly'
  stubble?: boolean
}): string {
  const skin = opts.skin ?? SKIN_LIGHT
  const hair = opts.hair ?? HAIR_BROWN
  const stubble = opts.stubble ?? false
  const style = opts.hairStyle ?? 'short'

  // Short male hair: receding from forehead, sides
  const hairShort =
    '<path d="M 18 28 Q 50 22 82 28 L 82 38 Q 50 32 18 38 Z" fill="' +
    hair +
    '"/><path d="M 22 38 L 22 55 Q 50 52 78 55 L 78 38 Q 50 35 22 38" fill="' +
    hair +
    '"/>'
  const hairBuzz =
    '<ellipse cx="50" cy="28" rx="35" ry="14" fill="' +
    hair +
    '"/><path d="M 18 38 L 18 52 Q 50 50 82 52 L 82 38 Q 50 36 18 38" fill="' +
    hair +
    '"/>'
  const hairSide =
    '<path d="M 20 26 Q 48 18 78 26 L 78 36 Q 50 30 20 36 Z" fill="' +
    hair +
    '"/><path d="M 22 36 L 22 54 Q 50 51 78 54 L 78 36 Q 50 38 22 36" fill="' +
    hair +
    '"/>'
  const hairCurly =
    '<path d="M 22 24 Q 50 16 78 24 Q 50 28 22 24" fill="' +
    hair +
    '"/><path d="M 20 26 Q 50 22 80 26 L 78 40 Q 50 38 22 40 Z" fill="' +
    hair +
    '"/><ellipse cx="35" cy="30" rx="6" ry="5" fill="' +
    hair +
    '"/><ellipse cx="65" cy="30" rx="6" ry="5" fill="' +
    hair +
    '"/>'

  const hairPath =
    style === 'buzz'
      ? hairBuzz
      : style === 'side'
        ? hairSide
        : style === 'curly'
          ? hairCurly
          : hairShort

  const stubbleEl = stubble
    ? '<path d="M 32 62 Q 50 68 68 62" stroke="#8b7355" stroke-width="1.5" fill="none" opacity="0.6"/>'
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${BG}" rx="50"/>
  <circle cx="50" cy="48" r="32" fill="${skin}"/>
  ${hairPath}
  <ellipse cx="38" cy="45" rx="4" ry="5" fill="${EYE}"/>
  <ellipse cx="62" cy="45" rx="4" ry="5" fill="${EYE}"/>
  <path d="M 35 58 Q 50 65 65 58" stroke="${MOUTH}" stroke-width="2" fill="none" stroke-linecap="round"/>
  ${stubbleEl}
</svg>`
}

// —— Female: long hair, bob, shoulder-length, bangs ——
function femaleSvg(opts: {
  skin?: string
  hair?: string
  hairStyle?: 'long' | 'bob' | 'shoulder' | 'bangs'
}): string {
  const skin = opts.skin ?? SKIN_LIGHT
  const hair = opts.hair ?? HAIR_BROWN
  const style = opts.hairStyle ?? 'long'

  // Long hair: flows down both sides
  const hairLong =
    '<path d="M 18 30 Q 50 20 82 30 L 78 42 Q 50 38 22 42 Z" fill="' +
    hair +
    '"/><path d="M 22 42 L 18 75 Q 50 82 82 75 L 78 42 Q 50 45 22 42" fill="' +
    hair +
    '"/>'
  // Bob: cut at jaw
  const hairBob =
    '<path d="M 18 28 Q 50 22 82 28 L 82 38 Q 50 35 18 38 Z" fill="' +
    hair +
    '"/><path d="M 20 38 L 18 58 Q 50 62 82 58 L 80 38 Q 50 42 20 38" fill="' +
    hair +
    '"/>'
  // Shoulder-length
  const hairShoulder =
    '<path d="M 20 28 Q 50 20 80 28 L 78 40 Q 50 35 22 40 Z" fill="' +
    hair +
    '"/><path d="M 22 40 L 20 68 Q 50 72 80 68 L 78 40 Q 50 44 22 40" fill="' +
    hair +
    '"/>'
  // With bangs (fringe)
  const hairBangs =
    '<path d="M 28 32 L 50 26 L 72 32 L 70 42 Q 50 38 30 42 Z" fill="' +
    hair +
    '"/><path d="M 22 42 L 20 70 Q 50 76 80 70 L 78 42 Q 50 45 22 42" fill="' +
    hair +
    '"/>'

  const hairPath =
    style === 'bob'
      ? hairBob
      : style === 'shoulder'
        ? hairShoulder
        : style === 'bangs'
          ? hairBangs
          : hairLong

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${BG}" rx="50"/>
  <circle cx="50" cy="48" r="32" fill="${skin}"/>
  ${hairPath}
  <ellipse cx="38" cy="46" rx="4" ry="5" fill="${EYE}"/>
  <ellipse cx="62" cy="46" rx="4" ry="5" fill="${EYE}"/>
  <path d="M 35 58 Q 50 66 65 58" stroke="${MOUTH}" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`
}

// —— Neutral/Kids: simple face + rounded hair (clearly above eyes, not a band) ——
function faceSvg(opts: {
  skin?: string
  hair?: string
  bg?: string
}): string {
  const skin = opts.skin ?? SKIN_LIGHT
  const hair = opts.hair ?? HAIR_BROWN
  const bg = opts.bg ?? BG
  // Hair: rounded cap on top of head, bottom edge at y~40 so eyes (y=45) are clearly below
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${bg}" rx="50"/>
  <circle cx="50" cy="48" r="32" fill="${skin}"/>
  <path d="M 20 38 Q 50 14 80 38 Q 50 44 20 38" fill="${hair}"/>
  <ellipse cx="38" cy="46" rx="4" ry="5" fill="${EYE}"/>
  <ellipse cx="62" cy="46" rx="4" ry="5" fill="${EYE}"/>
  <path d="M 35 59 Q 50 67 65 59" stroke="${MOUTH}" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`
}

function glassesSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${BG}" rx="50"/>
  <circle cx="50" cy="48" r="32" fill="${SKIN_LIGHT}"/>
  <rect x="28" y="42" width="18" height="12" rx="4" fill="none" stroke="#333" stroke-width="2"/>
  <rect x="54" y="42" width="18" height="12" rx="4" fill="none" stroke="#333" stroke-width="2"/>
  <path d="M 46 48 L 54 48" stroke="#333" stroke-width="2"/>
  <path d="M 22 46 L 28 48" stroke="#333" stroke-width="1.5"/>
  <path d="M 78 46 L 72 48" stroke="#333" stroke-width="1.5"/>
  <ellipse cx="38" cy="46" rx="4" ry="5" fill="${EYE}"/>
  <ellipse cx="62" cy="46" rx="4" ry="5" fill="${EYE}"/>
  <path d="M 35 60 Q 50 70 65 60" stroke="${MOUTH}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M 20 38 Q 50 20 80 38 Q 50 44 20 38" fill="${HAIR_BROWN}"/>
</svg>`
}

function hatSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${BG}" rx="50"/>
  <ellipse cx="50" cy="32" rx="38" ry="12" fill="#2c5282"/>
  <path d="M 15 32 L 15 42 Q 50 50 85 42 L 85 32 Z" fill="#2c5282"/>
  <circle cx="50" cy="50" r="30" fill="${SKIN_LIGHT}"/>
  <ellipse cx="38" cy="48" rx="4" ry="5" fill="${EYE}"/>
  <ellipse cx="62" cy="48" rx="4" ry="5" fill="${EYE}"/>
  <path d="M 35 62 Q 50 72 65 62" stroke="${MOUTH}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M 22 42 Q 50 28 78 42 Q 50 48 22 42" fill="${HAIR_BROWN}"/>
</svg>`
}

function hoodieSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${BG}" rx="50"/>
  <path d="M 20 55 Q 20 75 50 85 Q 80 75 80 55 L 80 48 L 50 42 L 20 48 Z" fill="#4a5568"/>
  <path d="M 50 42 L 50 85" stroke="#2d3748" stroke-width="2"/>
  <circle cx="50" cy="42" r="28" fill="${SKIN_LIGHT}"/>
  <ellipse cx="38" cy="40" rx="4" ry="5" fill="${EYE}"/>
  <ellipse cx="62" cy="40" rx="4" ry="5" fill="${EYE}"/>
  <path d="M 35 54 Q 50 64 65 54" stroke="${MOUTH}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M 24 32 Q 50 18 76 32 Q 50 38 24 32" fill="${HAIR_BROWN}"/>
</svg>`
}

// —— Build preset lists ——
const maleAvatars = [
  maleSvg({ skin: SKIN_LIGHT, hair: HAIR_BROWN, hairStyle: 'short' }),
  maleSvg({ skin: SKIN_MED, hair: HAIR_BLACK, hairStyle: 'buzz' }),
  maleSvg({ skin: SKIN_LIGHT, hair: HAIR_BLONDE, hairStyle: 'side' }),
  maleSvg({ skin: SKIN_TAN, hair: HAIR_BROWN, hairStyle: 'short', stubble: true }),
  maleSvg({ skin: SKIN_MED, hair: HAIR_DARK, hairStyle: 'curly' }),
  maleSvg({ skin: SKIN_LIGHT, hair: HAIR_BLACK, hairStyle: 'short' }),
  maleSvg({ skin: SKIN_TAN, hair: HAIR_BLONDE, hairStyle: 'buzz' }),
]

const femaleAvatars = [
  femaleSvg({ skin: SKIN_LIGHT, hair: HAIR_BROWN, hairStyle: 'long' }),
  femaleSvg({ skin: SKIN_MED, hair: HAIR_BLACK, hairStyle: 'bob' }),
  femaleSvg({ skin: SKIN_LIGHT, hair: HAIR_BLONDE, hairStyle: 'shoulder' }),
  femaleSvg({ skin: SKIN_MED, hair: HAIR_BROWN, hairStyle: 'bangs' }),
  femaleSvg({ skin: SKIN_LIGHT, hair: HAIR_DARK, hairStyle: 'long' }),
  femaleSvg({ skin: SKIN_TAN, hair: HAIR_BLONDE, hairStyle: 'bob' }),
  femaleSvg({ skin: SKIN_LIGHT, hair: HAIR_BLACK, hairStyle: 'bangs' }),
]

const kidsFaces = [
  faceSvg({ skin: SKIN_LIGHT, hair: HAIR_BROWN }),
  faceSvg({ skin: SKIN_MED, hair: HAIR_BLACK }),
  faceSvg({ skin: SKIN_LIGHT, hair: HAIR_BLONDE }),
  faceSvg({ skin: SKIN_LIGHT, hair: HAIR_DARK }),
]

const youngAdultFaces = [
  faceSvg({ skin: SKIN_LIGHT, hair: HAIR_BROWN }),
  faceSvg({ skin: SKIN_MED, hair: HAIR_BLACK }),
  faceSvg({ skin: SKIN_LIGHT, hair: HAIR_BLONDE }),
  faceSvg({ skin: SKIN_TAN, hair: HAIR_DARK }),
]

const adultFaces = [
  faceSvg({ skin: SKIN_MED, hair: HAIR_BROWN }),
  faceSvg({ skin: SKIN_TAN, hair: HAIR_DARK }),
  faceSvg({ skin: SKIN_LIGHT, hair: HAIR_BLACK }),
  faceSvg({ skin: SKIN_MED, hair: HAIR_BLONDE }),
]

const seniorFaces = [
  faceSvg({ skin: SKIN_SENIOR, hair: HAIR_GRAY }),
  faceSvg({ skin: '#c99a6a', hair: '#6b5344' }),
  faceSvg({ skin: SKIN_SENIOR, hair: '#8b7355' }),
  faceSvg({ skin: '#c99a6a', hair: HAIR_BROWN }),
]

export const avatarCategories: AvatarCategory[] = [
  {
    id: 'male',
    labelKey: 'profile.avatar.categoryMale',
    avatars: maleAvatars.map((url, i) => ({
      id: `male-${i}`,
      url: svgDataUrl(url),
    })),
  },
  {
    id: 'female',
    labelKey: 'profile.avatar.categoryFemale',
    avatars: femaleAvatars.map((url, i) => ({
      id: `female-${i}`,
      url: svgDataUrl(url),
    })),
  },
  {
    id: 'kids',
    labelKey: 'profile.avatar.categoryKids',
    avatars: kidsFaces.map((url, i) => ({
      id: `kids-${i}`,
      url: svgDataUrl(url),
    })),
  },
  {
    id: 'youngAdult',
    labelKey: 'profile.avatar.categoryYoungAdult',
    avatars: youngAdultFaces.map((url, i) => ({
      id: `youngAdult-${i}`,
      url: svgDataUrl(url),
    })),
  },
  {
    id: 'adult',
    labelKey: 'profile.avatar.categoryAdult',
    avatars: adultFaces.map((url, i) => ({
      id: `adult-${i}`,
      url: svgDataUrl(url),
    })),
  },
  {
    id: 'senior',
    labelKey: 'profile.avatar.categorySenior',
    avatars: seniorFaces.map((url, i) => ({
      id: `senior-${i}`,
      url: svgDataUrl(url),
    })),
  },
  {
    id: 'accessories',
    labelKey: 'profile.avatar.categoryAccessories',
    avatars: [
      { id: 'acc-glasses', url: svgDataUrl(glassesSvg()) },
      { id: 'acc-hat', url: svgDataUrl(hatSvg()) },
      { id: 'acc-hoodie', url: svgDataUrl(hoodieSvg()) },
      ...kidsFaces.slice(0, 2).map((url, i) => ({
        id: `acc-face-${i}`,
        url: svgDataUrl(url),
      })),
    ],
  },
]

export const allAvatarPresets: AvatarPreset[] = avatarCategories.flatMap(
  (cat) => cat.avatars,
)

export function getPresetById(id: string): AvatarPreset | undefined {
  return allAvatarPresets.find((a) => a.id === id)
}
