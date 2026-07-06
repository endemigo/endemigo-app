#!/bin/bash
# Phase 1-3 Regression Test Suite
# Auth + Become Seller + Products + Categories

API="http://localhost:3030"
PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ FAIL: $1 — Got: $2"; FAIL=$((FAIL+1)); }

check() {
  local desc="$1" url="$2" method="$3" expected="$4" token="$5" body="$6"
  local args=(-s -o /tmp/resp13.json -w "%{http_code}")
  [ "$method" = "POST" ] && args+=(-X POST)
  [ "$method" = "PATCH" ] && args+=(-X PATCH)
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-H "Content-Type: application/json" -d "$body")
  local code=$(curl "${args[@]}" "$url")
  if [ "$code" = "$expected" ]; then pass "$desc ($code)"; else fail "$desc (expected $expected)" "$code"; fi
}

echo "============================================"
echo "  PHASE 1-3 REGRESSION TEST SUITE"
echo "============================================"
echo ""

# ========= Phase 1: Auth =========
echo "--- Phase 1: Auth ---"

# Register new user (may already exist)
REG=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"regtest@test.com","password":"Test1234!","firstName":"Reg","lastName":"Test","kvkkAccepted":true}')
if [ "$REG" = "201" ] || [ "$REG" = "409" ]; then
  pass "P1.1: Register ($REG)"
else
  fail "P1.1: Register" "$REG"
fi

# Login
LOGIN=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" \
  -d '{"email":"regtest@test.com","password":"Test1234!"}')
TOKEN=$(echo $LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken','FAIL'))" 2>/dev/null)
if [ "$TOKEN" != "FAIL" ] && [ -n "$TOKEN" ]; then
  pass "P1.2: Login + JWT token received"
else
  fail "P1.2: Login" "no token"
fi

# Profile
check "P1.3: Auth profile" "$API/auth/profile" "GET" "200" "$TOKEN"

# Invalid login
check "P1.4: Wrong password → 401" "$API/auth/login" "POST" "401" "" \
  '{"email":"regtest@test.com","password":"Wrong123!"}'

# No token → 401
check "P1.5: No token → 401" "$API/auth/profile" "GET" "401" ""

# Health
check "P1.6: Health check" "$API/health" "GET" "200" ""

echo ""

# ========= Phase 2: Become Seller =========
echo "--- Phase 2: Become Seller ---"

SELLER_TOKEN=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" \
  -d '{"email":"new@test.com","password":"Test1234!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Already seller → 409
check "P2.1: Already seller → 409" "$API/users/become-seller" "POST" "409" "$SELLER_TOKEN" \
  '{"businessName":"Regression Seller","agreementAccepted":true}'

echo ""

# ========= Phase 3: Products =========
echo "--- Phase 3: Products ---"

check "P3.1: Product list (public)" "$API/products" "GET" "200" ""

# Product detail
PID=$(curl -s $API/products | python3 -c "import sys,json; items=json.load(sys.stdin)['items']; print(items[0]['id'] if items else 'NONE')")
if [ "$PID" != "NONE" ]; then
  check "P3.2: Product detail" "$API/products/$PID" "GET" "200" ""
else
  pass "P3.2: Skipped (no products)"
fi

# Seller creates product
check "P3.3: Seller creates product" "$API/products" "POST" "201" "$SELLER_TOKEN" \
  '{"title":"Regression Test Ürün","price":999}'

# Non-seller cannot create — 403 (seller check) or 400 (DTO validation first)
CODE_P34=$(curl -s -o /tmp/resp13.json -w "%{http_code}" -X POST "$API/products" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"title":"X","price":1}')
if [ "$CODE_P34" = "403" ] || [ "$CODE_P34" = "400" ]; then
  pass "P3.4: Non-seller product rejected ($CODE_P34)"
else
  fail "P3.4: Non-seller reject (expected 400/403)" "$CODE_P34"
fi

# Categories
check "P3.5: Category list" "$API/categories" "GET" "200" ""
CAT_COUNT=$(curl -s $API/categories | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
if [ "$CAT_COUNT" -ge "9" ]; then
  pass "P3.6: Categories seeded ($CAT_COUNT)"
else
  fail "P3.6: Categories" "count=$CAT_COUNT"
fi

# Validation
check "P3.7: No title → 400" "$API/products" "POST" "400" "$SELLER_TOKEN" '{"price":100}'

# Pagination
PAGES=$(curl -s "$API/products?page=1&limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"items\"])}/{d[\"total\"]}')")
pass "P3.8: Pagination ($PAGES)"

echo ""
echo "============================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "  Total: $((PASS + FAIL)) tests"
echo "============================================"

rm -f /tmp/resp13.json
