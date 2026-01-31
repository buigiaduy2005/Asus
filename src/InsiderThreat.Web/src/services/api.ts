import axios from 'axios';

// API Base URL - Server chạy ở localhost:5038
const API_BASE_URL = 'http://127.0.0.1:5038';

// Tạo axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor: Tự động gắn JWT token vào mọi request
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor: Xử lý lỗi response
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Chỉ redirect nếu KHÔNG PHẢI đang ở trang login hoặc forgot-password
            const currentPath = window.location.pathname;
            const isAuthPage = currentPath === '/login' ||
                currentPath === '/face-login' ||
                currentPath === '/forgot-password';

            if (!isAuthPage) {
                // Unauthorized - xóa token và redirect về login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);


// Export API methods
export const api = {
    get: <T>(url: string) => apiClient.get<T>(url).then((res) => res.data),
    post: <T>(url: string, data?: any) => apiClient.post<T>(url, data).then((res) => res.data),
    put: <T>(url: string, data?: any) => apiClient.put<T>(url, data).then((res) => res.data),
    delete: <T>(url: string) => apiClient.delete<T>(url).then((res) => res.data),
};

// Social Feed API
export const socialFeedApi = {
    // Get posts feed
    getPosts: async (page = 1, limit = 10) => {
        const response = await apiClient.get(`/api/SocialFeed/posts?page=${page}&limit=${limit}`);
        return response.data;
    },

    // Create new post
    createPost: async (data: { content: string; privacy?: string; mediaFiles?: any[] }) => {
        const response = await apiClient.post('/api/SocialFeed/posts', data);
        return response.data;
    },

    // Update post
    updatePost: async (postId: string, content: string) => {
        const response = await apiClient.put(`/api/SocialFeed/posts/${postId}`, { content });
        return response.data;
    },

    // Delete post
    deletePost: async (postId: string) => {
        const response = await apiClient.delete(`/api/SocialFeed/posts/${postId}`);
        return response.data;
    },

    // Like/Unlike post
    likePost: async (postId: string) => {
        const response = await apiClient.post(`/api/SocialFeed/posts/${postId}/like`);
        return response.data;
    },

    // Get comments
    getComments: async (postId: string) => {
        const response = await apiClient.get(`/api/SocialFeed/posts/${postId}/comments`);
        return response.data;
    },

    // Add comment
    addComment: async (postId: string, data: { content: string; parentCommentId?: string }) => {
        const response = await apiClient.post(`/api/SocialFeed/posts/${postId}/comments`, data);
        return response.data;
    },
};

// Groups API
export const groupsApi = {
    getGroups: async () => {
        const response = await apiClient.get('/api/Groups');
        return response.data;
    },

    createGroup: async (data: { name: string; description: string; type?: string; privacy?: string }) => {
        const response = await apiClient.post('/api/Groups', data);
        return response.data;
    },

    joinGroup: async (groupId: string) => {
        const response = await apiClient.post(`/api/Groups/${groupId}/join`);
        return response.data;
    },
};

// Users API
export const usersApi = {
    // Get all users
    getUsers: async () => {
        const response = await apiClient.get('/api/SocialFeed/users');
        return response.data;
    },
};

export default apiClient;
