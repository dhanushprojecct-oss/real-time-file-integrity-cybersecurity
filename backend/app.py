import os

from datetime import datetime
from flask import Flask, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_login import LoginManager
from flask_socketio import SocketIO

# Path to the React production build
FRONTEND_DIST = os.path.join(os.path.abspath(os.path.dirname(__file__)), '..', 'frontend', 'dist')

from config import config
from models import db, User
from werkzeug.security import generate_password_hash

# ── Extensions ────────────────────────────────────────────────────────────────
login_manager = LoginManager()
socketio = SocketIO()


def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Ensure folders exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['REPORTS_FOLDER'], exist_ok=True)

    # Init extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.session_protection = 'strong'

    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)
    socketio.init_app(app, cors_allowed_origins='*',
                      async_mode='threading',
                      logger=False, engineio_logger=False)

    # Register blueprints
    from auth import auth_bp
    from files import files_bp
    from monitoring import monitoring_bp
    from alerts import alerts_bp
    from audit import audit_bp
    from reports import reports_bp
    from dashboard import dashboard_bp

    for bp in [auth_bp, files_bp, monitoring_bp, alerts_bp, audit_bp, reports_bp, dashboard_bp]:
        app.register_blueprint(bp)

    # ── Database setup ─────────────────────────────────────────────────────────
    with app.app_context():
        db.create_all()
        _seed_admin(app)

    # ── Start Watchdog monitor ─────────────────────────────────────────────────
    from monitoring import init_monitoring, start_monitoring
    init_monitoring(app, socketio)
    with app.app_context():
        start_monitoring(app, socketio, app.config['UPLOAD_FOLDER'])

    # ── SocketIO events ────────────────────────────────────────────────────────
    @socketio.on('connect')
    def handle_connect():
        pass

    @socketio.on('disconnect')
    def handle_disconnect():
        pass

    # ── Health check ───────────────────────────────────────────────────────────
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'time': datetime.utcnow().isoformat()}), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'error': 'Authentication required'}), 401

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    # ── Serve React frontend ───────────────────────────────────────────────────
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        """Serve the React production build. API routes are handled above."""
        if path.startswith('api/') or path.startswith('socket.io'):
            return jsonify({'error': 'Not found'}), 404
        file_path = os.path.join(FRONTEND_DIST, path)
        if path and os.path.exists(file_path):
            return send_from_directory(FRONTEND_DIST, path)
        # For client-side routing, always serve index.html
        index_path = os.path.join(FRONTEND_DIST, 'index.html')
        if os.path.exists(index_path):
            return send_file(index_path)
        return jsonify({'error': 'Frontend build not found. Run: npm run build in frontend/'}), 404

    return app


def _seed_admin(app):
    """Create default admin user if no users exist."""
    if User.query.count() == 0:
        admin = User(
            username='admin',
            email='admin@filesecurity.local',
            password_hash=generate_password_hash('admin123'),
            role='admin',
        )
        analyst = User(
            username='analyst',
            email='analyst@filesecurity.local',
            password_hash=generate_password_hash('analyst123'),
            role='analyst',
        )
        db.session.add_all([admin, analyst])
        db.session.commit()
        print('[FIM] Seeded default users: admin/admin123  analyst/analyst123')


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({'error': 'Authentication required', 'redirect': '/login'}), 401


if __name__ == '__main__':
    app = create_app('development')
    print('\n' + '='*60)
    print('  File Integrity Monitoring System Using Cybersecurity')
    print('  Backend running at http://localhost:5000')
    print('  Default credentials:  admin / admin123')
    print('='*60 + '\n')
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False, allow_unsafe_werkzeug=True)
