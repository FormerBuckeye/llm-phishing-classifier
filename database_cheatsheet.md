# 📊 Database Cheatsheet - Check Classifications Yourself

## **🔵 Method 1: Use the Checker Script (Easiest)**

```bash
cd /Users/penghuizhang/Downloads/llm_phishing_classifier
./check_database.sh
```

Then type an email address (or press Enter for all emails).

**Example output you'll see:**
```
📊 EMAIL CLASSIFICATION DATABASE CHECK
========================================

Enter email to search for (or press Enter for all): aegisaizph@gmail.com

Querying emails from aegisaizph@gmail.com...

  id |          subject           |     sender_email     | classification | confidence | quarantined | seconds_to_quarantine |    processed_at
-----+----------------------------+----------------------+----------------+------------+-------------+----------------------+-------------------
   3 | SECURITY ALERT: Unauth... | aegisaizph@gmail.com | phish          |     0.9500 | ✅ YES      |                    0 | 2026-04-03 13:16:49
   2 | SECURITY ALERT: Unauth... | aegisaizph@gmail.com | phish          |     0.9500 | ✅ YES      |                    0 | 2026-04-03 13:15:44
```

**Understanding the columns:**
- `id`: Database record number
- `subject`: Email subject line
- `sender_email`: Who sent it
- `classification`: **phish** / **spam** / **benign**
- `confidence`: Our LLM confidence (0.00-1.00, higher = more confident)
- `quarantined`: ✅ YES = we moved it to Spam
- `seconds_to_quarantine`: 0 = immediate, higher = delayed
- `processed_at`: When our system processed it

---

## **🟢 Method 2: Direct psql Commands (Flexible)**

**Connect to database:**
```bash
psql -U penghuizhang email_classifier
```

You'll see: `email_classifier=#`

**Run these queries:**

### **1. See all quarantined emails:**
```sql
SELECT subject, sender_email, classification, confidence_score, 
       is_quarantined, quarantined_at, created_at
FROM email_classifications 
WHERE is_quarantined = true
ORDER BY quarantined_at DESC 
LIMIT 10;
```

### **2. Check a specific email:**
```sql
SELECT * FROM email_classifications 
WHERE sender_email = 'aegisaizph@gmail.com'
ORDER BY created_at DESC;
```

### **3. Get statistics:**
```sql
SELECT 
  classification,
  COUNT(*) as count,
  SUM(CASE WHEN is_quarantined THEN 1 ELSE 0 END) as quarantined
FROM email_classifications
GROUP BY classification;
```

### **4. Real-time monitoring (run every 10 sec):**
```sql
SELECT subject, classification, confidence_score, is_quarantined,
       to_char(created_at, 'HH24:MI:SS') as time
FROM email_classifications
ORDER BY created_at DESC 
LIMIT 5;
```

**Type `\q` to exit**

---

## **🟡 Method 3: Watch Real-time with watch command**

```bash
# Updates every 5 seconds
watch -n 5 "psql -U penghuizhang email_classifier -c \"SELECT subject, classification, confidence_score, is_quarantined, created_at FROM email_classifications ORDER BY created_at DESC LIMIT 5;\""
```

Press `Ctrl+C` to stop

---

## **🔴 Quick Verification Queries**

**Was an email quarantined by our system?**
```bash
psql -U penghuizhang email_classifier -c "
SELECT 
  CASE 
    WHEN confidence_score IS NOT NULL THEN '✅ YES - OUR SYSTEM'
    ELSE '❌ NO - GMAIL NATIVE'
  END as result_name,
  sender_email,
  classification,
  confidence_score,
  is_quarantined
FROM email_classifications
WHERE sender_email = 'aegisaizph@gmail.com';
"
```

**See most recent activity:**
```bash
psql -U penghuizhang email_classifier <<SQL
SELECT 
  to_char(created_at, 'HH24:MI:SS') as time,
  classification,
  confidence_score::NUMERIC(5,2) as confidence,
  CASE WHEN is_quarantined THEN '✓' ELSE '✗' END as Q,
  substr(subject, 1, 30) as subject
FROM email_classifications
ORDER BY created_at DESC 
LIMIT 10;
SQL
```

---

## **🔵 Method 4: Full Database Export**

```bash
# Export to CSV file
psql -U penghuizhang email_classifier -c "
COPY (SELECT * FROM email_classifications ORDER BY created_at DESC) 
TO '/tmp/email_classifications.csv' 
WITH CSV HEADER;"

echo "Exported to /tmp/email_classifications.csv"
```

Open with Excel, Numbers, or Google Sheets

---

## **⚡ Useful Commands**

**Check if database is working:**
```bash
psql -U penghuizhang email_classifier -c "SELECT COUNT(*) FROM email_classifications;"
```

**Find specific subject:**
```bash
psql -U penghuizhang email_classifier -c "
SELECT * FROM email_classifications 
WHERE subject ILIKE '%security%';
"
```

**Get today's stats:**
```bash
psql -U penghuizhang email_classifier -c "
SELECT classification, COUNT(*) 
FROM email_classifications 
WHERE created_at::date = CURRENT_DATE 
GROUP BY classification;"
```

---

## **📖 Understanding Results**

**Our system quarantined if you see:**
- ✅ `classification` = `phish` or `spam` or `benign`
- ✅ `confidence_score` = number between 0.00-1.00 (e.g., 0.95)
- ✅ `is_quarantined` = `t` or `true`
- ✅ `action_taken` = `quarantined`
- ✅ `quarantined_at` = timestamp

**Gmail's native protection if you see:**
- ❌ No record in database
- ❌ Email in Spam but no database entry
- ❌ No confidence_score
- ❌ No quarantined_at timestamp

**Speed metrics:**
- `seconds_to_quarantine` = 0 → Instant (< 1 second)
- `seconds_to_quarantine` = 5 → Took 5 seconds
- Higher numbers → Delayed processing

---

## **🎯 Quick Test Flow**

1. Send test phishing email to yourself
2. Wait 60-90 seconds
3. Run: `./check_database.sh` → enter your email
4. Look for:
   - `classification: phish`
   - `confidence: 0.XX`
   - `quarantined: ✅ YES`
5. Check logs: `tail -f logs/combined.log`
6. Verify Gmail: Check Spam folder

---

**🎉 Your email WAS quarantined by our system!**
- Database shows confidence_score: 0.9500 (95% sure)
- is_quarantined: t (true)
- action_taken: quarantined  
- quarantined_at timestamp present
- Logs show matching processing time

**Perfect proof our system WORKS!** 🚀

