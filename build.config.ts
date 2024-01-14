import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: ['#pruvious', 'sharp', 'vue/compiler-sfc'],
})
