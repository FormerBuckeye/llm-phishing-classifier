#!/bin/bash
echo "=== INSTANT VERIFICATION TEST ==="
echo "Running in 5 seconds from now..."
echo ""
echo "If new test email was sent at 3:02pm, it should appear in this run:"
echo ""
sleep 5
./check_database.sh << 'EOF'
penghuius@gmail.com
