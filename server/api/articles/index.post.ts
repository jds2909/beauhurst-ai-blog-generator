import { ArticleUploadError, generateSavedArticle } from '../../utils/article-generation'

let activeGenerations = 0
const maxConcurrentGenerations = 2

export default defineEventHandler(async (event) => {
  const busy = 'Article generation is busy. Please try again in a moment.'
  if (activeGenerations >= maxConcurrentGenerations) {
    setResponseHeader(event, 'Retry-After', '15')
    throw createError({ statusCode: 429, statusMessage: busy, data: { message: busy } })
  }

  activeGenerations++
  try {
    // Keep the connection open long enough to send a 413 if a streamed body exceeds the limit.
    const request = event.node.req
    const result = await generateSavedArticle({
      contentType: getRequestHeader(event, 'content-type'),
      contentLength: getRequestHeader(event, 'content-length'),
      encodedIndustry: getRequestHeader(event, 'x-article-industry'),
      body: { [Symbol.asyncIterator]: () => request.iterator({ destroyOnReturn: false }) },
    }, useRuntimeConfig(event))

    setResponseStatus(event, 201)
    setResponseHeader(event, 'Location', result.url)
    return result
  } catch (error) {
    if (error instanceof ArticleUploadError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: 'Article generation failed',
        data: { message: error.message },
      })
    }
    throw createError({ statusCode: 500, statusMessage: 'Article generation failed' })
  } finally {
    activeGenerations--
  }
})
