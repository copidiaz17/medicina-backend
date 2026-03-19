<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Usuarios del sistema</h1>
      <button @click="abrirModal()" class="btn-primary">
        <i class="fas fa-plus"></i> Nuevo usuario
      </button>
    </div>

    <div class="card">
      <table class="tabla">
        <thead>
          <tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Médico asignado</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id">
            <td class="font-medium">{{ u.nombre }}</td>
            <td class="font-mono text-sm text-gray-500">{{ u.username }}</td>
            <td>
              <span :class="['badge', u.rol === 'admin' ? 'badge-red' : u.rol === 'medico' ? 'badge-blue' : 'badge-gray']">
                {{ u.rol }}
              </span>
            </td>
            <td class="text-sm text-gray-500">
              <span v-if="u.rol === 'secretaria' && u.medico_id">
                {{ nombreMedico(u.medico_id) }}
              </span>
              <span v-else class="text-gray-300">—</span>
            </td>
            <td>
              <span :class="['badge', u.activo ? 'badge-green' : 'badge-gray']">
                {{ u.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>
              <button @click="abrirModal(u)" class="text-blue-500 hover:text-blue-700 text-sm">
                <i class="fas fa-edit"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modal" class="modal-backdrop" @click.self="modal = false">
      <div class="modal-box max-w-md">
        <div class="card-header">
          <h3 class="font-semibold">{{ form.id ? 'Editar' : 'Nuevo' }} usuario</h3>
          <button @click="modal = false"><i class="fas fa-times text-gray-400"></i></button>
        </div>
        <form @submit.prevent="guardar" class="card-body space-y-4">
          <div>
            <label class="form-label">Nombre completo</label>
            <input v-model="form.nombre" class="input-field" required />
          </div>
          <div>
            <label class="form-label">Usuario</label>
            <input v-model="form.username" class="input-field" :disabled="!!form.id" required />
          </div>
          <div>
            <label class="form-label">{{ form.id ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña' }}</label>
            <input v-model="form.password" type="password" class="input-field" :required="!form.id" />
          </div>
          <div>
            <label class="form-label">Rol</label>
            <select v-model="form.rol" class="select-field">
              <option value="medico">Médico</option>
              <option value="secretaria">Secretaria</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div v-if="form.rol === 'secretaria'">
            <label class="form-label">Médico asignado *</label>
            <select v-model="form.medico_id" class="select-field" required>
              <option :value="null">Seleccionar médico</option>
              <option v-for="m in medicos" :key="m.id" :value="m.id">Dr/a. {{ m.nombre }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">Límite de consultas IA por mes</label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="form.consultas_ia_limite"
                type="number"
                min="1"
                max="9999"
                :disabled="form.ilimitado"
                class="input-field w-32"
                placeholder="400"
              />
              <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" v-model="form.ilimitado" class="rounded" />
                Ilimitado
              </label>
            </div>
            <p class="text-xs text-gray-400 mt-1">400 consultas/mes ≈ 16 pacientes/día × 25 días</p>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" v-model="form.demo" id="demo" class="rounded" />
            <label for="demo" class="text-sm text-gray-700">Perfil demo <span class="text-gray-400 text-xs">(muestra modal de suscripción al agotar IA)</span></label>
          </div>
          <div v-if="form.id" class="flex items-center gap-2">
            <input type="checkbox" v-model="form.activo" id="activo" class="rounded" />
            <label for="activo" class="text-sm text-gray-700">Usuario activo</label>
          </div>
          <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
          <div class="flex gap-3 justify-end pt-2">
            <button type="button" @click="modal = false" class="btn-secondary">Cancelar</button>
            <button type="submit" :disabled="guardando" class="btn-primary">
              <i v-if="guardando" class="fas fa-spinner fa-spin"></i>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import axios from 'axios'

const toast    = useToast()
const usuarios = ref([])
const medicos  = ref([])
const modal    = ref(false)
const guardando = ref(false)
const error     = ref('')
const form = reactive({ id: null, nombre: '', username: '', password: '', rol: 'medico', activo: true, consultas_ia_limite: 400, ilimitado: false, medico_id: null, demo: false })

function nombreMedico(id) {
  const m = medicos.value.find(m => m.id === id)
  return m ? m.nombre : '—'
}

function abrirModal(u = null) {
  if (u) Object.assign(form, {
    id: u.id, nombre: u.nombre, username: u.username, password: '', rol: u.rol, activo: u.activo,
    consultas_ia_limite: u.consultas_ia_limite ?? 400,
    ilimitado: u.consultas_ia_limite === null,
    medico_id: u.medico_id ?? null,
    demo: u.demo ?? false,
  })
  else Object.assign(form, { id: null, nombre: '', username: '', password: '', rol: 'medico', activo: true, consultas_ia_limite: 400, ilimitado: false, medico_id: null, demo: false })
  modal.value = true
  error.value = ''
}

async function guardar() {
  guardando.value = true
  error.value = ''
  try {
    const payload = { ...form }
    if (!payload.password) delete payload.password
    payload.consultas_ia_limite = form.ilimitado ? null : (form.consultas_ia_limite || 400)
    delete payload.ilimitado
    if (payload.rol !== 'secretaria') payload.medico_id = null
    if (form.id) await axios.put(`/api/usuarios/${form.id}`, payload)
    else await axios.post('/api/usuarios', payload)
    toast.success('Guardado')
    modal.value = false
    await Promise.all([cargar(), cargarMedicos()])
  } catch (err) { error.value = err.response?.data?.error || 'Error' }
  finally { guardando.value = false }
}

async function cargar() {
  const { data } = await axios.get('/api/usuarios')
  usuarios.value = data
}

async function cargarMedicos() {
  try {
    const { data } = await axios.get('/api/usuarios/medicos')
    medicos.value = data
  } catch { medicos.value = [] }
}

onMounted(async () => {
  await Promise.all([cargar(), cargarMedicos()])
})
</script>
