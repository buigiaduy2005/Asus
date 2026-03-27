import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { App, Select, Input, Button, DatePicker, Avatar, Space } from 'antd';
import { api } from '../../services/api';
import './CreateTaskModal.css';

interface Member {
    id: string;
    fullName: string;
    avatarUrl?: string;
}

interface CreateTaskModalProps {
    onClose: () => void;
    onSubmit: () => void;
}

export default function CreateTaskModal({ onClose, onSubmit }: CreateTaskModalProps) {
    const { id: groupId } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { message } = App.useApp();
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState('Todo');
    const [dueDate, setDueDate] = useState<any>(null);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Normal');
    const [assigneeId, setAssigneeId] = useState<string | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const res = await api.get<Member[]>(`/api/groups/${groupId}/members-details`);
                setMembers(res);
            } catch (err) {
                console.error('Failed to fetch members', err);
            }
        };
        if (groupId) fetchMembers();
    }, [groupId]);

    const handleSave = async () => {
        if (!title.trim()) {
            message.warning('Vui lòng nhập tiêu đề task');
            return;
        }

        setLoading(true);
        try {
            await api.post(`/api/groups/${groupId}/tasks`, {
                title,
                description,
                status,
                priority,
                deadline: dueDate?.toISOString(),
                assignedTo: assigneeId
            });
            message.success('Tạo task thành công');
            onSubmit();
            onClose();
        } catch (err) {
            message.error('Không thể tạo task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="taskModal-overlay" onClick={onClose}>
            <div className="taskModal-content" onClick={e => e.stopPropagation()}>
                <div className="taskModal-header">
                    <h2>Tạo Task Mới</h2>
                    <button className="iconBtn" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="taskModal-body">
                    <div className="taskForm-row">
                        <label>Tiêu đề</label>
                        <Input 
                            size="large"
                            placeholder="Tên công việc cần thực hiện..." 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="taskForm-row">
                        <label><span className="material-symbols-outlined">check_circle</span> Trang thái</label>
                        <Select 
                            value={status} 
                            style={{ width: '100%' }}
                            onChange={setStatus}
                        >
                            <Select.Option value="Todo">To-do</Select.Option>
                            <Select.Option value="InProgress">Đang thực hiện</Select.Option>
                            <Select.Option value="InReview">Đang xem xét</Select.Option>
                            <Select.Option value="Done">Hoàn thành</Select.Option>
                        </Select>
                    </div>

                    <div className="taskForm-row">
                        <label><span className="material-symbols-outlined">calendar_today</span> Hạn chót</label>
                        <DatePicker 
                            style={{ width: '100%' }} 
                            onChange={setDueDate} 
                            format="DD/MM/YYYY"
                        />
                    </div>

                    <div className="taskForm-row">
                        <label><span className="material-symbols-outlined">person</span> Người thực hiện</label>
                        <Select
                            placeholder="Chọn thành viên"
                            style={{ width: '100%' }}
                            onChange={setAssigneeId}
                            value={assigneeId}
                        >
                            {members.map(m => (
                                <Select.Option key={m.id} value={m.id}>
                                    <Space>
                                        <Avatar size="small" src={m.avatarUrl || `https://ui-avatars.com/api/?name=${m.fullName}`} />
                                        {m.fullName}
                                    </Space>
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    <div className="taskForm-row">
                        <label><span className="material-symbols-outlined">local_fire_department</span> Ưu tiên</label>
                        <Select value={priority} onChange={setPriority} style={{ width: '100%' }}>
                            <Select.Option value="Low">Thấp</Select.Option>
                            <Select.Option value="Normal">Trung bình</Select.Option>
                            <Select.Option value="Urgent">Khẩn cấp</Select.Option>
                        </Select>
                    </div>

                    <div className="taskForm-row descriptionRow">
                        <label><span className="material-symbols-outlined">notes</span> Mô tả chi tiết</label>
                        <Input.TextArea 
                            rows={4}
                            placeholder="Nhập ghi chú hoặc yêu cầu chi tiết..." 
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <div className="taskModal-footer">
                    <div className="footer-actions">
                        <Button onClick={onClose}>Hủy bỏ</Button>
                        <Button type="primary" loading={loading} onClick={handleSave}>Lưu Task</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

