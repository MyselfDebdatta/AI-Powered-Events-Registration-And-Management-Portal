"""Email service — sends QR codes to participants via SMTP."""

from __future__ import annotations

import logging
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_qr_email(
    to_email: str,
    participant_name: str,
    qr_code_path: str,
) -> None:
    """Send a registration-confirmation email with the QR code attached inline.

    If SMTP is not configured, logs a warning and returns silently.
    """
    if not settings.smtp_configured:
        logger.warning("SMTP not configured — skipping email to %s", to_email)
        return

    qr_file = Path(qr_code_path)
    if not qr_file.exists():
        logger.error("QR code file not found: %s", qr_code_path)
        return

    msg = MIMEMultipart("related")
    msg["Subject"] = "Odisha AI Symposium — Your Registration QR Code"
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email

    html_body = f"""\
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to the Odisha AI Symposium, {participant_name}!</h2>
        <p>Your registration is confirmed. Please present the QR code below at the event for check-in:</p>
        <p><img src="cid:qrcode" alt="QR Code" style="width:250px; height:250px;" /></p>
        <p>We look forward to seeing you!</p>
        <hr />
        <p style="color:#888; font-size:12px;">This is an automated message from GeekAI.</p>
    </body>
    </html>
    """
    msg.attach(MIMEText(html_body, "html"))

    with open(qr_file, "rb") as f:
        img = MIMEImage(f.read(), _subtype="png")
    img.add_header("Content-ID", "<qrcode>")
    img.add_header("Content-Disposition", "inline", filename="qrcode.png")
    msg.attach(img)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_USE_TLS,
        )
        logger.info("Registration email sent to %s", to_email)
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
