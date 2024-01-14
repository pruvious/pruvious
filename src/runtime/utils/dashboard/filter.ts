import { ref } from '#imports'
import type { SupportedLanguage } from '#pruvious'
import { deepClone } from '../object'
import { QueryStringParams } from './query-string-params'

export class Filter extends QueryStringParams {
  isActive = ref(false)

  updated = ref(0)

  private defaultLanguage: SupportedLanguage | null = null

  constructor(queryString?: string) {
    super()

    if (queryString) {
      this.fromString(queryString, false)
    }
  }

  fromString(queryString: string, checkUpdated = true) {
    const check = this.checkUpdated()
    super.fromString(queryString)
    this.checkActive()

    if (checkUpdated) {
      check()
    }

    return this
  }

  setDefaultLanguage(language: SupportedLanguage | null, updateWhere = false) {
    this.defaultLanguage = language

    if (updateWhere) {
      if (this.whereOption.value.$and) {
        const existing = this.whereOption.value.$and.find((rule: any) => rule.language?.$eq)

        if (existing) {
          existing.language.$eq = language
        } else {
          this.whereOption.value.$and.push({ language: { $eq: language } })
        }
      } else if (this.whereOption.value.language?.$eq) {
        this.whereOption.value.language.$eq = language
      } else {
        this.whereOption.value = { ...this.whereOption.value, language: { $eq: language } }
      }
    }

    return this.where(this.whereOption.value)
  }

  where(options: Record<string, any>) {
    const resolvedOption = deepClone(options)

    if (this.defaultLanguage) {
      if (
        Object.keys(options).length === 1 &&
        options.$and &&
        !options.$and.some((option: Record<string, any>) => option.language)
      ) {
        resolvedOption.$and.push({ language: { $eq: this.defaultLanguage } })
      } else if (Object.keys(options).length !== 1 && !options.language) {
        resolvedOption.language = { $eq: this.defaultLanguage }
      }
    }

    const check = this.checkUpdated()
    super.where(resolvedOption)
    this.checkActive()
    check()
    return this
  }

  resetWhere() {
    const check = this.checkUpdated()
    this.isActive.value = false
    super.resetWhere()

    if (this.defaultLanguage) {
      this.where({ $and: [{ language: { $eq: this.defaultLanguage } }] })
    }

    check()
    return this
  }

  clear() {
    const check = this.checkUpdated()
    this.isActive.value = false
    super.resetAll()

    if (this.defaultLanguage) {
      this.where({ $and: [{ language: { $eq: this.defaultLanguage } }] })
    }

    check()
    return this
  }

  clone() {
    return new Filter(this.toString()).setDefaultLanguage(this.defaultLanguage)
  }

  protected checkActive() {
    this.isActive.value =
      JSON.stringify(this.whereOption.value) !==
      (this.defaultLanguage
        ? JSON.stringify({ $and: [{ language: { $eq: this.defaultLanguage } }] })
        : JSON.stringify({ $and: [] }))
  }

  protected checkUpdated() {
    const prevWhere = JSON.stringify(this.whereOption.value)

    return () => {
      if (prevWhere !== JSON.stringify(this.whereOption.value)) {
        this.updated.value++
      }
    }
  }
}
