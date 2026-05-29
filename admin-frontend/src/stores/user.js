import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminLogin } from '@/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const user = ref(JSON.parse(localStorage.getItem('admin_user') || 'null'))

  const isAdmin = () => user.value?.role === 1

  async function login(username, password) {
    const res = await adminLogin({ username, password })
    if (res.data.user.role !== 1) {
      throw new Error('非管理员账号，无法登录管理后台')
    }
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('admin_token', res.data.token)
    localStorage.setItem('admin_user', JSON.stringify(res.data.user))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  return { token, user, isAdmin, login, logout }
})
