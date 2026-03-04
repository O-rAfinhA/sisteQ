import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 20,
  duration: '60s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
}

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'

  const health = http.get(`${baseUrl}/api/health`)
  check(health, {
    'health 200/503': r => r.status === 200 || r.status === 503,
  })

  const home = http.get(`${baseUrl}/`)
  check(home, {
    'home 200/3xx': r => r.status === 200 || (r.status >= 300 && r.status < 400),
  })

  sleep(1)
}
