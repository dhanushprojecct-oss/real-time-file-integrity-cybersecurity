import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from models import db, MonitoredFile
from utils import compute_sha256, log_audit, create_alert, allowed_file, get_client_ip

files_bp = Blueprint('files', __name__, url_prefix='/api/files')


@files_bp.route('/upload', methods=['POST'])
@login_required
def upload_files():
    if 'files' not in request.files:
        return jsonify({'error': 'No files in request'}), 400

    uploaded_files = request.files.getlist('files')
    if not uploaded_files:
        return jsonify({'error': 'No files selected'}), 400

    upload_folder = current_app.config['UPLOAD_FOLDER']
    allowed_ext = current_app.config['ALLOWED_EXTENSIONS']
    ip = get_client_ip(request)
    results = []

    for file in uploaded_files:
        if not file or file.filename == '':
            continue

        filename = secure_filename(file.filename)
        if not allowed_file(filename, allowed_ext):
            results.append({'file_name': filename, 'status': 'rejected', 'reason': 'Extension not allowed'})
            continue

        # Create user-specific subfolder
        user_folder = os.path.join(upload_folder, str(current_user.id))
        os.makedirs(user_folder, exist_ok=True)

        # Handle duplicate filenames
        save_path = os.path.join(user_folder, filename)
        if os.path.exists(save_path):
            base, ext = os.path.splitext(filename)
            ts = datetime.utcnow().strftime('%Y%m%d%H%M%S')
            filename = f"{base}_{ts}{ext}"
            save_path = os.path.join(user_folder, filename)

        file.save(save_path)

        file_size = os.path.getsize(save_path)
        file_hash = compute_sha256(save_path)
        file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'unknown'

        monitored = MonitoredFile(
            file_name=filename,
            file_path=save_path,
            file_size=file_size,
            original_hash=file_hash,
            current_hash=file_hash,
            status='safe',
            upload_time=datetime.utcnow(),
            uploaded_by=current_user.id,
            file_type=file_ext,
            is_monitored=True,
        )
        db.session.add(monitored)
        db.session.flush()

        log_audit(
            user_id=current_user.id,
            username=current_user.username,
            action='FILE_UPLOAD',
            file_name=filename,
            event_type='upload',
            details=f'Size: {file_size} bytes, Hash: {file_hash[:16]}...',
            ip_address=ip,
        )

        results.append({
            'file_name': filename,
            'file_size': file_size,
            'hash': file_hash,
            'status': 'uploaded',
            'id': monitored.id,
        })

    db.session.commit()
    return jsonify({'message': f'{len(results)} file(s) processed', 'files': results}), 201


@files_bp.route('/', methods=['GET'])
@login_required
def get_files():
    status_filter = request.args.get('status')
    search = request.args.get('search', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    query = MonitoredFile.query

    # Non-admin sees only their files
    if current_user.role != 'admin':
        query = query.filter_by(uploaded_by=current_user.id)

    if status_filter:
        query = query.filter_by(status=status_filter)
    if search:
        query = query.filter(MonitoredFile.file_name.ilike(f'%{search}%'))

    total = query.count()
    files = query.order_by(MonitoredFile.upload_time.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'files': [f.to_dict() for f in files],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page,
    }), 200


@files_bp.route('/<int:fid>', methods=['GET'])
@login_required
def get_file(fid):
    f = MonitoredFile.query.get_or_404(fid)
    return jsonify({'file': f.to_dict()}), 200


@files_bp.route('/<int:fid>', methods=['DELETE'])
@login_required
def delete_file(fid):
    f = MonitoredFile.query.get_or_404(fid)
    if current_user.role != 'admin' and f.uploaded_by != current_user.id:
        return jsonify({'error': 'Permission denied'}), 403

    ip = get_client_ip(request)
    log_audit(user_id=current_user.id, username=current_user.username,
              action='FILE_DELETED', file_name=f.file_name, ip_address=ip)

    # Remove physical file
    try:
        if os.path.exists(f.file_path):
            os.remove(f.file_path)
    except OSError:
        pass

    db.session.delete(f)
    db.session.commit()
    return jsonify({'message': f'File {f.file_name} deleted'}), 200


@files_bp.route('/<int:fid>/verify', methods=['POST'])
@login_required
def verify_file(fid):
    f = MonitoredFile.query.get_or_404(fid)
    ip = get_client_ip(request)

    if not os.path.exists(f.file_path):
        f.status = 'deleted'
        f.last_checked = datetime.utcnow()
        db.session.commit()

        create_alert(
            file_id=f.id,
            file_name=f.file_name,
            event_type='deleted',
            severity='MEDIUM',
            description=f'File {f.file_name} not found on disk during verification.',
        )
        log_audit(user_id=current_user.id, username=current_user.username,
                  action='FILE_VERIFY', file_name=f.file_name,
                  details='File missing on disk', ip_address=ip, status='warning')
        return jsonify({'status': 'deleted', 'message': 'File not found on disk'}), 200

    current_hash = compute_sha256(f.file_path)
    f.current_hash = current_hash
    f.last_checked = datetime.utcnow()

    if current_hash != f.original_hash:
        f.status = 'compromised'
        create_alert(
            file_id=f.id,
            file_name=f.file_name,
            event_type='modified',
            severity='HIGH',
            description=f'Hash mismatch detected in {f.file_name}. Original: {f.original_hash[:16]}... | Current: {current_hash[:16]}...',
        )
        log_audit(user_id=current_user.id, username=current_user.username,
                  action='INTEGRITY_VIOLATION', file_name=f.file_name,
                  details=f'Hash changed from {f.original_hash[:16]}... to {current_hash[:16]}...',
                  ip_address=ip, status='warning')
    else:
        f.status = 'safe'

    db.session.commit()
    return jsonify({'status': f.status, 'file': f.to_dict()}), 200


@files_bp.route('/stats', methods=['GET'])
@login_required
def file_stats():
    query = MonitoredFile.query
    if current_user.role != 'admin':
        query = query.filter_by(uploaded_by=current_user.id)

    total = query.count()
    safe = query.filter_by(status='safe').count()
    compromised = query.filter_by(status='compromised').count()
    deleted = query.filter_by(status='deleted').count()

    return jsonify({
        'total': total,
        'safe': safe,
        'compromised': compromised,
        'deleted': deleted,
    }), 200
