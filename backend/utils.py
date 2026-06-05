import hashlib
import os
from datetime import datetime
from models import db, AuditLog, Alert, MonitoredFile


def compute_sha256(filepath: str) -> str:
    """Compute SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        return sha256.hexdigest()
    except (OSError, IOError):
        return ''


def log_audit(user_id=None, username=None, action='', file_name=None,
              event_type=None, details=None, ip_address=None, status='success'):
    """Write a record to the audit log table."""
    log = AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        file_name=file_name,
        event_type=event_type,
        details=details,
        ip_address=ip_address,
        status=status,
        timestamp=datetime.utcnow(),
    )
    db.session.add(log)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()


def create_alert(file_id=None, file_name=None, event_type='', severity='LOW', description=''):
    """Insert a new alert record."""
    alert = Alert(
        file_id=file_id,
        file_name=file_name,
        event_type=event_type,
        severity=severity,
        description=description,
        timestamp=datetime.utcnow(),
    )
    db.session.add(alert)
    try:
        db.session.commit()
        return alert
    except Exception:
        db.session.rollback()
        return None


def allowed_file(filename: str, allowed_extensions: set) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


def format_file_size(size_bytes: int) -> str:
    """Human-readable file size."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / (1024 ** 2):.1f} MB"
    return f"{size_bytes / (1024 ** 3):.1f} GB"


def get_severity_for_event(event_type: str) -> str:
    mapping = {
        'added': 'LOW',
        'modified': 'HIGH',
        'deleted': 'MEDIUM',
        'critical': 'CRITICAL',
    }
    return mapping.get(event_type.lower(), 'LOW')


def get_client_ip(request) -> str:
    """Extract client IP from request, considering proxies."""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr or '127.0.0.1'
