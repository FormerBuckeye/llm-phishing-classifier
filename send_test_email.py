import smtplib
from email.mime.text import MIMEText
import sys

# Non-interactive version - pass email and app password as arguments
if len(sys.argv) != 3:
    print("Usage: python3 send_test_email.py <YOUR_EMAIL@gmail.com> <APP_PASSWORD>")
    print("\nTo get App Password:")
    print("1. Go to: https://myaccount.google.com/apppasswords")
    print("2. Generate a new App Password")
    print("3. Use it here (without spaces)")
    sys.exit(1)

to_email = sys.argv[1]
app_password = sys.argv[2]
from_email = "security-alert@chase-bank-verify.com"

print(f"\n📧 Sending test phishing email to: {to_email}")
print(f"   From: {from_email}")
print(f"   Subject: SECURITY ALERT: Unauthorized Access Detected")

# Create phishing email
msg = MIMEText("""
ACCOUNT SECURITY ALERT

Your account has been compromised. Immediate action required.

Click here to verify your identity: http://suspicious-login-site.com/verify

Enter your username and password to secure your account.

Urgently,
Security Team
""")

msg['Subject'] = 'SECURITY ALERT: Unauthorized Access Detected'
msg['From'] = from_email
msg['To'] = to_email

try:
    print("\n🔗 Connecting to Gmail SMTP...")
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    print("🔐 Logging in...")
    server.login(to_email, app_password)
    
    print("📤 Sending email...")
    server.send_message(msg)
    server.quit()
    
    print("\n✅ SUCCESS! Test phishing email sent!")
    print(f"\n📊 Details:")
    print(f"   - To: {to_email}")
    print(f"   - From: {from_email}")
    print(f"   - Subject: {msg['Subject']}")
    print(f"\n⏱  Wait 60-90 seconds for classification...")
    print(f"   Then check: logs/combined.log")
    
except smtplib.SMTPAuthenticationError:
    print("\n❌ Authentication failed!")
    print("   - Make sure you have 2FA enabled on Gmail")
    print("   - Use App Password, not regular password")
    print("   - Generate at: https://myaccount.google.com/apppasswords")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Error: {e}")
    sys.exit(1)

