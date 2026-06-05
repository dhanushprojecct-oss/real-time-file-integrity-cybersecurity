from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, Alert
from utils import log_audit, get_client_ip

alerts_bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')


@alerts_bp.route('/', methods=['GET'])
@login_required
def get_alerts():
    severity = request.args.get('severity')
    resolved = request.args.get('resolved')
    event_type = request.args.get('event_type')
    search = request.args.get('search', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = Alert.query

    if severity:
        query = query.filter_by(severity=severity)
    if resolved is not None:
        resolved_bool = resolved.lower() == 'true'
        query = query.filter_by(resolved=resolved_bool)
    if event_type:
        query = query.filter_by(event_type=event_type)
    if search:
        query = query.filter(Alert.file_name.ilike(f'%{search}%'))
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            query = query.filter(Alert.timestamp >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.filter(Alert.timestamp <= dt)
        except ValueError:
            pass

    total = query.count()
    alerts = query.order_by(Alert.timestamp.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'alerts': [a.to_dict() for a in alerts],
        'total': total,
        'page': page,
        'per_page': per_page,
    }), 200


@alerts_bp.route('/stats', methods=['GET'])
@login_required
def alert_stats():
    total = Alert.query.count()
    active = Alert.query.filter_by(resolved=False).count()
    resolved = Alert.query.filter_by(resolved=True).count()
    critical = Alert.query.filter_by(severity='CRITICAL', resolved=False).count()
    high = Alert.query.filter_by(severity='HIGH', resolved=False).count()
    medium = Alert.query.filter_by(severity='MEDIUM', resolved=False).count()
    low = Alert.query.filter_by(severity='LOW', resolved=False).count()

    return jsonify({
        'total': total,
        'active': active,
        'resolved': resolved,
        'critical': critical,
        'high': high,
        'medium': medium,
        'low': low,
    }), 200


@alerts_bp.route('/<int:aid>/resolve', methods=['PUT'])
@login_required
def resolve_alert(aid):
    alert = Alert.query.get_or_404(aid)
    alert.resolved = True
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = current_user.id
    db.session.commit()

    log_audit(user_id=current_user.id, username=current_user.username,
              action='ALERT_RESOLVED', file_name=alert.file_name,
              details=f'Alert ID {aid} resolved', ip_address=get_client_ip(request))

    return jsonify({'message': 'Alert resolved', 'alert': alert.to_dict()}), 200


@alerts_bp.route('/<int:aid>', methods=['DELETE'])
@login_required
def delete_alert(aid):
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    alert = Alert.query.get_or_404(aid)
    db.session.delete(alert)
    db.session.commit()
    return jsonify({'message': 'Alert deleted'}), 200


@alerts_bp.route('/resolve-all', methods=['PUT'])
@login_required
def resolve_all():
    Alert.query.filter_by(resolved=False).update({'resolved': True, 'resolved_at': datetime.utcnow()})
    db.session.commit()
    log_audit(user_id=current_user.id, username=current_user.username,
              action='ALERTS_RESOLVED_ALL', ip_address=get_client_ip(request))
    return jsonify({'message': 'All alerts resolved'}), 200
