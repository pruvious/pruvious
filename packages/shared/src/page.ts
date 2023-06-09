import { camelToLabel, sortNaturalByProp } from '@pruvious/utils'
import { Choice, Pages } from './types'

export function getPageTypeChoices(pageConfig: Pages): Choice[] {
  const types: Choice[] = []

  if (pageConfig.types) {
    Object.entries(pageConfig.types).forEach(([value, type]) => {
      types.push({ value, label: type.label || camelToLabel(value) })
    })
  }

  if (!types.some((type) => type.value === 'default')) {
    types.unshift({ value: 'default', label: 'Default' })
  }

  return sortNaturalByProp(types, 'label')
}

export function getPageTypes(pageConfig: Pages): string[] {
  return getPageTypeChoices(pageConfig).map((choice) => choice.value)
}

export function getPageLayoutChoices(pageConfig: Pages): Choice[] {
  const layouts: Choice[] = []

  if (pageConfig.types) {
    Object.entries(pageConfig.types).forEach(([_, type]) => {
      if (type.layouts) {
        Object.entries(type.layouts).forEach(([value, layout]) => {
          if (!layouts.some((choice) => choice.value === value)) {
            layouts.push({ value, label: layout.label || camelToLabel(value) })
          }
        })
      }
    })
  }

  if (!layouts.some((layout) => layout.value === 'default')) {
    layouts.unshift({ value: 'default', label: 'Default' })
  }

  return sortNaturalByProp(layouts, 'label')
}

export function getPageLayouts(pageConfig: Pages): string[] {
  return getPageLayoutChoices(pageConfig).map((choice) => choice.value)
}

export function getPageLayoutChoicesByType(type: string, pageConfig: Pages): Choice[] {
  const layouts: Choice[] = []

  if (pageConfig.types && pageConfig.types[type] && pageConfig.types[type].layouts) {
    Object.entries(pageConfig.types[type].layouts!).map(([value, layout]) => {
      layouts.push({ value, label: layout.label || camelToLabel(value) })
    })

    if (!layouts.length) {
      layouts.push({ value: 'default', label: 'Default' })
    }

    sortNaturalByProp(layouts, 'label')
  } else {
    layouts.push({ value: 'default', label: 'Default' })
  }

  return layouts
}

export function getPageLayoutsByType(type: string, pageConfig: Pages): string[] {
  return getPageLayoutChoicesByType(type, pageConfig).map((choice) => choice.value)
}
