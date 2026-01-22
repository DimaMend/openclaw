# ProphetX Market Maker API - Expert Reference

ProphetX is a sports prediction market. This is the complete API reference for the Market Maker (MM) API.

## Quick Links
- **Swagger Docs:** https://partner-docs-ss-sandbox.betprophet.co/swagger/mm/index.html
- **GitHub Example:** https://github.com/betprophet1/mm-api-integration-guide
- **Medium Guide:** https://medium.com/@ProphetXServiceAPI
- **API Status Page:** https://ss-sandbox.betprophet.co/api-status?currency=cash
- **Contact:** doug.myers@betprophet.co or hello@betprophet.co

## Getting Started

### 1. Register for Sandbox
1. Go to https://ss-sandbox.betprophet.co/register
2. Use correct phone number (2FA required even in sandbox)
3. Contact doug.myers@betprophet.co to:
   - Enable API access on your account
   - Add testing funds

### 2. Generate API Tokens
1. Login to https://ss-sandbox.betprophet.co/
2. Click top-right toggle → Prophet Cash side
3. Click "API integration" in dropdown
4. Click "Create a new token"

**Note:** Multiple tokens can be created for different integrations. Revoke one without affecting others.

## Base URLs
| Environment | API Base URL | Swagger Docs |
|-------------|--------------|--------------|
| **Sandbox** | `https://api-ss-sandbox.betprophet.co/partner` | https://partner-docs-ss-sandbox.betprophet.co/swagger/mm/index.html |
| **Production** | `https://cash.api.prophetx.co/partner` | https://partner-docs.prophetx.co/swagger/mm/index.html |

## Switching to Production
1. Create a **production account** on ProphetX
2. Generate **new access/secret keys** for production
3. Update `BASE_URL` to production URL
4. Update API keys in your config
5. Test thoroughly before going live

---

## Integration Steps Overview

| Step | Endpoint | Purpose |
|------|----------|---------|
| 1 | `POST /auth/login` | Exchange API keys for session tokens |
| 2 | `GET /mm/get_balance` | Check wallet balance (optional) |
| 3 | `GET /mm/get_tournaments` | Get list of tournaments |
| 3b | `GET /mm/get_sport_events` | Get events for a tournament |
| 3c | `GET /mm/get_multiple_markets` | Get markets for events |
| 4 | `POST /mm/pusher` | Subscribe to WebSocket updates |
| 5 | `POST /mm/place_wager` | Place plays! |

---

## Authentication

### Login
```
POST /auth/login
```
**Request:**
```json
{
  "access_key": "your_access_key",
  "secret_key": "your_secret_key"
}
```
**Response:**
```json
{
  "data": {
    "access_token": "JWT_TOKEN",
    "refresh_token": "REFRESH_TOKEN",
    "access_expire_time": 1234567890,
    "refresh_expire_time": 1234567890
  }
}
```
- Access token expires in **20 minutes**
- Refresh token valid for **3 days**
- Use refresh token to get new access token before expiry

### Refresh Session
```
POST /auth/refresh
```
**Request:**
```json
{
  "refresh_token": "your_refresh_token"
}
```

### Authorization Header
All authenticated endpoints require:
```
Authorization: Bearer {access_token}
```

---

## Core Endpoints

### Tournaments
```
GET /mm/get_tournaments?has_active_events=true
```
**Known Tournament IDs:**
| ID | Name |
|----|------|
| 109 | MLB |
| 2541 | KBO League |
| 1036 | Professional Baseball |
| 233 | NFL Preseason |
| 31 | NFL |
| 234 | NHL |
| 132 | NBA |

### Sport Events
```
GET /mm/get_sport_events?tournament_id={id}
GET /mm/get_sport_events?event_ids=1,2,3
```
**Response fields:** event_id, name, display_name, competitors, scheduled, status, tournament_id, tournament_name

