<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-6">
    <!-- Background pattern -->
    <div class="absolute inset-0 opacity-5">
      <div class="absolute top-20 left-20 text-white text-9xl">🫀</div>
      <div class="absolute bottom-20 right-20 text-white text-9xl">❤️‍🩹</div>
    </div>

    <div class="relative w-full max-w-sm">
      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <i class="fas fa-heartbeat text-white text-2xl"></i>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Medicina IA</h1>
          <p class="text-sm text-gray-400 mt-1">Sistema de Gestión Médica con IA</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="form-label">Usuario</label>
            <input v-model="form.username" type="text" class="input-field" placeholder="Ingresá tu usuario" required autofocus />
          </div>
          <div>
            <label class="form-label">Contraseña</label>
            <div class="relative">
              <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="input-field pr-10" placeholder="••••••••" required />
              <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </div>

          <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>

          <button type="submit" :disabled="loading" class="w-full btn-primary justify-center py-3 text-base mt-2">
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <span>{{ loading ? 'Ingresando...' : 'Ingresar' }}</span>
          </button>
        </form>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router    = useRouter()
const authStore = useAuthStore()

const form         = reactive({ username: '', password: '' })
const loading      = ref(false)
const error        = ref('')
const showPassword = ref(false)

async function handleLogin() {
  loading.value = true
  error.value   = ''
  try {
    await authStore.login(form.username, form.password)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al ingresar'
  } finally {
    loading.value = false
  }
}
</script>
