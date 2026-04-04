#!/bin/bash
# Database checker script - easy way to monitor classifications

echo "📊 EMAIL CLASSIFICATION DATABASE CHECK"
echo "========================================"
echo ""

# Get email from user or use default
read -p "Enter email to search for (or press Enter for all): " SEARCH_EMAIL

if [ -z "$SEARCH_EMAIL" ]; then
  EMAIL_FILTER=""
  EMAIL_DESC="all emails"
else
  EMAIL_FILTER="WHERE sender_email = '$SEARCH_EMAIL'"
  EMAIL_DESC="emails from $SEARCH_EMAIL"
fi

echo ""
echo "Querying $EMAIL_DESC..."
echo ""

psql -U penghuizhang email_classifier <<SQL
SELECT 
  id,
  subject,
  sender_email,
  classification,
  confidence_score::NUMERIC(5,4) as confidence,
  CASE WHEN is_quarantined THEN '✅ YES' ELSE '❌ NO' END as quarantined,
  EXTRACT(EPOCH FROM (quarantined_at - created_at))::INTEGER as seconds_to_quarantine,
  to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as processed_at
FROM email_classifications 
$EMAIL_FILTER
ORDER BY created_at DESC 
LIMIT 10;
SQL

echo ""
echo "✅ Check complete!"
echo ""
echo "Key columns:"
echo "  - classification: Type (phish/spam/benign)"
echo "  - confidence: 0.00-1.00 (our LLM confidence)"
echo "  - quarantined: Did we move it to Spam?"
echo "  - seconds_to_quarantine: Speed of action"