### Markets
```
GET /mm/get_markets?event_id={id}                    # DEPRECATED
GET /v2/mm/get_markets?event_id={id}                 # Use this (adds category_name, sub_type)
GET /mm/get_multiple_markets?event_ids=1,2,3         # DEPRECATED
GET /v2/mm/get_multiple_markets?event_ids=1,2,3      # Batch fetch markets
GET /mm/search_markets?tournament_id={id}            # Search with filters
```
**Market types:** `moneyline`, `spread`, `total`, `sup_moneyline`

### Players
```
GET /mm/get_players?tournament_id={id}
GET /mm/get_players/{player_id}?tournament_id={id}
```

---

## Wallet

### Get Balance
```
GET /mm/get_balance
```
**Response:**
```json
{
  "data": {
    "balance": 1000.00,
    "matched_wager_balance": 500.00,
    "unmatched_wager_balance": 200.00,
    "unmatched_wager_balance_status": "active",
    "unmatched_wager_last_synced_at": "2024-01-01T00:00:00Z"
  }
}
```

### Transaction History
```
GET /v2/mm/get_transactions?from={timestamp}&to={timestamp}&limit=100
```
**Transaction types:** BET, DEPOSIT, REFUND, PAY, WITHDRAW, COMMISSION, ADJUSTMENT_REDUCE, ADJUSTMENT_INCREASE, VOID, REJECT_WITHDRAW, APPROVE_WITHDRAW, CANCEL, PUSH

---

## Placing Wagers (Plays)

### Get Odds Ladder
```
GET /mm/get_odds_ladder
```
Returns array of valid American odds (-10000 to +10000 in specific increments).
**Important:** Only wagers with odds from the ladder are accepted!

### Place Single Wager
```
POST /mm/place_wager
```
**Request:**
```json
{
  "external_id": "unique_id_from_your_system",
  "line_id": "selection_line_id",
  "odds": 150,
  "stake": 100.00,
  "wager_strategy": "fillOrKill"  // optional - auto-cancel if not matched in 2 sec
}
```
**Notes:**
- `external_id`: max 100 chars, only A-z, 0-9, _, -
- `external_id`: **MUST be unique per wager** - duplicates are rejected (prevents fat-finger errors)
- `external_id`: **Required for cancellation** - save it!
- `odds`: must be from odds ladder
- `stake`: max 100,000,000
- `wager_strategy`: optional "fillOrKill" for immediate-or-cancel

### Place Multiple Wagers (Batch)
```
POST /mm/place_multiple_wagers
```
**Request:**
```json
{
  "data": [
    { "external_id": "id1", "line_id": "line1", "odds": 150, "stake": 100 },
    { "external_id": "id2", "line_id": "line2", "odds": -110, "stake": 50 }
  ]
}
```
**Max batch size:** 20 wagers

---

## Cancelling Wagers

### Cancel Single Wager
```
POST /mm/cancel_wager
```
```json
{
  "wager_id": "wager_id_from_system",
  "external_id": "your_external_id"  // must match
}
```

### Cancel Multiple Wagers
```
POST /mm/cancel_multiple_wagers
```
```json
{
  "data": [
    { "wager_id": "id1", "external_id": "ext1" },
    { "wager_id": "id2", "external_id": "ext2" }
  ]
}
```

### Cancel All Wagers (Panic Button)
```
POST /mm/cancel_all_wagers
```
Cancels ALL open wagers for the user.

### Cancel by Event
```
POST /mm/cancel_wagers_by_event
```
```json
{ "event_id": 12345 }
```

### Cancel by Market
```
POST /mm/cancel_wagers_by_market
```
```json
{
  "event_id": 12345,
  "market_id": 67890,
  "line_id": "optional_line_id"
}
```

---

## Wager History & Status

### Get Wager by ID
```
GET /mm/get_wager/{wager_id}
```

### Wager History
```
GET /v2/mm/get_wager_histories?from={ts}&to={ts}&limit=100
```
**Filters:** matching_status, status, market_id, event_id
**Matching statuses:** `unmatched`, `fully_matched`, `partially_matched`
**Statuses:** `void`, `closed`, `canceled`, `manually_settled`, `inactive`, `wiped`, `open`, `invalid`, `settled`

