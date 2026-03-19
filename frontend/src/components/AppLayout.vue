<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">
    <!-- Overlay mobile -->
    <div
      v-if="showMobile"
      @click="showMobile = false"
      class="fixed inset-0 bg-black/50 z-30 md:hidden"
    ></div>

    <!-- Sidebar -->
    <aside :class="[
      'w-64 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-sm z-40',
      'fixed inset-y-0 left-0 transition-transform duration-200',
      showMobile ? 'translate-x-0' : '-translate-x-full',
      'md:relative md:translate-x-0'
    ]">
      <!-- Logo -->
      <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-cardio-blue rounded-xl flex items-center justify-center shadow-sm">
            <i class="fas fa-heartbeat text-white text-sm"></i>
          </div>
          <div>
            <p class="font-semibold text-gray-900 text-sm leading-none">Medicina IA</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ authStore.user?.nombre }}</p>
          </div>
        </div>
        <button @click="showMobile = false" class="md:hidden text-gray-400 hover:text-gray-600">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-4 space-y-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          @click="showMobile = false"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-cardio-blue transition-colors"
          :class="{ 'nav-link-active': isActive(item.to) }"
        >
          <i :class="[item.icon, 'w-4 text-center']"></i>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Logout -->
      <div class="px-3 pb-4">
        <button
          @click="logout"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <i class="fas fa-sign-out-alt w-4 text-center"></i>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto flex flex-col min-w-0">
      <!-- Topbar -->
      <div class="topbar flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <button
          @click="showMobile = !showMobile"
          class="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <i class="fas fa-bars"></i>
        </button>
        <div class="flex items-center gap-3 ml-auto">
          <span class="text-sm text-gray-500 hidden sm:inline">{{ authStore.user?.nombre }}</span>
          <button
            @click="toggleDark"
            :title="darkMode ? 'Modo claro' : 'Modo oscuro'"
            class="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <i :class="darkMode ? 'fas fa-sun text-yellow-400' : 'fas fa-moon'"></i>
          </button>
          <button
            @click="modalPassword = true"
            title="Cambiar contraseña"
            class="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <i class="fas fa-key"></i>
          </button>
          <button
            @click="logout"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
          >
            <i class="fas fa-sign-out-alt"></i>
            <span class="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        <RouterView />
      </div>
    </main>

    <!-- Modal cambiar contraseña -->
    <div v-if="modalPassword" class="modal-backdrop" @click.self="cerrarModalPassword">
      <div class="modal-box max-w-md">
        <div class="card-header">
          <h3 class="font-semibold">Cambiar contraseña</h3>
          <button @click="cerrarModalPassword"><i class="fas fa-times text-gray-400"></i></button>
        </div>
        <form @submit.prevent="cambiarPassword" class="card-body space-y-4">
          <div>
            <label class="form-label">Contraseña actual</label>
            <input v-model="passForm.actual" type="password" class="input-field" required autocomplete="current-password" />
          </div>
          <div>
            <label class="form-label">Nueva contraseña</label>
            <input v-model="passForm.nueva" type="password" class="input-field" required autocomplete="new-password" />
            <p class="text-xs text-gray-400 mt-1">Mínimo 8 caracteres, al menos una letra y un número</p>
          </div>
          <div>
            <label class="form-label">Confirmar nueva contraseña</label>
            <input v-model="passForm.confirmar" type="password" class="input-field" required autocomplete="new-password" />
          </div>
          <p v-if="passError" class="text-red-500 text-sm">{{ passError }}</p>
          <p v-if="passOk" class="text-green-600 text-sm font-medium">Contraseña actualizada correctamente</p>
          <div class="flex gap-3 justify-end pt-2">
            <button type="button" @click="cerrarModalPassword" class="btn-secondary">Cancelar</button>
            <button type="submit" :disabled="passGuardando" class="btn-primary">
              <i v-if="passGuardando" class="fas fa-spinner fa-spin mr-1"></i>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import axios from 'axios'

const showMobile = ref(false)
const darkMode   = ref(localStorage.getItem('cardio-dark') === '1')
const toast      = useToast()

// ── Cambiar contraseña ─────────────────────────────────────────
const modalPassword = ref(false)
const passGuardando = ref(false)
const passError     = ref('')
const passOk        = ref(false)
const passForm      = reactive({ actual: '', nueva: '', confirmar: '' })

function cerrarModalPassword() {
  modalPassword.value = false
  passError.value = ''
  passOk.value = false
  Object.assign(passForm, { actual: '', nueva: '', confirmar: '' })
}

async function cambiarPassword() {
  passError.value = ''
  passOk.value = false
  if (passForm.nueva !== passForm.confirmar) {
    passError.value = 'Las contraseñas nuevas no coinciden'
    return
  }
  passGuardando.value = true
  try {
    await axios.post('/api/auth/cambiar-password', {
      password_actual: passForm.actual,
      password_nuevo:  passForm.nueva,
    })
    passOk.value = true
    toast.success('Contraseña actualizada')
    setTimeout(cerrarModalPassword, 1500)
  } catch (err) {
    passError.value = err.response?.data?.error || 'Error al cambiar la contraseña'
  } finally {
    passGuardando.value = false
  }
}

function toggleDark() {
  darkMode.value = !darkMode.value
  localStorage.setItem('cardio-dark', darkMode.value ? '1' : '0')
  document.documentElement.classList.toggle('dark', darkMode.value)
}
const router = useRouter()
const route  = useRoute()
const authStore = useAuthStore()

const navItems = [
  { to: '/',          label: 'Dashboard',  icon: 'fas fa-chart-pie' },
  { to: '/pacientes', label: 'Pacientes',  icon: 'fas fa-user-injured' },
  { to: '/agenda',    label: 'Agenda',     icon: 'fas fa-calendar-alt' },
  ...(authStore.isAdmin ? [{ to: '/usuarios', label: 'Usuarios', icon: 'fas fa-users-cog' }] : []),
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>
