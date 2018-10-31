const {
  path: Path,
  datatypes: { isString },
  fs: Fs
} = require('@vuepress/shared-utils')

module.exports = (options, ctx) => {
  const { layoutComponentMap } = ctx
  const {
    pageEnhancers = [],
    categoryIndexPageUrl = '/category/',
    tagIndexPageUrl = '/tag/'
  } = options

  const isLayoutExists = name => layoutComponentMap[name] !== undefined
  const getLayout = (name, fallback) => isLayoutExists(name) ? name : fallback
  const isDirectChild = regularPath => Path.parse(regularPath).dir === '/'

  const enhancers = [
    {
      when: ({ regularPath }) => isDirectChild(regularPath),
      data: { type: 'page' }
    },
    {
      when: ({ regularPath }) => regularPath.startsWith('/category/'),
      frontmatter: { layout: getLayout('Category', 'Page') }
    },
    {
      when: ({ regularPath }) => regularPath === categoryIndexPageUrl,
      frontmatter: { layout: getLayout('Categories', 'Page') }
    },
    {
      when: ({ regularPath }) => regularPath.startsWith('/tag/'),
      frontmatter: { layout: getLayout('Tag', 'Page') }
    },
    {
      when: ({ regularPath }) => regularPath === tagIndexPageUrl,
      frontmatter: { layout: getLayout('Tags', 'Page') }
    },
    {
      when: ({ regularPath }) => regularPath === '/',
      frontmatter: { layout: getLayout('Layout') }
    },
    {
      when: ({ regularPath }) => {
        return regularPath.startsWith('/_drafts/') && process.env.NODE_ENV !== 'production'
      },
      frontmatter: {
        layout: getLayout('Post', 'Page')
      },
      data: { type: 'post-draft' }
    },
    {
      when: ({ regularPath }) => {
        return regularPath.startsWith('/_drafts/') && process.env.NODE_ENV === 'production'
      },
      frontmatter: {
        layout: getLayout('NotFound')
      },
      data: { type: 'post-draft' }
    },
    {
      when: ({ regularPath }) => regularPath.startsWith('/_posts/'),
      frontmatter: {
        layout: getLayout('Post', 'Page'),
        permalink: '/:year/:month/:day/:slug'
      },
      data: { type: 'post' }
    },
    ...pageEnhancers
  ]

  return {
    /**
     * Modify page's metadata according to the habits of blog users.
     */
    extendPageData (pageCtx) {
      const { frontmatter: rawFrontmatter } = pageCtx

      enhancers.forEach(({
        when,
        data = {},
        frontmatter = {}
      }) => {
        if (when(pageCtx)) {
          Object.assign(rawFrontmatter, frontmatter)
          Object.assign(pageCtx, data)
        }
      })
    },

    /**
     * Create tag page and category page.
     */
    ready () {
      const { pages } = ctx
      const tagMap = {}
      const categoryMap = {}

      const curryHandler = (scope, map) => (key, pageKey) => {
        if (key) {
          if (!map[key]) {
            map[key] = {}
            map[key].path = `/${scope}/${key}.html`
            map[key].pageKeys = []
          }
          map[key].pageKeys.push(pageKey)
        }
      }

      const handleTag = curryHandler('tag', tagMap)
      const handleCategory = curryHandler('category', categoryMap)

      pages.forEach(({
        key,
        regularPath,
        frontmatter: {
          tag,
          tags,
          category,
          categories
        }
      }) => {
        if (regularPath.startsWith('/_drafts/')) return false

        if (isString(tag)) {
          handleTag(tag, key)
        }
        if (Array.isArray(tags)) {
          tags.forEach(tag => handleTag(tag, key))
        }
        if (isString(category)) {
          handleCategory(categories, key)
        }
        if (Array.isArray(categories)) {
          categories.forEach(category => handleCategory(category, key))
        }
      })

      ctx.tagMap = tagMap
      ctx.categoryMap = categoryMap

      const extraPages = [
        {
          permalink: tagIndexPageUrl,
          frontmatter: { title: `Tags` }
        },
        {
          permalink: categoryIndexPageUrl,
          frontmatter: { title: `Categories` }
        },
        ...Object.keys(tagMap).map(tagName => ({
          permalink: tagMap[tagName].path,
          meta: { tagName },
          frontmatter: { title: `${tagName} | Tag` }
        })),
        ...Object.keys(categoryMap).map(categoryName => ({
          permalink: categoryMap[categoryName].path,
          meta: { categoryName },
          frontmatter: { title: `${categoryName} | Category` }
        }))
      ]
      extraPages.forEach(page => ctx.addPage(page))
    },

    /**
     * Generate tag and category metadata.
     */
    async clientDynamicModules () {
      return [
        {
          name: 'tag.js',
          content: `export default ${JSON.stringify(ctx.tagMap, null, 2)}`
        },
        {
          name: 'category.js',
          content: `export default ${JSON.stringify(ctx.categoryMap, null, 2)}`
        }
      ]
    },

    async generated () {
      const baseURL = ctx.siteConfig.url

      const feedTemplate = (data, page) => {
        const makeItems = (post) => {
          return post.map((page) => {
            return `<entry>
                      <id>${data.url + page.path}</id>
                      <title>${page.title}</title>
                      <summary>${page.frontmatter.subtitle}</summary>
                      <link href="${data.url + page.path}" />
                      ${makeCategoryList(page.frontmatter.categories)}
                      <updated>${page.frontmatter.date.toISOString()}</updated>
                    </entry>\n`
          }).join('')
        }

        const makeCategoryList = (categories) => {
          return categories.map((item) => {
            return `<category term="${item}" />`
          }).join('')
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
                <feed xmlns="http://www.w3.org/2005/Atom">
                  <id>${data.url + data.base}</id>
                  <title>${data.title}</title>
                  <author>
                    <name>${data.author}</name>
                  </author>
                  <link href="${data.url}/feed.xml" rel="self" type="application/atom+xml" />
                  <updated>${new Date().toISOString()}</updated>
                  <generator uri="https://github.com/mAKEkr/vuepress-plugin-blog-advance">
                    vuepress-plugin-blog-advance
                  </generator>

                  ${makeItems(page)}
                </feed>`
      }

      const Posts = ctx.pages.filter(page => {
        return page.hasOwnProperty('type') && page.type === 'post'
      }).sort((a, b) => {
        // sort by ASC
        if (a.frontmatter.date > b.frontmatter.date) {
          return -1
        } else if (a.frontmatter.date < b.frontmatter.date) {
          return 1
        } else {
          return 0
        }
      }).slice(0, 19)

      Fs.writeFileSync(
        Path.resolve(ctx.outDir, 'feed.xml'),
        feedTemplate(ctx.siteConfig, Posts)
      )
    },

    enhanceAppFiles: [
      Path.resolve(__dirname, 'clientPlugin.js')
    ]
  }
}
