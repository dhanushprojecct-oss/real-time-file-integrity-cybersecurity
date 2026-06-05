import os
import threading
import time
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# These will be injected at startup
_app = None
_socketio = None
_monitor_thread = None
_observer = None
_running = False


def init_monitoring(app, socketio):
    global _app, _socketio
    _app = app
    _socketio = socketio


class FIMEventHandler(FileSystemEventHandler):
    """Watchdog handler that detects file system changes and generates alerts."""

    def __init__(self, app, socketio):
        super().__init__()
        self.app = app
        self.socketio = socketio
        # Track recent modifications per file path to detect CRITICAL bursts
        self._recent_mods = {}

    def _with_context(self, func, *args, **kwargs):
        with self.app.app_context():
            func(*args, **kwargs)

    def on_created(self, event):
        if event.is_directory:
            return
        threading.Thread(target=self._with_context,
                         args=(self._handle_created, event.src_path)).start()

    def on_modified(self, event):
        if event.is_directory:
            return
        threading.Thread(target=self._with_context,
                         args=(self._handle_modified, event.src_path)).start()

    def on_deleted(self, event):
        if event.is_directory:
            return
        threading.Thread(target=self._with_context,
                         args=(self._handle_deleted, event.src_path)).start()

    def _handle_created(self, path):
        from models import db, MonitoredFile, User
        from utils import compute_sha256, create_alert, log_audit
        from email_service import send_alert_email_async

        file_name = os.path.basename(path)
        # Only care about files already tracked OR new files in uploads
        existing = MonitoredFile.query.filter_by(file_path=path).first()
        if not existing:
            return  # Not a tracked file

        description = f'New file detected in monitored directory: {file_name}'
        alert = create_alert(
            file_id=existing.id,
            file_name=file_name,
            event_type='added',
            severity='LOW',
            description=description,
        )
        log_audit(action='FILE_ADDED', file_name=file_name,
                  event_type='added', details=path, status='success')

        # ── Send email to file owner ───────────────────────────────────────────
        if existing.uploaded_by:
            owner = User.query.get(existing.uploaded_by)
            if owner and owner.email:
                send_alert_email_async(
                    to_email=owner.email,
                    event_type='added',
                    file_name=file_name,
                    severity='LOW',
                    description=description,
                    timestamp=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
                    app=self.app,
                )

        if self.socketio and alert:
            self.socketio.emit('new_alert', alert.to_dict(), namespace='/')
            self.socketio.emit('file_event', {
                'type': 'added', 'file_name': file_name, 'path': path,
                'timestamp': datetime.utcnow().isoformat()
            }, namespace='/')

    def _handle_modified(self, path):
        from models import db, MonitoredFile, User
        from utils import compute_sha256, create_alert, log_audit
        from email_service import send_alert_email_async

        file_name = os.path.basename(path)
        existing = MonitoredFile.query.filter_by(file_path=path).first()
        if not existing:
            return

        time.sleep(0.5)  # Brief pause to ensure file write is complete

        if not os.path.exists(path):
            return

        new_hash = compute_sha256(path)
        if not new_hash:
            return

        # Track modification times for CRITICAL severity detection
        now = time.time()
        history = self._recent_mods.get(path, [])
        history = [t for t in history if now - t < 60]  # last 60 seconds
        history.append(now)
        self._recent_mods[path] = history
        is_critical = len(history) >= 3

        if new_hash != existing.original_hash:
            existing.current_hash = new_hash
            existing.status = 'compromised'
            existing.last_checked = datetime.utcnow()
            db.session.commit()

            severity = 'CRITICAL' if is_critical else 'HIGH'
            description = (
                f'File integrity violation: {file_name}. '
                f'Original hash: {existing.original_hash[:24]}... | '
                f'New hash: {new_hash[:24]}...'
            )
            if is_critical:
                description += ' CRITICAL: Multiple rapid modifications detected.'

            alert = create_alert(
                file_id=existing.id,
                file_name=file_name,
                event_type='critical' if is_critical else 'modified',
                severity=severity,
                description=description,
            )
            log_audit(action='INTEGRITY_VIOLATION', file_name=file_name,
                      event_type='modified', details=description, status='warning')

            # ── Send email to file owner ───────────────────────────────────────
            if existing.uploaded_by:
                owner = User.query.get(existing.uploaded_by)
                if owner and owner.email:
                    send_alert_email_async(
                        to_email=owner.email,
                        event_type='critical' if is_critical else 'modified',
                        file_name=file_name,
                        severity=severity,
                        description=description,
                        timestamp=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
                        app=self.app,
                    )

            if self.socketio and alert:
                self.socketio.emit('new_alert', alert.to_dict(), namespace='/')
                self.socketio.emit('file_event', {
                    'type': 'modified', 'file_name': file_name, 'path': path,
                    'severity': severity, 'old_hash': existing.original_hash,
                    'new_hash': new_hash, 'timestamp': datetime.utcnow().isoformat()
                }, namespace='/')
        else:
            existing.current_hash = new_hash
            existing.status = 'safe'
            existing.last_checked = datetime.utcnow()
            db.session.commit()

    def _handle_deleted(self, path):
        from models import db, MonitoredFile, User
        from utils import create_alert, log_audit
        from email_service import send_alert_email_async

        file_name = os.path.basename(path)
        existing = MonitoredFile.query.filter_by(file_path=path).first()
        if not existing:
            return

        existing.status = 'deleted'
        existing.last_checked = datetime.utcnow()
        db.session.commit()

        description = f'Monitored file was deleted from disk: {file_name}. Immediate attention required.'
        alert = create_alert(
            file_id=existing.id,
            file_name=file_name,
            event_type='deleted',
            severity='MEDIUM',
            description=description,
        )
        log_audit(action='FILE_DELETED', file_name=file_name,
                  event_type='deleted', details=path, status='warning')

        # ── Send email to file owner ───────────────────────────────────────────
        if existing.uploaded_by:
            owner = User.query.get(existing.uploaded_by)
            if owner and owner.email:
                send_alert_email_async(
                    to_email=owner.email,
                    event_type='deleted',
                    file_name=file_name,
                    severity='MEDIUM',
                    description=description,
                    timestamp=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
                    app=self.app,
                )

        if self.socketio and alert:
            self.socketio.emit('new_alert', alert.to_dict(), namespace='/')
            self.socketio.emit('file_event', {
                'type': 'deleted', 'file_name': file_name, 'path': path,
                'timestamp': datetime.utcnow().isoformat()
            }, namespace='/')


