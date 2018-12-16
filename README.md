# vuepress-plugin-blog-advance

> Blog plugin for Vuepress.

## Feature
- Support Blog
- Minor fix on official Blog Plugin.
  - fix custom layout problem
  - add `_drafts` folder work(and do not find draft posts on category, tag page) 
- support Atom Feed
- support additional file copy on compile process

## Usage

```javascript
module.exports = {
  plugins: ['vuepress-plugin-blog-advance', {
    options
  }]
}
```

## Options

### pageEnhancers

- Type: `function`
- Default: `/i18n/`

### categoryIndexPageUrl

- Type: `string`
- Default: `/category/`

### tagIndexPageUrl

- Type: `string`
- Default: `/tag/`

### postDir

- Type: `string`
- Default: `_posts`

### feedFileName

- Type: `string`
- Default: `feed.xml`

set Atom feed file filename. please set extension both.

### permalink

- Type: `string`
- Default: `/:year/:month/:day/:slug`

if want find more some information about permalink config, find on [Vuepress official documentation](https://vuepress.vuejs.org/guide/permalinks.html#permalinks-2)