const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

export type SemverParts = [number, number, number]

export function parseSemver(version: string | null | undefined): SemverParts {
  if (!version) return [0, 0, 0]
  const match = SEMVER_RE.exec(version.trim())
  if (!match) return [0, 0, 0]
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function compareSemver(a: string | null | undefined, b: string | null | undefined): number {
  const [aMajor, aMinor, aPatch] = parseSemver(a)
  const [bMajor, bMinor, bPatch] = parseSemver(b)

  if (aMajor !== bMajor) return aMajor > bMajor ? 1 : -1
  if (aMinor !== bMinor) return aMinor > bMinor ? 1 : -1
  if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1
  return 0
}
