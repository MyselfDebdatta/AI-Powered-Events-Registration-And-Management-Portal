"""QR code generation service."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import qrcode
from qrcode.image.pil import PilImage

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_qr_code(participant_id: int, name: str) -> str:
    """Generate a QR code PNG for a participant and return the relative file path."""
    data = json.dumps({"participant_id": participant_id, "name": name})
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img: PilImage = qr.make_image(fill_color="black", back_color="white")

    out_dir = settings.qrcodes_dir
    filename = f"{participant_id}.png"
    filepath = out_dir / filename
    img.save(str(filepath))
    logger.info("QR code saved to %s", filepath)

    return f"uploads/qrcodes/{filename}"
