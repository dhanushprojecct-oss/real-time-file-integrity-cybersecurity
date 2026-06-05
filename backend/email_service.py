"""
email_service.py — File Integrity Monitoring System Using Cybersecurity
Email Notification Service — Sends rich HTML alert emails via SMTP when file events are detected.
Uses Python's built-in smtplib — no extra packages required.
"""

import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime


# ── Severity color map ─────────────────────────────────────────────────────────
_SEVERITY_COLORS = {
    'CRITICAL': '#ff1744',
    'HIGH':     '#ff6d00',
    'MEDIUM':   '#ffd600',
    'LOW':      '#00e676',
}

_EVENT_ICONS = {
    'modified': '[MODIFIED]',
    'deleted':  '[DELETED]',
    'added':    '[ADDED]',
    'critical': '[CRITICAL]',
}


def _build_html(event_type: str, file_name: str, severity: str,
                description: str, timestamp: str) -> str:
    """Build a styled HTML email body."""
    color = _SEVERITY_COLORS.get(severity, '#00b4d8')
    icon  = _EVENT_ICONS.get(event_type.lower(), '⚠️')

    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Integrity Monitoring System — Security Alert</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#0d1627;border-radius:16px;overflow:hidden;
                      border:1px solid #1e3a5f;max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d1627 0%,#0a2240 100%);
                       padding:32px 40px;border-bottom:2px solid {color};">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-flex;align-items:center;gap:12px;">
                      <span style="font-size:32px;">{icon}</span>
                      <div>
                        <p style="margin:0;font-size:11px;color:#6b8bb5;letter-spacing:3px;
                                  text-transform:uppercase;">Security Alert</p>
                        <h1 style="margin:4px 0 0;font-size:22px;color:#e0e6f0;font-weight:700;">
                          File Integrity Monitoring System
                        </h1>
                      </div>
                    </div>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:6px 14px;border-radius:20px;
                                 background:{color}22;border:1px solid {color};
                                 color:{color};font-size:12px;font-weight:700;
                                 letter-spacing:1px;">
                      {severity}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:{color}18;padding:16px 40px;
                       border-bottom:1px solid {color}33;">
              <p style="margin:0;font-size:15px;font-weight:600;color:{color};">
                {icon}&nbsp; FILE {event_type.upper()} DETECTED
              </p>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- File Name -->
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="140" style="color:#6b8bb5;font-size:12px;
                                               text-transform:uppercase;letter-spacing:1px;">
                          File Name
                        </td>
                        <td style="color:#e0e6f0;font-size:14px;font-weight:600;
                                   font-family:monospace;">
                          {file_name}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Event Type -->
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="140" style="color:#6b8bb5;font-size:12px;
                                               text-transform:uppercase;letter-spacing:1px;">
                          Event Type
                        </td>
                        <td style="color:#e0e6f0;font-size:14px;font-weight:600;">
                          {event_type.capitalize()}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Timestamp -->
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="140" style="color:#6b8bb5;font-size:12px;
                                               text-transform:uppercase;letter-spacing:1px;">
                          Timestamp
                        </td>
                        <td style="color:#e0e6f0;font-size:14px;">
                          {timestamp}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Severity -->
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="140" style="color:#6b8bb5;font-size:12px;
                                               text-transform:uppercase;letter-spacing:1px;">
                          Severity
                        </td>
                        <td>
                          <span style="display:inline-block;padding:3px 10px;border-radius:12px;
                                       background:{color}22;border:1px solid {color};
                                       color:{color};font-size:12px;font-weight:700;">
                            {severity}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Description -->
                <tr>
                  <td style="padding:16px 0 0;">
                    <p style="margin:0 0 8px;color:#6b8bb5;font-size:12px;
                               text-transform:uppercase;letter-spacing:1px;">
                      Details
                    </p>
                    <div style="background:#0a1628;border-radius:10px;padding:16px;
                                border-left:3px solid {color};border:1px solid #1e3a5f;">
                      <p style="margin:0;color:#a8c0d6;font-size:13px;
                                 line-height:1.6;font-family:monospace;">
                        {description}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:0 40px 32px;" align="center">
              <a href="http://localhost:5173/alerts"
                 style="display:inline-block;padding:14px 32px;border-radius:10px;
                        background:linear-gradient(135deg,#0066cc,#0099ff);
                        color:#ffffff;font-size:14px;font-weight:600;
                        text-decoration:none;letter-spacing:0.5px;">
                🔍 View in Dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#060d1a;padding:20px 40px;
                       border-top:1px solid #1e3a5f;">
              <p style="margin:0;font-size:11px;color:#3d5a80;text-align:center;">
                This is an automated alert from the File Integrity Monitoring System Using Cybersecurity.
                <br>Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def send_alert_email(to_email: str, event_type: str, file_name: str,
                     severity: str, description: str,
                     timestamp: str = None, app=None) -> bool:
    """
    Send an HTML alert email to `to_email`.
    Runs synchronously — call via threading.Thread for non-blocking use.
    Returns True on success, False on failure.
    """
    if not to_email or '@' not in to_email:
        return False

    # Skip placeholder/fake emails
    if to_email.endswith('.local') or to_email.endswith('example.com'):
        print(f'[EMAIL] Skipped non-real email: {to_email}')
        return False

    if timestamp is None:
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

    # Get SMTP config from Flask app config or environment
    if app:
        cfg = app.config
    else:
        import os
        cfg = {
            'MAIL_SERVER':   os.environ.get('MAIL_SERVER', 'smtp.gmail.com'),
            'MAIL_PORT':     int(os.environ.get('MAIL_PORT', 587)),
            'MAIL_USERNAME': os.environ.get('MAIL_USERNAME', ''),
            'MAIL_PASSWORD': os.environ.get('MAIL_PASSWORD', ''),
            'MAIL_FROM':     os.environ.get('MAIL_FROM', ''),
        }

    mail_server   = cfg.get('MAIL_SERVER', 'smtp.gmail.com')
    mail_port     = int(cfg.get('MAIL_PORT', 587))
    mail_username = cfg.get('MAIL_USERNAME', '')
    mail_password = cfg.get('MAIL_PASSWORD', '')
    mail_from     = cfg.get('MAIL_FROM', mail_username)

    if not mail_username or not mail_password:
        print('[EMAIL] SMTP credentials not configured. Skipping email.')
        return False

    subject = f'[FIM Alert] {severity} — {event_type.capitalize()}: {file_name}'

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = f'FIM Security <{mail_from}>'
    msg['To']      = to_email

    # Plain text fallback
    plain = (
        f'FIM SECURITY ALERT\n'
        f'==================\n'
        f'Event:       {event_type.upper()}\n'
        f'File:        {file_name}\n'
        f'Severity:    {severity}\n'
        f'Time:        {timestamp}\n'
        f'Details:     {description}\n\n'
        f'View dashboard: http://localhost:5173/alerts\n'
    )
    msg.attach(MIMEText(plain, 'plain'))
    msg.attach(MIMEText(
        _build_html(event_type, file_name, severity, description, timestamp),
        'html'
    ))

    try:
        with smtplib.SMTP(mail_server, mail_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(mail_username, mail_password)
            server.sendmail(mail_from, [to_email], msg.as_string())
        print(f'[EMAIL] ✅ Alert sent to {to_email} — {event_type} | {file_name}')
        return True
    except smtplib.SMTPAuthenticationError:
        print('[EMAIL] ❌ SMTP authentication failed. Check MAIL_USERNAME and MAIL_PASSWORD in .env')
        return False
    except smtplib.SMTPException as e:
        print(f'[EMAIL] ❌ SMTP error: {e}')
        return False
    except Exception as e:
        print(f'[EMAIL] ❌ Unexpected error: {e}')
        return False


def send_alert_email_async(to_email: str, event_type: str, file_name: str,
                           severity: str, description: str,
                           timestamp: str = None, app=None):
    """
    Fire-and-forget: sends the alert email in a background thread
    so monitoring is never blocked.
    """
    t = threading.Thread(
        target=send_alert_email,
        args=(to_email, event_type, file_name, severity, description, timestamp, app),
        daemon=True,
    )
    t.start()
    return t
