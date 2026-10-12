import { buildApp } from './app.js'
import { getApiConfig } from './config.js'

const app = buildApp()
const { host, port } = getApiConfig()

async function shutdown(signal: string) {
  app.log.info({ signal }, 'Shutting down Headway API')
  await app.close()
  process.exit(0)
}

process.once('SIGINT', () => { void shutdown('SIGINT') })
process.once('SIGTERM', () => { void shutdown('SIGTERM') })

try {
  await app.listen({ host, port })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
