import fs from 'node:fs'

for (const dir of ['packages/pruvious/.nuxt', 'packages/pruvious/.pruvious', 'packages/ui/.nuxt']) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true })
  }
}
