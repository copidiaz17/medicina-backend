import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user:  null,
    _refreshPromise: null,
  }),
  getters: {
    isLoggedIn: s => !!s.token,
    isAdmin:    s => s.user?.rol === 'admin',
    isMedico:   s => s.user?.rol === 'medico' || s.user?.rol === 'admin',
  },
  actions: {
    init() {
      // Timeout global: 30s para requests normales (Claude puede tardar más — se sobreescribe en claude.js)
      axios.defaults.timeout = 30000

      const token = localStorage.getItem('cardio_token')
      const user  = localStorage.getItem('cardio_user')
      if (token) {
        this.token = token
        this.user  = JSON.parse(user)
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }
      this._setupInterceptor()
    },

    _setupInterceptor() {
      axios.interceptors.response.use(
        res => res,
        async err => {
          const original = err.config
          // Si es 401, no es la ruta de refresh/login, y no reintentamos ya
          if (
            err.response?.status === 401 &&
            !original._retry &&
            !original.url?.includes('/api/auth/')
          ) {
            original._retry = true
            try {
              await this.refresh()
              original.headers['Authorization'] = `Bearer ${this.token}`
              return axios(original)
            } catch {
              this.logout()
              window.location.href = '/login'
            }
          }
          return Promise.reject(err)
        }
      )
    },

    async login(username, password) {
      const { data } = await axios.post('/api/auth/login', { username, password })
      this._setSession(data.token, data.user)
    },

    async refresh() {
      // Evitar múltiples llamadas simultáneas de refresh
      if (!this._refreshPromise) {
        this._refreshPromise = axios.post('/api/auth/refresh')
          .then(({ data }) => {
            this._setSession(data.token, data.user)
          })
          .finally(() => { this._refreshPromise = null })
      }
      return this._refreshPromise
    },

    _setSession(token, user) {
      this.token = token
      this.user  = user
      localStorage.setItem('cardio_token', token)
      localStorage.setItem('cardio_user', JSON.stringify(user))
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    },

    logout() {
      this.token = null
      this.user  = null
      localStorage.removeItem('cardio_token')
      localStorage.removeItem('cardio_user')
      delete axios.defaults.headers.common['Authorization']
    }
  }
})
