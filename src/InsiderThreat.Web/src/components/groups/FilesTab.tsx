import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { message, Spin, Avatar, Tooltip } from 'antd';
import { api, API_BASE_URL } from '../../services/api';
import './FilesTab.css';

interface FileItem {
    id: string;
    fileId: string;
    fileName: string;
    contentType: string;
    size: number;
    uploaderName: string;
    uploadDate: string;
}

const FILE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
    pdf: { icon: 'picture_as_pdf', color: '#ef4444', bg: '#fef2f2' },
    doc: { icon: 'description', color: '#3b82f6', bg: '#eff6ff' },
    docx: { icon: 'description', color: '#3b82f6', bg: '#eff6ff' },
    xls: { icon: 'table_chart', color: '#10b981', bg: '#f0fdf4' },
    xlsx: { icon: 'table_chart', color: '#10b981', bg: '#f0fdf4' },
    zip: { icon: 'folder_zip', color: '#f59e0b', bg: '#fffbeb' },
    rar: { icon: 'folder_zip', color: '#f59e0b', bg: '#fffbeb' },
    other: { icon: 'insert_drive_file', color: '#94a3b8', bg: '#f8fafc' },
    image: { icon: 'image', color: '#8b5cf6', bg: '#f5f3ff' },
};

interface Member {
    id: string;
    fullName: string;
    avatarUrl?: string;
    roleLevel?: string;
}

export default function FilesTab() {
    const { id: groupId } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const [files, setFiles] = useState<FileItem[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [filesRes, membersRes] = await Promise.all([
                api.get<FileItem[]>(`/api/groups/${groupId}/files`),
                api.get<Member[]>(`/api/groups/${groupId}/members-details`)
            ]);
            setFiles(filesRes);
            setMembers(membersRes);
        } catch (err) {
            message.error('Không thể tải dữ liệu tệp tin');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (groupId) fetchData();
    }, [groupId]);

    const handleFileUpload = async (uploadFiles: File[]) => {
        if (uploadFiles.length === 0) return;
        setUploading(true);
        const hide = message.loading('Đang tải lên...', 0);

        try {
            for (const file of uploadFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('description', `Dự án: ${file.name}`);
                await api.post(`/api/groups/${groupId}/files`, formData);
            }
            message.success('Tải lên thành công');
            fetchData();
        } catch (err) {
            message.error('Lỗi khi tải lên tệp tin');
        } finally {
            setUploading(false);
            hide();
        }
    };

    const handleDownload = (file: FileItem) => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const downloaderName = user.fullName || 'User';
        const url = `${API_BASE_URL}/api/upload/download/${file.fileId}?originalName=${encodeURIComponent(file.fileName)}&downloaderName=${encodeURIComponent(downloaderName)}`;
        window.open(url, '_blank');
    };

    const getFileType = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
        return ext || 'other';
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const filtered = files.filter(f => f.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) return <div className="loading-files"><Spin size="large" /></div>;

    return (
        <div className="filesTab">
            <div className="files-header">
                <div>
                    <p className="files-section-label">Tài liệu dự án</p>
                    <h2 className="files-title">Thư viện tệp tin ({files.length})</h2>
                </div>
                <div className="files-header-actions">
                    <div className="files-search">
                        <span className="material-symbols-outlined">search</span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm tệp tin..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="upload-btn" disabled={uploading} onClick={() => inputRef.current?.click()}>
                        {uploading ? <Spin size="small" /> : <span className="material-symbols-outlined">cloud_upload</span>}
                        {uploading ? 'Đang tải...' : 'Tải lên'}
                    </button>
                    <input ref={inputRef} type="file" multiple hidden onChange={(e) => {
                        handleFileUpload(Array.from(e.target.files || []));
                    }} />
                </div>
            </div>

            <div className="files-main-layout">
                <div className="files-grid-area">
                    <div
                        className={`drop-zone ${dragOver ? 'active' : ''}`}
                        onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                        onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOver(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                handleFileUpload(Array.from(e.dataTransfer.files));
                            }
                        }}
                    >
                        <span className="material-symbols-outlined">cloud_upload</span>
                        <p>Kéo và thả tệp tin vào đây để chia sẻ nhanh</p>
                    </div>

                    <div className="files-grid">
                        {filtered.map(file => {
                            const type = getFileType(file.fileName);
                            const iconConfig = FILE_ICONS[type] || FILE_ICONS['other'];
                            return (
                                <div key={file.id} className="file-card">
                                    <div className="file-card-icon" style={{ background: iconConfig.bg }}>
                                        <span className="material-symbols-outlined" style={{ color: iconConfig.color, fontSize: 36 }}>
                                            {iconConfig.icon}
                                        </span>
                                    </div>
                                    <div className="file-card-info">
                                        <Tooltip title={file.fileName}>
                                            <p className="file-name">{file.fileName}</p>
                                        </Tooltip>
                                        <div className="file-meta">
                                            <span className="file-type-label">{type.toUpperCase()}</span>
                                            <span className="file-size">• {formatSize(file.size)}</span>
                                            <button className="file-download-btn" onClick={() => handleDownload(file)}>
                                                <span className="material-symbols-outlined">download</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filtered.length === 0 && (
                        <div className="no-files">
                            <span className="material-symbols-outlined">folder_open</span>
                            <p>Không tìm thấy tệp tin nào</p>
                        </div>
                    )}
                </div>

                <div className="files-sidebar">
                    <div className="files-panel">
                        <div className="files-panel-header">
                            <h3>Thành viên ({members.length})</h3>
                        </div>
                        <div className="files-team-list">
                            {members.map(m => (
                                <div key={m.id} className="files-team-member">
                                    <div className="files-avatar-wrap">
                                        <Avatar src={m.avatarUrl || `https://ui-avatars.com/api/?name=${m.fullName}`} />
                                        <span className={`files-status-dot files-status--online`}></span>
                                    </div>
                                    <div>
                                        <p className="files-member-name">{m.fullName}</p>
                                        <p className="files-member-role">{m.roleLevel || 'Thành viên'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="files-invite-btn">
                            <span className="material-symbols-outlined">add</span>
                            Thêm thành viên
                        </button>
                    </div>

                    <div className="files-panel storage-panel">
                        <h3 className="storage-title">Lưu trữ dự án</h3>
                        <div className="storage-bar">
                            <div className="storage-fill" style={{ width: '15%' }}></div>
                        </div>
                        <div className="storage-meta">
                            <span>{formatSize(files.reduce((acc, f) => acc + f.size, 0))} dùng</span>
                            <span>2 GB giới hạn</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