def start_monitoring(app, socketio, watch_path: str):
    global _observer, _running

    if _running:
        return {'status': 'already_running'}

    os.makedirs(watch_path, exist_ok=True)

    event_handler = FIMEventHandler(app, socketio)
    _observer = Observer()
    _observer.schedule(event_handler, watch_path, recursive=True)
    _observer.start()
    _running = True

    return {'status': 'started', 'path': watch_path}


def stop_monitoring():
    global _observer, _running

    if _observer and _running:
        _observer.stop()
        _observer.join()
        _running = False
        return {'status': 'stopped'}
    return {'status': 'not_running'}


def get_monitoring_status():
    return {
        'running': _running,
        'status': 'ACTIVE' if _running else 'INACTIVE',
    }


# ── Blueprint ──────────────────────────────────────────────────────────────────
from flask import Blueprint
from flask_login import login_required

monitoring_bp = Blueprint('monitoring', __name__, url_prefix='/api/monitoring')


@monitoring_bp.route('/status', methods=['GET'])
@login_required
def status():
    return __import__('flask').jsonify(get_monitoring_status()), 200


@monitoring_bp.route('/start', methods=['POST'])
@login_required
def start():
    if __import__('flask_login').current_user.role != 'admin':
        return __import__('flask').jsonify({'error': 'Admin only'}), 403
    result = start_monitoring(_app, _socketio,
                              _app.config['UPLOAD_FOLDER'])
    return __import__('flask').jsonify(result), 200


@monitoring_bp.route('/stop', methods=['POST'])
@login_required
def stop():
    if __import__('flask_login').current_user.role != 'admin':
        return __import__('flask').jsonify({'error': 'Admin only'}), 403
    result = stop_monitoring()
    return __import__('flask').jsonify(result), 200
