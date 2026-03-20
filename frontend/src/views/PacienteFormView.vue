<template>
  <div class="p-6 max-w-3xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <RouterLink :to="editando ? `/pacientes/${route.params.id}` : '/pacientes'" class="text-gray-400 hover:text-gray-600">
        <i class="fas fa-arrow-left"></i>
      </RouterLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ editando ? 'Editar paciente' : 'Nuevo paciente' }}</h1>
      </div>
    </div>

    <form @submit.prevent="guardar" class="space-y-5">
      <!-- Datos personales -->
      <div class="card">
        <div class="card-header">
          <h2 class="font-semibold text-gray-800 flex items-center gap-2">
            <i class="fas fa-id-card text-blue-500"></i> Datos personales
          </h2>
        </div>
        <div class="card-body grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Apellido *</label>
            <input v-model="form.apellido" type="text" class="input-field" required placeholder="García" />
          </div>
          <div>
            <label class="form-label">Nombre *</label>
            <input v-model="form.nombre" type="text" class="input-field" required placeholder="Juan" />
          </div>
          <div>
            <label class="form-label">DNI</label>
            <input v-model="form.dni" type="text" class="input-field" placeholder="12345678" />
          </div>
          <div>
            <label class="form-label">Fecha de nacimiento</label>
            <input v-model="form.fecha_nacimiento" type="date" class="input-field" />
          </div>
          <div>
            <label class="form-label">Sexo</label>
            <select v-model="form.sexo" class="select-field">
              <option value="">— No registrado —</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label class="form-label">Grupo sanguíneo</label>
            <select v-model="form.grupo_sanguineo" class="select-field">
              <option value="">— No registrado —</option>
              <option v-for="g in grupos" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Contacto -->
      <div class="card">
        <div class="card-header">
          <h2 class="font-semibold text-gray-800 flex items-center gap-2">
            <i class="fas fa-phone text-green-500"></i> Contacto
          </h2>
        </div>
        <div class="card-body grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Teléfono</label>
            <input v-model="form.telefono" type="tel" class="input-field" placeholder="+54 9 11 0000-0000" />
          </div>
          <div>
            <label class="form-label">Email</label>
            <input v-model="form.email" type="email" class="input-field" placeholder="juan@email.com" />
          </div>
          <div>
            <label class="form-label">Obra social / Prepaga</label>
            <input v-model="form.obra_social" type="text" class="input-field" placeholder="OSDE, Swiss Medical..." />
          </div>
          <div>
            <label class="form-label">N° de afiliado</label>
            <input v-model="form.nro_afiliado" type="text" class="input-field" />
          </div>
        </div>
      </div>

      <!-- Medidas -->
      <div class="card">
        <div class="card-header">
          <h2 class="font-semibold text-gray-800 flex items-center gap-2">
            <i class="fas fa-weight text-orange-500"></i> Medidas antropométricas
          </h2>
        </div>
        <div class="card-body grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Peso (kg)</label>
            <input v-model="form.peso_kg" type="number" step="0.1" min="0" max="300" class="input-field" placeholder="75.5" />
          </div>
          <div>
            <label class="form-label">Talla (cm)</label>
            <input v-model="form.talla_cm" type="number" step="0.1" min="50" max="250" class="input-field" placeholder="172" />
          </div>
        </div>
      </div>

      <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

      <div class="flex gap-3 justify-end">
        <RouterLink :to="editando ? `/pacientes/${route.params.id}` : '/pacientes'" class="btn-secondary">
          Cancelar
        </RouterLink>
        <button type="submit" :disabled="guardando" class="btn-primary">
          <i v-if="guardando" class="fas fa-spinner fa-spin"></i>
          {{ editando ? 'Guardar cambios' : 'Crear paciente' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router   = useRouter()
const route    = useRoute()
const guardando = ref(false)
const error     = ref('')

const editando = computed(() => !!route.params.id)

const grupos = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

const form = reactive({
  nombre: '', apellido: '', dni: '', fecha_nacimiento: '', sexo: '',
  grupo_sanguineo: '', telefono: '', email: '', obra_social: '', nro_afiliado: '',
  peso_kg: '', talla_cm: '',
})

onMounted(async () => {
  if (editando.value) {
    try {
      const { data } = await axios.get(`/api/pacientes/${route.params.id}`)
      Object.keys(form).forEach(k => { if (data[k] !== undefined) form[k] = data[k] || '' })
    } catch {}
  }
})

async function guardar() {
  guardando.value = true
  error.value     = ''
  try {
    const payload = { ...form }
    const camposNulos = ['fecha_nacimiento', 'peso_kg', 'talla_cm']
    for (const c of camposNulos) if (payload[c] === '' || payload[c] === undefined) payload[c] = null
    if (editando.value) {
      await axios.put(`/api/pacientes/${route.params.id}`, payload)
      router.push(`/pacientes/${route.params.id}`)
    } else {
      const { data } = await axios.post('/api/pacientes', payload)
      router.push(`/pacientes/${data.id}`)
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al guardar'
  } finally {
    guardando.value = false
  }
}
</script>
