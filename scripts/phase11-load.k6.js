import http from 'k6/http';
import ws from 'k6/ws';
import exec from 'k6/execution';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const baseUrl = (__ENV.PHASE11_LOAD_BASE_URL || '').replace(/\/+$/, '');
const profile = __ENV.PHASE11_LOAD_PROFILE || 'full';
const auctionIds = csv(__ENV.PHASE11_LOAD_AUCTION_IDS) || [
  '00000000-0000-4000-8000-000000000001',
];
const buyerTokens = csv(__ENV.PHASE11_LOAD_BUYER_TOKENS);
const bidBaseAmount = Number(__ENV.PHASE11_BID_BASE_AMOUNT || 1000);
const bidWindowSeconds = Number(__ENV.PHASE11_BID_BURST_WINDOW_SECONDS || 10);
const webhookConcurrency = Number(__ENV.PHASE11_WEBHOOK_CONCURRENCY || 100);

export const wsConnections = new Counter('phase11_ws_connections');
export const wsBroadcastMs = new Trend('phase11_ws_broadcast_ms');
export const bidAttempts = new Counter('phase11_bid_attempts');
export const duplicateBids = new Counter('phase11_duplicate_bids');
export const lostBids = new Counter('phase11_lost_bids');
export const paymentWebhooks = new Counter('phase11_payment_webhooks');

export const options = profile === 'smoke' ? smokeOptions() : fullOptions();

function fullOptions() {
  return {
    scenarios: {
      mixed_workload: {
        executor: 'ramping-vus',
        exec: 'mixedWorkload',
        stages: [
          { duration: '2m', target: 1000 },
          { duration: '5m', target: 10000 },
          { duration: '10m', target: 10000 },
          { duration: '2m', target: 0 },
        ],
      },
      websocket_pressure: {
        executor: 'ramping-vus',
        exec: 'websocketPressure',
        stages: [
          { duration: '3m', target: 5000 },
          { duration: '10m', target: 5000 },
          { duration: '1m', target: 0 },
        ],
      },
      bid_burst: {
        executor: 'constant-arrival-rate',
        exec: 'bidBurst',
        rate: 100,
        timeUnit: '1s',
        duration: `${bidWindowSeconds}s`,
        preAllocatedVUs: 250,
        maxVUs: 1500,
        startTime: '7m',
      },
      payment_webhooks: {
        executor: 'constant-vus',
        exec: 'paymentWebhookPressure',
        vus: webhookConcurrency,
        duration: '30s',
        startTime: '7m',
      },
    },
    thresholds: {
      http_req_duration: ['p(95)<200'],
      http_req_failed: ['rate<0.001'],
      phase11_ws_broadcast_ms: ['p(95)<500'],
      phase11_bid_attempts: ['count>=1000'],
      phase11_duplicate_bids: ['count==0'],
      phase11_lost_bids: ['count==0'],
      phase11_ws_connections: ['count>=5000'],
      phase11_payment_webhooks: ['count>=100'],
    },
  };
}

function smokeOptions() {
  return {
    scenarios: {
      mixed_workload: {
        executor: 'constant-vus',
        exec: 'mixedWorkload',
        vus: 5,
        duration: '10s',
      },
      websocket_pressure: {
        executor: 'constant-vus',
        exec: 'websocketPressure',
        vus: 2,
        duration: '10s',
      },
      bid_burst: {
        executor: 'constant-arrival-rate',
        exec: 'bidBurst',
        rate: 2,
        timeUnit: '5s',
        duration: '5s',
        preAllocatedVUs: 2,
        maxVUs: 5,
      },
      payment_webhooks: {
        executor: 'constant-vus',
        exec: 'paymentWebhookPressure',
        vus: 2,
        duration: '5s',
      },
    },
  };
}

export function mixedWorkload() {
  const pick = (exec.vu.iterationInScenario + exec.vu.idInTest) % 100;
  const auctionId = pickOne(auctionIds);

  if (pick < 35) {
    http.get(`${baseUrl}/auctions?page=1&limit=20`);
  } else if (pick < 55) {
    http.get(`${baseUrl}/products/search?q=auction&page=1&limit=20`);
  } else if (pick < 75) {
    http.get(`${baseUrl}/auctions/search?q=auction&page=1&limit=20`);
  } else if (pick < 90) {
    http.get(`${baseUrl}/auctions/${auctionId}`);
  } else {
    http.get(`${baseUrl}/health`);
  }

  sleep(1);
}

export function websocketPressure() {
  const auctionId = pickOne(auctionIds);
  const wsUrl = socketIoUrl(baseUrl);
  const start = Date.now();

  ws.connect(wsUrl, {}, (socket) => {
    socket.on('open', () => {
      wsConnections.add(1);
    });

    socket.on('message', (message) => {
      if (message === '2') {
        socket.send('3');
        return;
      }
      if (String(message).startsWith('0')) {
        socket.send('40/auction,');
        return;
      }
      if (String(message).startsWith('40/auction')) {
        socket.send(
          `42/auction,["auction:join",{"auctionId":"${auctionId}"}]`,
        );
        return;
      }
      if (String(message).includes('auction:joined')) {
        wsBroadcastMs.add(Date.now() - start);
      }
    });

    socket.setTimeout(() => {
      socket.close();
    }, profile === 'smoke' ? 5000 : 600000);
  });
}

export function bidBurst() {
  bidAttempts.add(1);
  const auctionId = pickOne(auctionIds);
  const token = pickOne(buyerTokens);
  const amount =
    bidBaseAmount + exec.scenario.iterationInTest + exec.vu.idInTest;
  const response = http.post(
    `${baseUrl}/auctions/${auctionId}/bids`,
    JSON.stringify({ amount }),
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  const accepted = check(response, {
    'bid accepted': (res) => res.status >= 200 && res.status < 300,
  });
  const body = response.body || '';
  if (response.status === 409 || body.includes('DUPLICATE')) {
    duplicateBids.add(1);
  }
  if (!accepted) {
    lostBids.add(1);
  }
}

export function paymentWebhookPressure() {
  paymentWebhooks.add(1);
  const id = `${exec.vu.idInTest}-${exec.vu.iterationInScenario}`;
  http.post(
    `${baseUrl}/payments/iyzico/webhook`,
    JSON.stringify({
      eventKey: `phase11-${Date.now()}-${id}`,
      token: `phase11-token-${id}`,
      paymentId: `phase11-payment-${id}`,
      status: 'success',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  sleep(1);
}

function csv(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickOne(items) {
  if (!items.length) return '';
  return items[(exec.vu.idInTest + exec.vu.iterationInScenario) % items.length];
}

function socketIoUrl(url) {
  const converted = url.startsWith('https://')
    ? url.replace('https://', 'wss://')
    : url.replace('http://', 'ws://');
  return `${converted}/socket.io/?EIO=4&transport=websocket`;
}
