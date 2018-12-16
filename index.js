const {
  path: Path,
  datatypes: { isString },
  fs: Fs,
  escapeHtml: EscapeHtml
} = require('@vuepress/shared-utils')
const markdownIt = require('markdown-it')()

module.exports = (options, ctx) => {
  const { layoutComponentMap } = ctx
  const {
    pageEnhancers = [],
    categoryIndexPageUrl = '/category/',
    tagIndexPageUrl = '/tag/',
    postDir = '_posts',
    feedFileName = 'feed.xml',
    permalink = '/:year/:month/:day/:slug'
  } = options

  const isLayoutExists = name => layoutComponentMap[name] !== undefined
  const getLayout = (name, fallback) => isLayoutExists(name) ? name : fallback
  const isDirectChild = regularPath => Path.parse(regularPath).dir === '/'

  const enhancers = [
    {
      when: ({ regularPath }) => regularPath === categoryIndexPageUrl,
      frontmatter: { layout: getLayout('Categories', 'Page') }
    },
    {
      when: ({ regularPath }) => regularPath.startsWith('/category/'),
      frontmatter: { layout: getLayout('Category', 'Page') }
    },
    {
      when: ({ regularPath }) => regularPath === tagIndexPageUrl,
      frontmatter: { layout: getLayout('Tags', 'Page') }
    },
    {
      when: ({ regularPath }) => regularPath.startsWith('/tag/'),
      frontmatter: { layout: getLayout('Tag', 'Page') }
    },
    {
      when: ({ regularPath }) => regularPath.startsWith('/author/'),
      frontmatter: { layout: getLayout('author', 'Page') }
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
      data: { type: 'post' }
    },
    {
      when: ({ regularPath }) => {
        return regularPath.startsWith('/_drafts/') && process.env.NODE_ENV === 'production'
      },
      frontmatter: {
        layout: getLayout('NotFound'),
        permalink: '404.html'
      },
      data: { type: 'post-draft' }
    },
    {
      when: ({ regularPath }) => regularPath.startsWith(`/${postDir}/`),
      frontmatter: {
        layout: getLayout('Post', 'Page'),
        permalink: permalink
      },
      data: { type: 'post' }
    },
    ...pageEnhancers,
    {
      when: ({ regularPath }) => isDirectChild(regularPath),
      frontmatter: { layout: getLayout('page', 'Layout') },
      data: { type: 'page' }
    }
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
          Object.keys(frontmatter).forEach(key => {
            if (!rawFrontmatter[key]) {
              rawFrontmatter[key] = rawFrontmatter[key] || frontmatter[key]
            }
          })
          Object.assign(pageCtx, data)
        }
      })
    },

    /**
     * Create tag page and category page.
     */
    async ready () {
      const { pages } = ctx
      const tagMap = {}
      const categoryMap = {}
      const authorMap = {}

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
      const handleAuthor = curryHandler('author', authorMap)

      pages.forEach(({
        key,
        regularPath,
        frontmatter: {
          tag,
          tags,
          category,
          categories,
          author
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
          handleCategory(category, key)
        }
        if (Array.isArray(categories)) {
          categories.forEach(category => handleCategory(category, key))
        }
        if (isString(author)) {
          handleAuthor(author, key)
        }
      })

      ctx.tagMap = tagMap
      ctx.categoryMap = categoryMap
      ctx.authormap = authorMap

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
        })),
        ...Object.keys(authorMap).map(authorName => ({
          permalink: authorMap[authorName].path,
          meta: { authorName },
          frontmatter: { title: `${authorName}'s posts` }
        }))
      ]
      await Promise.all(extraPages.map(page => ctx.addPage(page)))
    },

    /**
     * Generate tag and category and author metadata.
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
        },
        {
          name: 'author.js',
          content: `export default ${JSON.stringify(ctx.authorMap, null, 2)}`
        }
      ]
    },

    async generated () {
      const baseURL = ctx.siteConfig.url

      const feedTemplate = (data, page) => {
        const makeItems = (post) => {
          return post.map(page => {
            const postURL = data.url + page.path
            const encodedContent = EscapeHtml(markdownIt.render(page._strippedContent)).replace(/\n/g, '')

            return `<entry>
                      <id>${postURL}</id>
                      <title>${page.title}</title>
                      <link type="text/html" rel="alternate" href="${postURL}" />
                      <summary>${page.frontmatter.subtitle}</summary>
                      <content type="html">${encodedContent}</content>
                      ${makeCategoryList(page.frontmatter.categories)}
                      <updated>${page.frontmatter.date.toISOString()}</updated>
                    </entry>\n`
          }).join('')
        }

        const makeCategoryList = (categories) => {
          return categories.map(item => {
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
        Path.resolve(ctx.outDir, feedFileName),
        feedTemplate(ctx.siteConfig, Posts)
      )

      if (Fs.existsSync(Path.resolve(ctx.sourceDir, './.blog/'))) {
        Fs.copy(Path.resolve(ctx.sourceDir, './.blog/'), ctx.outDir)
      }
    },

    enhanceAppFiles: [
      Path.resolve(__dirname, 'clientPlugin.js')
    ]
  }
}
