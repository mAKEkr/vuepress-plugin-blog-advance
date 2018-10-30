# vuepress-plugin-blog-advance

> Blog plugin for Vuepress.

## Feature
- Support Blog
- Minor fix on official Blog Plugin.
  - fix custom layout problem
  - add `_drafts` folder work(and do not find draft posts on category, tag page) 
- support Atom Feed

## Usage

```javascript
module.exports = {
  plugins: ['vuepress-plugin-blog-advance'] 
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

### feedFileName

- Type: `string`
- Default: `feed.xml`

set Atom feed file filename. please set extension both.

### author

- Type: `string`
- Default: `none`

set default author on posts.

## Future support
- Support Multi-author blogging(and add author page)
