# Architecture Research — Endemigo

## System Overview

```
┌─────────────────────────────────────────────┐
│                  CLIENTS                     │
├──────────────┬───────────────┬───────────────┤
│ Mobile App   │ Admin Panel   │ endemigo.com  │
│ (Expo/RN)    │ (Vue.js SPA)  │ (mevcut)      │
└──────┬───────┴───────┬───────┴───────┬───────┘
       │               │               │
       ▼               ▼               ▼
┌─────────────────────────────────────────────┐
│          NGINX (Reverse Proxy / SSL)         │
└──────────────────┬──────────────────────────┘
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
 ┌────────┐ ┌───────────┐ ┌────────┐
 │REST API│ │ WebSocket │ │ Static │
 │(NestJS)│ │(Socket.IO)│ │ Files  │
 └───┬────┘ └─────┬─────┘ └────────┘
     └──────┬─────┘
            ▼
┌─────────────────────────────────────────────┐
│           NestJS Application                 │
├─────────────────────────────────────────────┤
│ Auth │ User │ Seller │ Product │ Auction    │
│ Bid  │ Order│ Payment│ Wallet  │ Search     │
│ Notification │ Campaign │ Ads │ AskPrice   │
│ Trust │ Admin │ Common (guards, pipes)      │
└──────┬──────────┬──────────┬────────────────┘
       ▼          ▼          ▼
  ┌─────────┐ ┌───────┐ ┌────────┐
  │PostgreSQL│ │ Redis │ │CDN / S3│
  │ (Data)   │ │(Cache)│ │(Media) │
  └─────────┘ └───────┘ └────────┘
```

## Component Boundaries

### Mobile App (React Native / Expo)
- UI rendering, local state, API calls, push notification
- `screens/` `components/` `services/` `hooks/` `store/` `navigation/`

### Backend (NestJS)
- Business logic, validation, authorization, integrations
- Module per domain: auth/, users/, sellers/, products/, auctions/, bids/, orders/, payments/, wallet/, notifications/, search/, campaigns/, ads/, ask-price/, trust/, admin/, common/

### Admin Panel (Vue.js)
- Platform management, monitoring, reporting
- `views/` `components/` `store/` `services/` `router/`

## Critical Data Flows

### Müzayede Teklif Akışı
```
Client → Socket.IO "place_bid"
→ Server validates (auth, active, bid > current, balance)
→ PostgreSQL transaction (SELECT FOR UPDATE + INSERT + UPDATE)
→ Redis: update cached price
→ Redis Pub/Sub → broadcast to all room clients
→ BullMQ: push notification to outbid users
```

### Escrow Ödeme Akışı
```
Winner → Order created (payment_pending)
→ Wallet balance block
→ PayTR/İyzico payment → webhook callback
→ Order: preparing → shipped → delivered
→ Buyer confirms (or auto-confirm timer)
→ Escrow release → Seller wallet credited (minus commission)
```

### Fiyat Sor Akışı
```
Buyer "Fiyat Sor" → private channel created
→ Messaging (system-monitored)
→ Seller sends price → formal offer
→ Buyer accepts → escrow flow starts
```

## Build Order (Dependencies)
```
1. Foundation (Auth, DB, CI/CD)
2. User & Seller Management
3. Product & Category
4. Search & Discovery
5. Auction Engine (core)
6. Wallet & Payment
7. Order Management
8. Notifications
9. Fiyat Sor & Messaging
10. Campaign & Ads
11. Admin Panel
12. Integration, Testing, Launch
```
