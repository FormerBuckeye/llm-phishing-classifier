#!/bin/bash
# Quick CSV Exporter - Export classified emails to CSV
# Saves to csv_exports/ folder

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPORT_DIR="${SCRIPT_DIR}/csv_exports"
ABS_EXPORT_DIR="${EXPORT_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="email_classifications_${TIMESTAMP}.csv"

# Create directory
mkdir -p "$EXPORT_DIR"

echo "📊 Exporting email classifications to CSV..."
echo "======================================"
echo "📁 Saving to: csv_exports/"
echo ""

# Query to export to absolute path
psql -U penghuizhang email_classifier <<SQL
COPY (
  SELECT 
    id,
    message_id,
    sender_email,
    subject,
    classification,
    confidence_score,
    CASE WHEN is_quarantined THEN 'YES' ELSE 'NO' END as quarantined,
    quarantined_at,
    received_at,
    created_at
  FROM email_classifications 
  ORDER BY created_at DESC
)
TO '${ABS_EXPORT_DIR}/${FILENAME}'
WITH CSV HEADER;
SQL

# Check success
if [ -f "${ABS_EXPORT_DIR}/${FILENAME}" ]; then
    FILE_SIZE=$(du -h "${ABS_EXPORT_DIR}/${FILENAME}" | cut -f1)
    RECORD_COUNT=$(wc -l < "${ABS_EXPORT_DIR}/${FILENAME}")
    
    echo ""
    echo "✅ SUCCESS! CSV file created:"
    echo "   File: csv_exports/${FILENAME}"
    echo "   Size: $FILE_SIZE"
    echo "   Records: $((RECORD_COUNT - 1))"
    echo ""
    
    # Open file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "📱 Opening file..."
        open "${ABS_EXPORT_DIR}/${FILENAME}"
    else
        echo "📁 Open the file manually:"
        echo "   ${EXPORT_DIR}/${FILENAME}"
    fi
    echo ""
    echo "Next time, just run: ./export_to_csv.sh"
    exit 0
fi

echo "❌ Failed to create CSV file"
exit 1
