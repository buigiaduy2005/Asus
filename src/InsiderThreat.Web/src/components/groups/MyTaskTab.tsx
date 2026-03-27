import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { message, Spin, Empty, Avatar, Tooltip, Tag } from 'antd';
import { api } from '../../services/api';
import CreateTaskModal from './CreateTaskModal';
import './MyTaskTab.css';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    progress: number;
    assignedTo?: string;
    deadline?: string;
}

interface Column {
    id: string;
    label: string;
    color: string;
    dotColor: string;
}

const COLUMNS: Column[] = [
    { id: 'Todo', label: 'To-do', color: '#64748b', dotColor: '#64748b' },
    { id: 'InProgress', label: 'Đang làm', color: '#3b82f6', dotColor: '#3b82f6' },
    { id: 'InReview', label: 'Xem xét', color: '#f59e0b', dotColor: '#f59e0b' },
    { id: 'Done', label: 'Hoàn thành', color: '#10b981', dotColor: '#10b981' }
];

interface Member {
    id: string;
    fullName: string;
    avatarUrl?: string;
}

export default function MyTaskTab() {
    const { id: groupId } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tasksRes, membersRes] = await Promise.all([
                api.get<Task[]>(`/api/groups/${groupId}/tasks`),
                api.get<Member[]>(`/api/groups/${groupId}/members-details`)
            ]);
            setTasks(tasksRes);
            setMembers(membersRes);
        } catch (err) {
            message.error('Không thể tải danh sách công việc');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (groupId) fetchData();
    }, [groupId]);

    const handleDragStart = (taskId: string) => {
        setDraggingId(taskId);
    };

    const handleDropToColumn = async (targetStatus: string) => {
        if (!draggingId) return;
        const task = tasks.find(t => t.id === draggingId);
        if (!task || task.status === targetStatus) return;

        try {
            const updatedTask = { ...task, status: targetStatus };
            await api.put(`/api/groups/${groupId}/tasks/${draggingId}`, updatedTask);
            setTasks(prev => prev.map(t => t.id === draggingId ? updatedTask : t));
            message.success(`Đã chuyển sang ${targetStatus}`);
        } catch (err) {
            message.error('Không thể cập nhật trạng thái');
        } finally {
            setDraggingId(null);
        }
    };

    const getAssignee = (userId?: string) => {
        return members.find(m => m.id === userId);
    };

    if (loading) return <div className="loading-tasks"><Spin size="large" /></div>;

    return (
        <div className="myTaskTab">
            {/* Topbar */}
            <div className="myTask-topBar">
                <div className="topBar-left">
                    <div className="task-project-label">PROJECT WORKFLOW</div>
                    <h2 className="task-project-title">Danh sách công việc</h2>
                </div>
                <div className="topBar-right">
                    <div className="searchTask">
                        <span className="material-symbols-outlined">search</span>
                        <input 
                            type="text" 
                            placeholder={t('project_detail.mytasks.search')} 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                        />
                    </div>
                    <div className="viewToggles">
                        <button className={viewMode === 'kanban' ? 'active' : ''} onClick={() => setViewMode('kanban')}>
                            <span className="material-symbols-outlined">view_column</span> Bảng Kanban
                        </button>
                        <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                            <span className="material-symbols-outlined">menu</span> Danh sách
                        </button>
                    </div>
                    <button className="addNewBtn" onClick={() => setShowCreateTask(true)}>
                        <span className="material-symbols-outlined">add</span> Thêm Task
                    </button>
                    <div className="memberPile">
                        <Avatar.Group maxCount={3}>
                            {members.map(m => (
                                <Tooltip key={m.id} title={m.fullName}>
                                    <Avatar src={m.avatarUrl || `https://ui-avatars.com/api/?name=${m.fullName}`} />
                                </Tooltip>
                            ))}
                        </Avatar.Group>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            {viewMode === 'kanban' && (
                <div className="kanbanBoard">
                    {COLUMNS.map(col => {
                        const filteredTasks = tasks.filter(t => 
                            t.status === col.id && 
                            (!searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        );
                        return (
                            <div
                                key={col.id}
                                className="kanbanColumn"
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => handleDropToColumn(col.id)}
                            >
                                <div className="colHeader">
                                    <div className="colTitle">
                                        <span className="colDot" style={{ background: col.dotColor }}></span>
                                        <span>{col.label}</span>
                                        <span className="colCount">{filteredTasks.length}</span>
                                    </div>
                                </div>

                                <div className="kanbanCards">
                                    {filteredTasks.length === 0 && (
                                        <div className="empty-col-state">Kéo thả vào đây</div>
                                    )}
                                    {filteredTasks.map(task => {
                                        const assignee = getAssignee(task.assignedTo);
                                        return (
                                            <div
                                                key={task.id}
                                                className="kCard"
                                                draggable
                                                onDragStart={() => handleDragStart(task.id)}
                                            >
                                                <div className="kCardTop">
                                                    <span className={`kCardTag priority--${task.priority.toLowerCase()}`}>
                                                        {task.priority}
                                                    </span>
                                                    {task.deadline && (
                                                        <span className="kCardDeadline">
                                                            <span className="material-symbols-outlined">schedule</span>
                                                            {new Date(task.deadline).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    )}
                                                </div>

                                                <h4 className="kCardTitle">{task.title}</h4>
                                                <p className="kCardDesc">{task.description}</p>

                                                <div className="kCardFooter">
                                                    <div className="kCardMembers">
                                                        {assignee ? (
                                                            <Tooltip title={assignee.fullName}>
                                                                <Avatar size="small" src={assignee.avatarUrl || `https://ui-avatars.com/api/?name=${assignee.fullName}`} />
                                                            </Tooltip>
                                                        ) : (
                                                            <span className="no-assignee">Chưa giao</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <button className="addTaskBtn" onClick={() => setShowCreateTask(true)}>
                                        <span className="material-symbols-outlined">add</span>
                                        Thêm task mới
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {viewMode === 'list' && (
                <div className="listView animate-in">
                    {tasks.length === 0 ? <Empty description="Chưa có công việc nào" /> : (
                        <table className="taskTable">
                            <thead>
                                <tr>
                                    <th>Công việc</th>
                                    <th>Trạng thái</th>
                                    <th>Người làm</th>
                                    <th>Hạn chót</th>
                                    <th>Độ ưu tiên</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(t => (
                                    <tr key={t.id}>
                                        <td>{t.title}</td>
                                        <td><Tag color={COLUMNS.find(c => c.id === t.status)?.dotColor}>{t.status}</Tag></td>
                                        <td>{getAssignee(t.assignedTo)?.fullName || '---'}</td>
                                        <td>{t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '---'}</td>
                                        <td><Tag>{t.priority}</Tag></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {showCreateTask && (
                <CreateTaskModal
                    onClose={() => setShowCreateTask(false)}
                    onSubmit={() => {
                        setShowCreateTask(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}

