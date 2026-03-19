<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-6">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
      <div class="text-center mb-6">
        <div class="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <i class="fas fa-user-shield text-white text-xl"></i>
        </div>
        <h1 class="text-xl font-bold text-gray-900">Configuración inicial</h1>
        <p class="text-sm text-gray-400 mt-1">Crear cuenta administrador</p>
      </div>

      <div v-if="exito" class="text-center">
        <div class="text-5xl mb-4">✅</div>
        <p class="font-semibold text-gray-800 mb-2">¡Cuenta creada!</p>
        <RouterLink to="/login" class="btn-primary">Ir al login</RouterLink>
      </div>

      <form v-else @submit.prevent="crear" class="space-y-4">
        <div>
          <label class="form-label">Nombre completo</label>
          <input v-model="form.nombre" type="text" class="input-field" placeholder="Dr. Juan García" required />
        </div>
        <div>
          <label class="form-label">Usuario</label>
          <input v-model="form.username" type="text" class="input-field" placeholder="admin" required />
        </div>
        <div>
          <label class="form-label">Contraseña</label>
          <input v-model="form.password" type="password" class="input-field" placeholder="Mínimo 6 caracteres" required minlength="6" />
        </div>
        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
        <button type="submit" :disabled="loading" class="w-full btn-primary justify-center py-3">
          {{ loading ? 'Creando...' : 'Crear cuenta' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import axios from 'axios'

const form    = reactive({ nombre: '', username: '', password: '' })
const loading = ref(false)
const error   = ref('')
const exito   = ref(false)

async function crear() {
  loading.value = true
  error.value   = ''
  try {
    await axios.post('/api/auth/crear-admin', form)
    exito.value = true
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al crear'
  } finally {
    loading.value = false
  }
}
</script>