### Get Matched Bets
```
GET /mm/get_matched_bets?from={ts}&to={ts}&limit=100
```

### Get Wager Matching Detail
```
GET /mm/get_wager_matching_detail?wager_ids=id1,id2
GET /v2/mm/get_wager_matching_detail?wager_id={id}  # Paginated
```

---

## WebSocket (Real-time Updates)

### Get Connection Config
```
GET /websocket/connection-config
```
Returns Pusher credentials (key, cluster, app_id).

**Best Practice:** Refresh connection config every **30 minutes**. If config changed (rare - cluster migration), update your connection.

### Register Pusher
```
POST /mm/pusher
```
```json
{
  "socket_id": "pusher_socket_id",
  "subscriptions": [
    { "type": "tournament", "ids": ["132", "31"] }
  ]
}
```

### WebSocket Channels
- **Public/Broadcast:** Tournament updates, market changes, health_check
- **Private:** Your wager updates, balance changes, play confirmations

### Subscription Types
- `tournament` - Subscribe to specific tournament IDs
- Events are base64 encoded in the payload

### Broadcast Topics
| Topic | Description |
|-------|-------------|
| `market_selection` | Order book updates, liquidity changes |
| `matched_bet` | Real-time matching (odds, amount matched) |
| `health_check` | Heartbeat every 5 seconds |

### Private Topics
| Topic | Description |
|-------|-------------|
| Play activation | Confirms if play was activated or failed |
| Play cancellation | Confirms which plays were canceled |
| Matching updates | Your wager matches (ID, amount, odds) |

---

## WebSocket Use Cases & Best Practices

### 1. Play Activation Confirmation
- Plays use **FIFO queues** for activation
- After placing via REST, save the `wager_id`
- Receive confirmation on **private channel** (success or failure)
- **Most common failure:** Insufficient wallet balance

### 2. Safety Protection (10-Second Rule)
If no activation message received within **10 seconds**:
1. Assume WebSocket disconnection or lost message
2. Reconnect WebSocket
3. Call `GET /mm/get_wager/{wager_id}` to check play status

