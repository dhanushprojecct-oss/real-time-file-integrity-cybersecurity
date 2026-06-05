from datetime import datetime, timedelta
from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from models import db, MonitoredFile, Alert, AuditLog
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


@dashboard_bp.route('/stats', methods=['GET'])
@login_required
def get_stats():
    from monitoring import get_monitoring_status
    monitor = get_monitoring_status()

    total_files = MonitoredFile.query.count()
    files_safe = MonitoredFile.query.filter_by(status='safe').count()
    files_compromised = MonitoredFile.query.filter_by(status='compromised').count()
    files_deleted = MonitoredFile.query.filter_by(status='deleted').count()

    # Files added in last 24h
    yesterday = datetime.utcnow() - timedelta(hours=24)
    files_added_today = MonitoredFile.query.filter(MonitoredFile.upload_time >= yesterday).count()

    active_alerts = Alert.query.filter_by(resolved=False).count()
    critical_alerts = Alert.query.filter_by(severity='CRITICAL', resolved=False).count()

    # Security score (simple calculation)
    if total_files == 0:
        security_score = 100
    else:
        safe_ratio = files_safe / total_files
        alert_penalty = min(active_alerts * 2, 30)
        security_score = max(0, int(safe_ratio * 100 - alert_penalty))

    return jsonify({
        'total_files': total_files,
        'files_safe': files_safe,
        'files_compromised': files_compromised,
        'files_deleted': files_deleted,
        'files_added_today': files_added_today,
        'active_alerts': active_alerts,
        'critical_alerts': critical_alerts,
        'security_score': security_score,
        'monitoring_status': monitor['status'],
        'monitoring_running': monitor['running'],
    }), 200


@dashboard_bp.route('/trend', methods=['GET'])
@login_required
def get_trend():
    """Return 7-day file event trend."""
    days = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        end = day.replace(hour=23, minute=59, second=59)

        files_uploaded = MonitoredFile.query.filter(
            MonitoredFile.upload_time.between(start, end)).count()
        alerts_count = Alert.query.filter(
            Alert.timestamp.between(start, end)).count()

        days.append({
            'date': day.strftime('%b %d'),
            'files': files_uploaded,
            'alerts': alerts_count,
        })

    return jsonify({'trend': days}), 200


@dashboard_bp.route('/recent-activity', methods=['GET'])
@login_required
def recent_activity():
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(15).all()
    return jsonify({'activity': [l.to_dict() for l in logs]}), 200


@dashboard_bp.route('/alert-distribution', methods=['GET'])
@login_required
def alert_distribution():
    result = db.session.query(
        Alert.severity, func.count(Alert.id).label('count')
    ).group_by(Alert.severity).all()

    dist = {row.severity: row.count for row in result}
    return jsonify({
        'CRITICAL': dist.get('CRITICAL', 0),
        'HIGH': dist.get('HIGH', 0),
        'MEDIUM': dist.get('MEDIUM', 0),
        'LOW': dist.get('LOW', 0),
    }), 200
