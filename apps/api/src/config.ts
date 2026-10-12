import 'dotenv/config'

export type ApiConfig = {
  host: string
  port: number
}

export function getApiConfig(environment = process.env): ApiConfig {
  const port = Number(environment.PORT ?? 3001)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port')

  return { host: environment.HOST ?? '127.0.0.1', port }
}