### 3. Play Cancellation Confirmation
- Successful cancel → `200` response (plays can't be matched anymore)
- Confirmation sent via **private WebSocket** with canceled play details
- Canceling already-canceled play → `400` error

### 4. Order Book Real-Time Construction
1. Subscribe to `market_selection` on broadcast channel
2. Track matching via `matched_bet` topic
3. **Every 15 minutes:** Call REST API `mm/get_markets` or `mm/get_multiple_markets`
4. Compare REST data with WebSocket-constructed book to catch missed messages

**When liquidity changes:**
- Could mean play was canceled OR matched
- If matched → `matched_bet` message sent with odds + amount

### 5. Real-Time Risk Control
- Matching updates pushed to **private channel**
- Includes: wager ID, amount matched, matched odds
- Use this to **rebalance your book** and minimize exposure in real-time

### 6. Ensure WebSocket Connectivity
| Signal | Action |
|--------|--------|
| `disconnect` event | Reconnect immediately |
| No `health_check` for >30 sec | Disconnect and reconnect |

**health_check** broadcasts every **5 seconds** on public channel.

---

## Error Codes

| Error Code | HTTP | Description |
|------------|------|-------------|
| `invalid_request` | 400 | Invalid body/param/header |
| `invalid_param` | 400 | Invalid parameter |
| `unauthorized` | 401 | Invalid auth token |
| `data_not_found` | 404 | Requested data not found |
| `internal_error` | 500 | Server error |
| `rate_limit_reached` | 429 | Max 50 req/sec |
| `insufficient_amount` | 403 | Not enough balance |
| `wager_external_id_existed` | 400 | Duplicate external_id |
| `wager_already_matched` | 400 | Can't cancel matched wager |
| `wager_already_cancelled` | 400 | Already cancelled |
| `wager_invalid_odds` | 400 | Odds not in ladder |
| `wager_stake_exceeds_max` | 400 | Stake > 100,000,000 |
| `event_not_available` | 400 | Event closed for betting |
| `sport_event_is_not_booked` | 400 | Event not available |
| `opened_retry` | 500 | Retry after 300ms |
| `wager_is_placing` | 409 | Can't cancel placing wager |

---

## Enum Reference

### Wager Object Fields

#### `status` (Wager Lifecycle)
| Status | Meaning |
|--------|---------|
| `inactive` | Request received, still in validation, not visible/matchable yet |
| `open` | Passed validation, visible to clients, can be matched |
| `invalid` | Failed validation (most common: insufficient balance) |
| `canceled` | Cancelled by client, no amount was matched |
| `void` | Voided by operations team (regulation or other causes) |
| `wiped` | Auto-wiped on event transition (e.g., pre-match → live) |
| `manually_settled` | Required human intervention to settle |
| `settled` | Auto-settled winning play, waiting for balance update |
| `closed` | Final status for auto-settled plays |

**Status Flow Examples:**
```
Winning (auto):   inactive → open → settled → closed
Losing (auto):    inactive → open → closed
Manual settle:    inactive → open → manually_settled
Cancelled:        inactive → open → canceled
```

#### `matching_status`
| Status | Meaning |
|--------|---------|
| `unmatched` | Not matched with any other play yet |
| `partially_matched` | Only partial amount matched |
| `fully_matched` | Full amount matched |

**Note:** If partially matched and then cancelled, status stays `open` but matching_status becomes `fully_matched` (partial amount cancelled).

#### `winning_status`
| Status | Meaning |
|--------|---------|
| `won` | Won, stake + profit paid to account |
| `lost` | Lost, no payout |
| `no_result` | No official result, stake returned |
| `tbd` | Waiting for final result |
| `manually_won` | Manual intervention set to win |
| `manually_lost` | Manual intervention set to loss |
| `draw` | Draw, original stake returned |
| `push` | No side wins, original stake returned |

#### `update_type` (WebSocket)
| Type | Meaning |
|------|---------|
| `status` | Play info has changed |
| `matching` | New matching bet for this play |

---

### Market Object

#### `type`
| Type | Meaning |
|------|---------|
| `moneyline` | Winner bet (no spread) |
| `spread` | Point spread bet |
| `total` | Over/under bet |

---

### SportEvent Object

#### `sub_type`
| Value | Meaning |
|-------|---------|
| `null` | Normal event |
| `outrights` | Custom futures/outright event |

---

## Sport Events Lifecycle (WebSocket)

Events are pushed via broadcast channel under topic `tournament_{id}`.

### Operation Types (`op`)
| Op | Meaning | When |
|----|---------|------|
| `c` | Create | Event initially created AND listed |
| `u` | Update | Event listed/re-listed (after creation) |
| `d` | Delete | Event unlisted |

**Note:** Event created but NOT listed = no message sent.

### Message Format
```json
{
  "change_type": "sport_event",
  "op": "c",  // or "u" or "d"
  "payload": "base64_encoded_json",
  "timestamp": 1687278019324319700
}
```

### Payload (Decoded) - Create/Update
```json
{
  "id": "1500090150",
  "tournament_id": "1600000073",
  "info": {
    "name": "Xander Schauffele to Win",
    "display_name": "",
    "type": "custom",
    "event_id": 1500090150,
    "sport_name": "Golf",
    "tournament_name": "Travelers Championship",
    "tournament_id": 1600000073,
    "competitors": [
      {
        "id": 1600000050,
        "name": "Yes",
        "display_name": "Yes",
        "abbreviation": "Yes",
        "side": "home"
      },
      {
        "id": 1600000051,
        "name": "No",
        "display_name": "No",
        "abbreviation": "No",
        "side": "away"
      }
    ],
    "status": "not_started",
    "scheduled": "2023-06-25T22:00:00Z",
    "updated_at": 1687278019199067400
  }
}
```

### Payload (Decoded) - Delete/Unlisted
```json
{
  "id": "1500090150",
  "tournament_id": "1600000073"
}
```

### Event Lifecycle Summary
| Action | WebSocket Message |
|--------|-------------------|
| Created + Listed | `op: "c"` with full payload |
| Created NOT Listed | No message |
| Re-listed | `op: "u"` with full payload |
| Updated | `op: "u"` with full payload |
| Unlisted | `op: "d"` with id only |

---

## Complete WebSocket Event Reference

### Message Structure
```json
{
  "timestamp": 1717689526365275600,  // int64
  "change_type": "sport_event",       // string
  "payload": "base64_encoded_json",   // decode this!
  "op": "c"                           // c=create, u=update, d=delete
}
```

---

## Broadcast Channel (Public)
Messages pushed to ALL connected API users.

### 1. `tournament`
New tournament available, disabled, or updated.
```json
{
  "id": "string",
  "info": {
    "id": 123,
    "name": "NBA",
    "banner": "url",
    "image": "url",
    "category": {
      "id": 1,
      "name": "Basketball",
      "countryCode": "US"
    },
    "sport": {
      "id": 1,
      "name": "Basketball"
    },
    "sequence_number": 1234567890
  }
}
```

### 2. `sport_event`
Event available, removed, or updated.
```json
{
  "id": "string",
  "tournament_id": "string",
  "info": {
    "event_id": 12345,
    "name": "Lakers vs Celtics",
    "display_name": "LAL vs BOS",
    "status": "not_started",
    "scheduled": "2024-01-15T19:00:00Z",
    "sport_name": "Basketball",
    "tournament_name": "NBA",
    "type": "match",
    "competitors": [
      {
        "id": 100,
        "name": "Los Angeles Lakers",
        "display_name": "Lakers",
        "abbreviation": "LAL",
        "side": "home",
        "country": "US"
      }
    ],
    "sequence_number": 1234567890
  }
}
```

### 3. `market`
Market available, removed, or updated for an event.
```json
{
  "id": "string",
  "info": {
    "id": 219,
    "sport_event_id": 12345,
    "name": "Moneyline",
    "status": "active",
    "description": "...",
    "sequence_number": 1234567890
  }
}
```

### 4. `market_line`
New line, removed line, or line data updated.
```json
{
  "id": 456,
  "info": {
    "id": 456,
    "sport_event_id": 12345,
    "market_id": 219,
    "outcome_id": 4,
    "line": -3.5,
    "line_id": "abc123def456",
    "type": "spread",
    "name": "Lakers -3.5",
    "status": "active",
    "favourite": true,
    "sequence_number": 1234567890
  }
}
```

### 5. `market_selections`
Liquidity changed (new plays, matches, voids, cancels). Shows best 10 selections per side.
```json
{
  "sport_event_id": 12345,
  "market_id": 219,
  "info": {
    "id": 456,
    "name": "Spread",
    "type": "spread",
    "line": -3.5,
    "sequence_number": 1234567890,
    "selections": [
      [  // Side 1 - best 10 offers
        {
          "outcome_id": 4,
          "name": "Lakers -3.5",
          "competitor_id": 100,
          "line": -3.5,
          "line_id": "abc123",
          "odds": 110,
          "display_odds": "-110",
          "display_line": "-3.5",
          "display_name": "Lakers -3.5",
          "value": 100.00,
          "stake": 110.00,
          "updated_at": 1234567890
        }
      ],
      [  // Side 2 - best 10 offers
        // ... opposite side selections
      ]
    ]
  }
}
```

### 6. `matched_bet`
Broadcast when a match occurs - shows matched odds for all to see.
```json
{
  "info": {
    "sport_event_id": 44285780,
    "market_id": 219,
    "line_id": "cffa7ddc4fd50acbe51684e7addabe00",
    "outcome_id": 4,
    "line": 0,
    "odds": 124,
    "matched_odds": 124,
    "matched_stake": 45.3,
    "origin_market_line": 0,
    "sequence_number": 1709130007835319000
  }
}
```

---

## Private Channel (Your Data Only)

### 1. `wager`
Updates on YOUR plays - activation, cancellation, matching.
```json
{
  "info": {
    "id": "wager_uuid",
    "user_id": "user_uuid",
    "external_id": "your_external_id",
    "sport_event_id": 12345,
    "market_id": 219,
    "outcome_id": 4,
    "line_id": "abc123",
    "line": -3.5,
    "odds": -110,
    "stake": 100.00,
    "profit": 90.91,
    "matched_stake": 50.00,
    "matched_odds": -110,
    "totally_matched_stake": 50.00,
    "unmatched_stake": 50.00,
    "matching_status": "partially_matched",
    "winning_status": "tbd",
    "status": "open",
    "update_type": "matching",
    "sequence_number": 1234567890
  }
}
```

### 2. `health_check`
Heartbeat every 5 seconds.
```json
{
  "event": "health_check",
  "data": {
    "change_type": "private_system_signal",
    "op": "u",
    "payload": "e30=",  // base64 for {}
    "timestamp": 1717689526365275600
  }
}
```

---

## Quick Reference Table

| Channel | change_type | Purpose |
|---------|-------------|---------|
| Broadcast | `tournament` | Tournament CRUD |
| Broadcast | `sport_event` | Event CRUD |
| Broadcast | `market` | Market CRUD |
| Broadcast | `market_line` | Line CRUD |
| Broadcast | `market_selections` | Order book / liquidity |
| Broadcast | `matched_bet` | Public match notifications |
| Private | `wager` | Your play updates |
| Private | `health_check` | Connectivity heartbeat |

---

## Rate Limits
- **50 requests per second** maximum
- Implement exponential backoff on 429 errors

## Best Practices
1. **Refresh tokens** before 10-minute expiry
2. **Use v2 endpoints** where available (better pagination)
3. **Batch operations** when possible (place_multiple, cancel_multiple)
4. **Subscribe to WebSocket** for real-time updates
5. **Store external_id** mapping for wager management
6. **Check odds ladder** before placing wagers

---

# Parlay RFQ API (Service Provider Integration)

## Overview
The Parlay API allows Service Providers (SPs) to provide price quotes for parlay bets. It uses WebSocket for real-time communication.

## Parlay API URLs
| Environment | Base URL | Swagger |
|-------------|----------|---------|
| **Sandbox** | `https://api-ss-sandbox.betprophet.co/parlay/sp` | https://parlay-docs-ss-sandbox.betprophet.co/swagger/sp/index.html |

## Example Code
- **Python:** https://github.com/betprophet1/python-parlay-api-integration-guide
- **Golang:** https://github.com/betprophet1/prophet-parlay-integration-guide

## High-Level Flow
1. User sends parlay quote request (list of outcomes) to ProphetX
2. ProphetX broadcasts request to all connected SPs via WebSocket
3. SPs respond with price quotes via callback REST API
4. User accepts a price
5. ProphetX sends confirmation to winning SP via private WebSocket
6. SP confirms acceptance via callback REST API
7. ProphetX sends `order.finalized` message confirming execution

## WebSocket Topics

### 1. `price.ask.new` (Broadcast)
Parlay quote request sent to ALL connected SPs.

**Payload:**
```json
{
  "parlay_id": "83d790df-1ced-4490-a06a-7cb224faf59b",
  "stake": 3.49,
  "callback_url": "https://api-ss-sandbox.betprophet.co/parlay/sp/order/offers",
  "created_at": 1744210012349577200,
  "market_lines": [
    {"line_id": "abc123", "market_id": 412, "outcome_id": 13, "sport_event_id": 30023691, "line": 5.5},
    {"line_id": "def456", "market_id": 225, "outcome_id": 13, "sport_event_id": 20022121, "line": 227}
  ]
}
```

### 2. `price.confirm.new` (Private)
Sent to individual SP when user accepts their price.

**Payload:**
```json
{
  "callback_url": "https://...",
  "odds": 150,
  "action": "accept"  // or "reject"
}
```

### 3. `order.matched` (Broadcast)
Sent to all SPs with matched parlay info.

**Payload:**
```json
{
  "parlay_id": "28250d66-30a4-406b-b90c-cd65c96d4c72",
  "matched_odds": 188,
  "matched_stake": 3.49,
  "matched_at": 1759216871383341000,
  "market_lines": [...]
}
```

### 4. `order.finalized` (Private)
Confirmation that parlay was executed.

**Payload:**
```json
{
  "parlay_id": "23851166-3e18-4b3c-aea7-16de1b114bb8",
  "order_uuid": "01977e64-756b-7a75-b218-f0a0e4032004",
  "confirmed_stake": 1049722844427,
  "odds": -100000,
  "status": "finalized",
  "updated_at": 1750172203426483200
}
```

### 5. `order.settled` (Private)
Sent when ONE order in your parlay is settled.

**Payload:**
```json
{
  "order_uuid": "01991588-274d-70be-ac0a-cf876677d57f",
  "parlay_id": "fdd7e3fb-ef50-42eb-9d73-43d3d7f1390f",
  "settlement_status": "won",
  "settled_at": 1757002869231213000,
  "profit": 150
}
```

### 6. `parlay.settled` (Private)
Sent when ALL orders in a parlay are settled (final settlement).

**Payload:**
```json
{
  "parlay_id": "fdd7e3fb-ef50-42eb-9d73-43d3d7f1390f",
  "settlement_status": "won",
  "settled_at": 1757002869231213000,
  "profit": 150
}
```

### 7. `health_check` (Broadcast)
Heartbeat message. **If not received for >30 seconds, reconnect to WebSocket!**

## Callback Endpoints

### Price Offer Callback
```
POST /parlay/sp/orders/offers
```
Called by SP to submit price quote.

**Request:**
```json
{
  "parlay_id": "parlay-uuid",
  "offers": [
    {
      "valid_until": 1744210517349577200,  // nanoseconds, must be >5 sec from now
      "odds": 100000,
      "max_risk": 200,
      "estimated_price": [
        {"line_id": "abc123", "odds": 200},
        {"line_id": "def456", "odds": 200}
      ]
    }
  ]
}
```

### Price Confirmation Callback
```
POST /parlay/sp/orders/confirmations
```
Called by SP to accept/reject price confirmation.

**Request:**
```json
{
  "action": "accept",  // or "reject"
  "confirmed_odds": 150,
  "confirmed_stake": 100.0,  // optional
  "price_probability": [
    {
      "max_risk": 200.0,
      "lines": [
        {"line_id": "line_1", "probability": 0.5},
        {"line_id": "line_2", "probability": 0.4}
      ]
    }
  ]
}
```

## REST Endpoints

### List Orders
```
GET /parlay/sp/orders
```
**Query params:** limit, token (pagination), from, to, relative (e.g. "15m"), status

**Statuses:** open, confirmed, completed, canceled, settled, void, finalized, rejected, inactive

### Send Supported Lines
```
POST /parlay/sp/supported-lines
```
Tell ProphetX which lines you can price.
```json
{
  "supported_lines": ["line_id_1", "line_id_2", ...]
}
```

## WebSocket Setup

1. **Get connection config:**
   ```
   GET /websocket/connection-config
   ```

2. **Authenticate WebSocket:**
   ```
   POST /parlay/pusher
   ```
   With `socket_id` from Pusher connection.

3. **Subscribe to channels:**
   - Broadcast channel: `price.ask.new`
   - Private channel: `price.confirm.new`, `order.finalized`

## Integration Steps
1. Login with MM API credentials (same keys work for both APIs)
2. Seed tournaments/events/markets from MM API
3. Connect to Parlay WebSocket
4. Subscribe to broadcast + private channels
5. Handle `price.ask.new` → respond with offers
6. Handle `price.confirm.new` → accept or reject
7. Handle `order.finalized` → confirm execution
8. Refresh session every 8 minutes

---

# B2B Odds Screen Integration (Partner Platforms)

For platforms that want to embed ProphetX betting into their existing odds screens.

## Overview
This integration allows partner platforms to:
- Display ProphetX markets/odds on their own UI
- Let users place bets directly through ProphetX
- Requires user authentication (email/password) + geolocation

## Affiliate API
**Swagger:** https://partner-docs.prophetx.co/swagger/affiliate/index.html

Used to ingest events and markets data. **Important:** Store `line_id` - needed to place plays!

### Get Events
```
GET /affiliate/get_sport_events?tournament_id={id}
```

### Get Markets
```
GET /affiliate/get_multiple_markets?event_ids=1,2,3
```

**Response includes:**
```json
{
  "selections": [
    {
      "line_id": "40a32ae7b39684d430cf494be26cbe6b",  // SAVE THIS!
      "display_name": "under 7.5",
      "display_odds": "+119",
      "odds": 119,
      "stake": 42.81,
      "line": 7.5
    }
  ]
}
```

---

## User Session Management

Uses **user's ProphetX credentials** (not API keys). User enters email/password once every 30 days.

### Login
```
POST https://cash.api.prophetx.co/api/v1/auth/login
```
**Request:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```
**Response:**
```json
{
  "accessToken": "...",   // expires in 1 hour
  "refreshToken": "..."   // valid for 30 days
}
```

### Extend Session (Refresh Token)
```
POST https://cash.api.prophetx.co/api/v1/auth/extend-session
Authorization: Bearer {refreshToken}
```
Returns new `refreshToken`. Call this before the 30-day expiry.

### Get User Info
```
GET https://cash.api.prophetx.co/api/v1/me
Authorization: Bearer {accessToken}
```

---

## Geolocation Check (GeoComply)

**Required before placing bets** - users must be in legal states.

### Setup
1. Include GeoComply library:
   ```html
   <script src="https://cdn.geocomply.com/224/gc-html5.js"></script>
   ```

### Flow
1. **Get GeoComply license:**
   ```
   GET https://cash.api.prophetx.co/api/v1/geocomply/license?isSecure=true
   ```
   (One-time license per geolocation request)

2. **Get user ID:**
   ```
   GET https://cash.api.prophetx.co/api/v1/me
   ```

3. **Make geolocation request** using GeoComply SDK with user_id + license

4. **Decrypt response:**
   ```
   POST https://cash.api.prophetx.co/api/v1/geocomply/decrypt
   ```

5. **Verify success:**
   - `<error_code>0</error_code>` 
   - `"isActiveStates": true`

If either fails → user cannot place bets, prompt to retry geolocation.

---

## Placing Plays

### Place Wager
```
POST https://cash.api.prophetx.co/trade/private/api/v2/wagers
Authorization: Bearer {accessToken}
```
**Request:**
```json
{
  "lineID": "40a32ae7b39684d430cf494be26cbe6b",
  "odds": 119,
  "stake": 10.00
}
```

**Prerequisites:**
- User logged in (valid accessToken)
- Geolocation check passed
- Valid `line_id` from market data

---

## Tracking (Customer.io)

Send tracking data to ProphetX for each play placed:

```bash
curl --request POST \
  --url https://track.customer.io/api/v1/customers/{user_id}/events \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Basic ZWQxMDdkMTYxMDgwN2E0YWQyNTA6ZjBiMzFhNjc1YjkwNTlmMGMwMTc=' \
  --data '{
    "name": "Bet Placed",
    "data": {
      "wager_id": "{wager_refId}",
      "bet_placement_location": "yourPlatformName"
    }
  }'
```

- `user_id` from `/me` endpoint
- `wager_refId` from place wager response

---

## Integration Summary

| Step | Endpoint | Purpose |
|------|----------|---------|
| 1 | Affiliate API | Ingest events/markets, save line_ids |
| 2 | `/auth/login` | Get user tokens (email/password) |
| 3 | `/geocomply/*` | Verify user location |
| 4 | `/trade/private/api/v2/wagers` | Place the bet |
| 5 | Customer.io | Track the play |

**Note:** View plays/history via https://www.prophetx.co or mobile app - no API for this currently.
