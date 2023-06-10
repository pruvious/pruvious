<template></template>

<script setup>
import { fetchLanguages, fetchSettings, useHead, usePruvious } from '#imports'

const pruvious = usePruvious()
const { defaultLanguage, languages } = await fetchLanguages()
const {
  baseTitle,
  baseTitlePosition,
  favicon,
  logo,
  metaTags,
  scripts,
  sharingImage,
  socialMediaMeta,
  titleSeparator,
  visible,
} = await fetchSettings('seo', pruvious.value.page?.language ?? defaultLanguage)
const htmlAttrs = {}
const title = pruvious.value.page?.baseTitle
  ? pruvious.value.page?.title
    ? baseTitlePosition === 'left'
      ? baseTitle + titleSeparator + pruvious.value.page.title
      : pruvious.value.page.title + titleSeparator + baseTitle
    : baseTitle
  : pruvious.value.page?.title ?? ''
const meta = {}
const script = []
const link = []

if (sharingImage || pruvious.value.page?.sharingImage) {
  const imageURL =
    pruvious.value.page?.sharingImage?.sources[0]?.url ??
    pruvious.value.page?.sharingImage?.url ??
    sharingImage?.sources[0]?.url ??
    sharingImage?.url ??
    ''

  meta['og:image'] = imageURL
  meta['twitter:image'] = imageURL
}

if (socialMediaMeta) {
  meta['og:title'] = title
  meta['twitter:title'] = title
  meta['og:type'] = 'website'
  meta['twitter:card'] = 'summary_large_image'
}

for (const metaTag of metaTags) {
  meta[metaTag.name] = metaTag.content
}

if (
  !visible ||
  (pruvious.value.page && (!pruvious.value.page.public || !pruvious.value.page.visible))
) {
  meta.robots = 'noindex, nofollow'
}

if (pruvious.value.page) {
  if (pruvious.value.page.language) {
    htmlAttrs.lang = pruvious.value.page.language
  }

  if (pruvious.value.page.url) {
    for (const language of languages) {
      const url =
        pruvious.value.page.language === language.code
          ? pruvious.value.page.url
          : pruvious.value.page.translations && pruvious.value.page.translations[language.code]
          ? pruvious.value.page.translations[language.code].url
          : null

      if (url) {
        link.push({ rel: 'alternate', hreflang: language.code, href: url })
      }
    }

    const defaultLanguageURL =
      pruvious.value.page.language === defaultLanguage
        ? pruvious.value.page.url
        : pruvious.value.page.translations && pruvious.value.page.translations[defaultLanguage]
        ? pruvious.value.page.translations[defaultLanguage].url
        : null

    if (defaultLanguageURL) {
      link.push({ rel: 'alternate', hreflang: 'x-default', href: defaultLanguageURL })
    }
  }

  if (socialMediaMeta) {
    if (pruvious.value.page.description) {
      meta.description = pruvious.value.page.description
      meta['og:description'] = pruvious.value.page.description
      meta['twitter:description'] = pruvious.value.page.description
    }

    meta['og:url'] = pruvious.value.page.url
  }

  if (pruvious.value.page.metaTags) {
    for (const metaTag of pruvious.value.page.metaTags) {
      meta[metaTag.name] = metaTag.content
    }
  }

  if (logo) {
    script.push({
      tagPosition: 'head',
      type: 'application/ld+json',
      innerHTML: `{"@context":"https://schema.org","@type":"Organization","url":"${
        new URL(pruvious.value.page.url).origin
      }/","logo":"${logo.url}"}`,
    })
  }
}

if (scripts) {
  for (const _script of scripts) {
    const item = { tagPosition: _script.position }

    if (_script.kind === 'external') {
      item.src = _script.url
    } else {
      item.innerHTML = _script.js
    }

    script.push(item)
  }
}

if (favicon) {
  link.push(
    { rel: 'icon', type: 'image/svg+xml', href: favicon.url },
    { rel: 'icon', type: 'image/png', href: favicon.sources[0].url },
  )
}

useHead({
  htmlAttrs,
  title,
  meta: Object.entries(meta).map(([name, content]) =>
    name.startsWith('og:') || name.startsWith('twitter:')
      ? { property: name, content }
      : { name, content },
  ),
  script,
  link,
})
</script>
