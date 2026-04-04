import smtplib
from email.mime.text import MIMEText
import getpass

# Configuration
smtp_server = "smtp.gmail.com"
smtp_port = 587
to_email = input("Enter the email to send TO (your Gmail): ").strip()
from_email = input("Enter sender FROM (fake sender): ").strip() or "security-alert@chase-bank-verify.com"

# Ask for Gmail password
print("Enter your Gmail App Password (not regular password)")
print("Get it from: https://myaccount.google.com/apppasswords")
password = input("App Password: ").strip()

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
    print("\nConnecting to Gmail SMTP...")
    server = smtplib.SMTP(smtp_server, smtp_port)
    server.starttls()
    server.login(to_email, password)
    
    print(f"Sending phishing test email to {to_email}...")
    server.send_message(msg)
    server.quit()
    
    print("✅ Test email sent successfully!")
    print(f"\nDetails:")
    print(f"  To: {to_email}")
    print(f"  From: {from_email}")
    print(f"  Subject: {msg['Subject']}")
    print("\nNow wait 60-90 seconds for the system to process it...")
    
except Exception as e:
    print(f"\n❌ Error sending email: {e}")
    print("\nAlternative: Just create a new email in gmail.com with:")
    print(f"  To: {to_email}")
    print(f"  From: {from_email}")
    print(f"  Subject: SECURITY ALERT: Unauthorized Access Detected")
    print(f"  Body: [Copy the suspicious email content from above]")

