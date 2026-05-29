import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || '请求失败'
    ElMessage.error(msg)
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// 仪表盘
export const getDashboard = () => http.get('/admin/dashboard')

// 用户管理
export const getUsers = (params) => http.get('/admin/users', { params })
export const updateUserStatus = (id, status) => http.put(`/admin/users/${id}/status`, { status })
export const resetUserPassword = (id) => http.put(`/admin/users/${id}/reset-password`)

// 食材管理
export const getFoods = (params) => http.get('/admin/foods', { params })
export const createFood = (data) => http.post('/admin/foods', data)
export const updateFood = (id, data) => http.put(`/admin/foods/${id}`, data)
export const deleteFood = (id) => http.delete(`/admin/foods/${id}`)

// 操作日志
export const getLogs = (params) => http.get('/admin/logs', { params })

// 公告
export const getAnnouncements = () => http.get('/admin/announcements')
export const createAnnouncement = (data) => http.post('/admin/announcements', data)
export const updateAnnouncement = (id, data) => http.put(`/admin/announcements/${id}`, data)
export const deleteAnnouncement = (id) => http.delete(`/admin/announcements/${id}`)

// 登录（复用用户端接口）
export const adminLogin = (data) => http.post('/user/login', data)
