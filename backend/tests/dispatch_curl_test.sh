#!/bin/bash

# Evac_Route Dispatch Order API Integration Test via cURL
# Exit immediately if any command fails (optional, but we'll manually handle errors for nice output)
set -e

BASE_URL="http://127.0.0.1:8000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Starting cURL Integration Tests for Dispatch Orders ===${NC}\n"

# 1. Login as Admin
echo -n "1. Logging in as Admin (drrm@lgu.gov.ph)... "
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"drrm@lgu.gov.ph","password":"password","device_name":"curl_test"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')

if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "${GREEN}Success!${NC}"
else
  echo -e "${RED}Failed to log in as Admin. Response: $ADMIN_LOGIN${NC}"
  exit 1
fi

# 2. Login as Resident
echo -n "2. Logging in as Resident (resident_0@evacroute.local)... "
RESIDENT_LOGIN=$(curl -s -X POST "$BASE_URL/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"resident_0@evacroute.local","password":"password","device_name":"curl_test"}')

RESIDENT_TOKEN=$(echo "$RESIDENT_LOGIN" | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')

if [ -n "$RESIDENT_TOKEN" ]; then
  echo -e "${GREEN}Success!${NC}"
else
  echo -e "${RED}Failed to log in as Resident. Response: $RESIDENT_LOGIN${NC}"
  exit 1
fi

# 3. Login as Staff
echo -n "3. Logging in as LGU Staff (scanner1@lgu.gov.ph)... "
STAFF_LOGIN=$(curl -s -X POST "$BASE_URL/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"scanner1@lgu.gov.ph","password":"password","device_name":"curl_test"}')

STAFF_TOKEN=$(echo "$STAFF_LOGIN" | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')

if [ -n "$STAFF_TOKEN" ]; then
  echo -e "${GREEN}Success!${NC}"
else
  echo -e "${RED}Failed to log in as LGU Staff. Response: $STAFF_LOGIN${NC}"
  exit 1
fi

echo ""

# Helper function to check status code
assert_status() {
  local expected=$1
  local actual=$2
  local msg=$3
  if [ "$actual" -eq "$expected" ]; then
    echo -e "  -> ${GREEN}PASS:${NC} $msg (Status: $actual)"
  else
    echo -e "  -> ${RED}FAIL:${NC} $msg (Expected: $expected, Got: $actual)"
    exit 1
  fi
}

# 4. Test Guests/Unauthenticated access (expect 401)
echo "4. Testing Guest Route Restrictions..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" -X GET "$BASE_URL/dispatch-orders")
assert_status 401 "$STATUS" "Guest cannot list dispatch orders"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" -X POST "$BASE_URL/dispatch-orders" \
  -H "Content-Type: application/json" -d '{}')
assert_status 401 "$STATUS" "Guest cannot create dispatch orders"

# 5. Test Resident access (expect 403)
echo "5. Testing Resident Route Restrictions..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" -X GET "$BASE_URL/dispatch-orders" \
  -H "Authorization: Bearer $RESIDENT_TOKEN")
assert_status 403 "$STATUS" "Resident cannot list dispatch orders"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" -X POST "$BASE_URL/dispatch-orders" \
  -H "Authorization: Bearer $RESIDENT_TOKEN" \
  -H "Content-Type: application/json" -d '{}')
assert_status 403 "$STATUS" "Resident cannot create dispatch orders"

# 6. Admin lists dispatch orders (expect 200)
echo "6. Listing Dispatch Orders as Admin..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" -X GET "$BASE_URL/dispatch-orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
assert_status 200 "$STATUS" "Admin can list dispatch orders"

# 7. Admin creates dispatch order (expect 201)
echo "7. Creating Dispatch Order as Admin..."
CREATE_RES=$(curl -s -H "Accept: application/json" -X POST "$BASE_URL/dispatch-orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shelter_id":1,"notes":"cURL Test Manifest","items":[{"inventory_item_id":1,"quantity":5},{"inventory_item_id":2,"quantity":10}]}')

STATUS=$(echo "$CREATE_RES" | grep -o '"id":[0-9]*' | head -1 | wc -l)
if [ "$STATUS" -gt 0 ]; then
  ORDER_ID=$(echo "$CREATE_RES" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
  echo -e "  -> ${GREEN}PASS:${NC} Created Order ID $ORDER_ID"
else
  echo -e "  -> ${RED}FAIL:${NC} Failed to create dispatch order. Response: $CREATE_RES"
  exit 1
fi

# 8. Staff departs order (expect 200)
echo "8. Marking Dispatch Order as In-Transit (Depart)..."
DEPART_RES=$(curl -s -H "Accept: application/json" -X POST "$BASE_URL/dispatch-orders/$ORDER_ID/depart" \
  -H "Authorization: Bearer $STAFF_TOKEN")
STATUS=$(echo "$DEPART_RES" | grep -o '"status":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ "$STATUS" = "success" ]; then
  echo -e "  -> ${GREEN}PASS:${NC} Order marked in transit"
else
  echo -e "  -> ${RED}FAIL:${NC} Failed to depart order. Response: $DEPART_RES"
  exit 1
fi

# 9. Staff delivers order (expect 200)
echo "9. Marking Dispatch Order as Delivered..."
DELIVER_RES=$(curl -s -H "Accept: application/json" -X POST "$BASE_URL/dispatch-orders/$ORDER_ID/deliver" \
  -H "Authorization: Bearer $STAFF_TOKEN")
STATUS=$(echo "$DELIVER_RES" | grep -o '"status":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ "$STATUS" = "success" ]; then
  echo -e "  -> ${GREEN}PASS:${NC} Order delivered successfully"
else
  echo -e "  -> ${RED}FAIL:${NC} Failed to deliver order. Response: $DELIVER_RES"
  exit 1
fi

# 10. Attempt to cancel delivered order (expect 422)
echo "10. Attempting to Cancel Delivered Order (should be rejected)..."
CANCEL_FAIL_RES=$(curl -s -H "Accept: application/json" -w "\n%{http_code}" -X POST "$BASE_URL/dispatch-orders/$ORDER_ID/cancel" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP_STATUS=$(echo "$CANCEL_FAIL_RES" | tail -n1)

assert_status 422 "$HTTP_STATUS" "Cannot cancel already delivered dispatch order"

# 11. Create a second order to test cancellation (expect 201)
echo "11. Creating second order for Cancellation Test..."
CREATE_RES_2=$(curl -s -H "Accept: application/json" -X POST "$BASE_URL/dispatch-orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shelter_id":1,"notes":"Cancellation Test Order","items":[{"inventory_item_id":1,"quantity":2}]}')

ORDER_ID_2=$(echo "$CREATE_RES_2" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
if [ -n "$ORDER_ID_2" ]; then
  echo -e "  -> ${GREEN}PASS:${NC} Created Second Order ID $ORDER_ID_2"
else
  echo -e "  -> ${RED}FAIL:${NC} Failed to create second order. Response: $CREATE_RES_2"
  exit 1
fi

# 12. Cancel the pending second order (expect 200)
echo "12. Cancelling the pending second order..."
CANCEL_RES=$(curl -s -H "Accept: application/json" -X POST "$BASE_URL/dispatch-orders/$ORDER_ID_2/cancel" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STATUS=$(echo "$CANCEL_RES" | grep -o '"status":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ "$STATUS" = "success" ]; then
  echo -e "  -> ${GREEN}PASS:${NC} Pending order cancelled successfully"
else
  echo -e "  -> ${RED}FAIL:${NC} Failed to cancel order. Response: $CANCEL_RES"
  exit 1
fi

# 13. Create a hazard on the live map (using coordinates that failed previously: lat=6.9149409442134, lng=122.06147233724)
echo "13. Creating a hazard zone on the live map (MySQL Spatial Index validation)..."
HAZARD_RES=$(curl -s -H "Accept: application/json" -X POST "$BASE_URL/hazards" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Flooded Road","latitude":6.9149409442134,"longitude":122.06147233724,"radius_meters":88,"hazard_type":"flood","severity_level":"medium","estimated_duration_hours":5}')

STATUS=$(echo "$HAZARD_RES" | grep -o '"status":"[^"]*' | grep -o '[^"]*$' | head -1)
if [ "$STATUS" = "success" ]; then
  echo -e "  -> ${GREEN}PASS:${NC} Hazard zone created successfully on MySQL"
else
  echo -e "  -> ${RED}FAIL:${NC} Failed to create hazard. Response: $HAZARD_RES"
  exit 1
fi

echo -e "\n${GREEN}=== All cURL Integration Tests Passed! ===${NC}"
