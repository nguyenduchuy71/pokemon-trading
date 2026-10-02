#!/usr/bin/env bash
# Scope guard: CardSwap must never grow payment, checkout, escrow, shipping, order or trade-contract features.
# Fails CI if such code appears in the app, database migrations or edge functions.
# Legal/landing copy that *states* what CardSwap does not do lives in src/locales and is excluded on purpose.
set -euo pipefail
cd "$(dirname "$0")/.."

PATTERN='\b(checkout|add[ _-]?to[ _-]?cart|shopping[ _-]?cart|escrow|stripe|paypal|momo|vnpay|zalopay|shipping[ _-]?(label|fee|order|address)|tracking[ _-]?number|place[ _-]?order|buy[ _-]?now|trade[ _-]?(proposal|contract|acceptance|completion)|TRADE_ACCEPTED|TRADE_DECLINED|ORDER_PAID|ORDER_SHIPPED|PAYMENT_RECEIVED)\b'
TABLES='create table[^(]*\b(trades?|trade_items|payments?|orders?|escrows?|transactions?|shipping_orders?|carts?)\b'

status=0
# Lines that merely document the boundary carry an explicit "[scope-guard: allow]" marker.
if grep -RInEi "$PATTERN" src supabase/migrations supabase/functions --exclude-dir=locales --exclude='*.test.ts' --exclude='*.test.tsx' | grep -v 'scope-guard: allow'; then
  echo "✗ Out-of-scope commerce terms found (see above)." >&2
  status=1
fi
if grep -RInEi "$TABLES" supabase/migrations | grep -v 'scope-guard: allow'; then
  echo "✗ Out-of-scope tables found in migrations." >&2
  status=1
fi
if find src/pages -iname '*order*' -o -iname '*checkout*' -o -iname '*payment*' -o -iname '*shipping*' -o -iname '*trade-*page*' | grep -q .; then
  echo "✗ Out-of-scope pages found." >&2
  status=1
fi
[ "$status" -eq 0 ] && echo "✓ Scope guard passed: no payment/escrow/shipping/order/trade-contract code."
exit "$status"
