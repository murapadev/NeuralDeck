export interface UpdateInfoFile {
  url: string
  size: number
  sha512?: string
}

export interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseName?: string
  releaseNotes?: string | Array<{ version: string; note: string }>
  files?: UpdateInfoFile[]
}
