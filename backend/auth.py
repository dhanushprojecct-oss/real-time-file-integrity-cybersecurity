from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from utils import log_audit, get_client_ip

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '')
    remember = data.get('remember', False)
    ip = get_client_ip(request)

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    user = User.query.filter_by(username=username).first()

    if not user:
        log_audit(username=username, action='LOGIN_FAILED',
                  details='User not found', ip_address=ip, status='failed')
        return jsonify({'error': 'Invalid credentials'}), 401

    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds() / 60)
        return jsonify({
            'error': f'Account locked. Try again in {remaining} minutes.',
            'locked': True
        }), 403

    # Verify password
    if not check_password_hash(user.password_hash, password):
        user.failed_attempts = (user.failed_attempts or 0) + 1
        max_attempts = current_app.config.get('MAX_LOGIN_ATTEMPTS', 5)

        if user.failed_attempts >= max_attempts:
            lockout_minutes = current_app.config.get('LOCKOUT_DURATION_MINUTES', 30)
            user.locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
            db.session.commit()
            log_audit(user_id=user.id, username=username, action='ACCOUNT_LOCKED',
                      details=f'Locked after {max_attempts} failed attempts',
                      ip_address=ip, status='warning')
            return jsonify({
                'error': f'Account locked for {lockout_minutes} minutes due to repeated failures.',
                'locked': True
            }), 403

        db.session.commit()
        remaining_attempts = max_attempts - user.failed_attempts
        log_audit(user_id=user.id, username=username, action='LOGIN_FAILED',
                  details=f'Wrong password. {remaining_attempts} attempts left',
                  ip_address=ip, status='failed')
        return jsonify({
            'error': f'Invalid credentials. {remaining_attempts} attempts remaining.',
            'attempts_left': remaining_attempts
        }), 401

    # Successful login
    user.failed_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.session.commit()

    login_user(user, remember=remember)
    log_audit(user_id=user.id, username=username, action='LOGIN',
              details='Successful login', ip_address=ip, status='success')

    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict()
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    ip = get_client_ip(request)
    log_audit(user_id=current_user.id, username=current_user.username,
              action='LOGOUT', details='User logged out', ip_address=ip)
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
@login_required
def me():
    return jsonify({'user': current_user.to_dict()}), 200


@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    ip = get_client_ip(request)

    if not check_password_hash(current_user.password_hash, current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    current_user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    log_audit(user_id=current_user.id, username=current_user.username,
              action='PASSWORD_CHANGED', ip_address=ip)
    return jsonify({'message': 'Password changed successfully'}), 200


@auth_bp.route('/users', methods=['GET'])
@login_required
def get_users():
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    users = User.query.all()
    return jsonify({'users': [u.to_dict() for u in users]}), 200


@auth_bp.route('/users', methods=['POST'])
@login_required
def create_user():
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    role = data.get('role', 'analyst')
    email = data.get('email', '')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
    )
    db.session.add(user)
    db.session.commit()

    log_audit(user_id=current_user.id, username=current_user.username,
              action='USER_CREATED', details=f'Created user: {username}',
              ip_address=get_client_ip(request))
    return jsonify({'message': 'User created', 'user': user.to_dict()}), 201


@auth_bp.route('/users/<int:uid>', methods=['DELETE'])
@login_required
def delete_user(uid):
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    if uid == current_user.id:
        return jsonify({'error': 'Cannot delete yourself'}), 400

    user = User.query.get_or_404(uid)
    username = user.username
    db.session.delete(user)
    db.session.commit()

    log_audit(user_id=current_user.id, username=current_user.username,
              action='USER_DELETED', details=f'Deleted user: {username}',
              ip_address=get_client_ip(request))
    return jsonify({'message': f'User {username} deleted'}), 200


@auth_bp.route('/users/<int:uid>/role', methods=['PUT'])
@login_required
def update_user_role(uid):
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    role = data.get('role', 'analyst')
    user = User.query.get_or_404(uid)
    user.role = role
    db.session.commit()
    return jsonify({'message': 'Role updated', 'user': user.to_dict()}), 200


# ── Email / Notification endpoints ─────────────────────────────────────────────

@auth_bp.route('/me/email', methods=['PUT'])
@login_required
def update_email():
    """Update the logged-in user's notification email address."""
    data = request.get_json()
    email = data.get('email', '').strip().lower()

    if email and '@' not in email:
        return jsonify({'error': 'Invalid email address'}), 400

    current_user.email = email or None
    db.session.commit()

    log_audit(user_id=current_user.id, username=current_user.username,
              action='EMAIL_UPDATED',
              details=f'Notification email set to: {email or "removed"}',
              ip_address=get_client_ip(request))

    return jsonify({'message': 'Email updated', 'user': current_user.to_dict()}), 200


@auth_bp.route('/test-email', methods=['POST'])
@login_required
def test_email():
    """Send a test alert email to the current user's registered email."""
    from email_service import send_alert_email

    email = current_user.email
    if not email:
        return jsonify({'error': 'No email address set. Please update your profile email first.'}), 400

    if email.endswith('.local') or email.endswith('example.com'):
        return jsonify({'error': 'Please set a real email address before sending a test.'}), 400

    success = send_alert_email(
        to_email=email,
        event_type='modified',
        file_name='test_document.pdf',
        severity='HIGH',
        description=(
            'This is a TEST alert from your File Integrity Monitoring System Using Cybersecurity. '
            'If you received this, email notifications are working correctly!'
        ),
        timestamp=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
        app=current_app,
    )

    if success:
        return jsonify({'message': f'Test email sent to {email}'}), 200
    else:
        return jsonify({
            'error': 'Failed to send email. Check SMTP credentials in .env file.'
        }), 500

