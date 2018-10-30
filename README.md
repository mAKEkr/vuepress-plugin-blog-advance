# vuepress-plugin-blog-advance

> Blog plugin for Vuepress based on default blog plugin

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