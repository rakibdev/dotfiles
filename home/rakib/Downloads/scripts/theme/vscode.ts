import { readdir } from 'node:fs/promises'

const vscodeDir = Bun.env.HOME + '/.vscode-insiders/extensions/'
const targetExtension = (await readdir(vscodeDir)).find(dir => dir.includes('material-code'))
const extensionDir = vscodeDir + targetExtension + '/build'

// I'm using custom color generator, not Pywal.
const colorGeneratorFile = Bun.env.HOME + '/.config/system-ui/app-data.json'
const { theme: systemTheme } = await Bun.file(colorGeneratorFile).json()

const systemColors = {
  neutral_20: systemTheme.neutral_20,
  neutral_40: systemTheme.neutral_40,
  neutral_80: systemTheme.neutral_80,
  primary_20: systemTheme.primary_20,
  primary_40: systemTheme.primary_40,
  primary_80: systemTheme.primary_80,
  primary_surface: systemTheme.primary_surface,
  primary_surface_2: systemTheme.primary_surface_2,
  primary_surface_3: systemTheme.primary_surface_3,
  primary_surface_4: systemTheme.primary_surface_4
}

const { createTheme, createMaterialColors } = await import(extensionDir + '/theme.js')
const materialColors = createMaterialColors()
const theme = createTheme({ ...materialColors, ...systemColors })

const extensionThemeFile = Bun.file(extensionDir + '/theme.json')
const extensionTheme = await extensionThemeFile.json()
// Updating editor theme only, not syntax. Leave it to the extension.
extensionTheme.colors = theme.colors

await Bun.write(extensionThemeFile, JSON.stringify(extensionTheme))
