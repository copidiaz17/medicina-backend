<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Pacientes</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total }} pacientes registrados</p>
      </div>
      <RouterLink to="/pacientes/nuevo" class="btn-primary">
        <i class="fas fa-plus"></i> Nuevo paciente
      </RouterLink>
    </div>

    <!-- Buscador -->
    <div class="card mb-5">
      <div class="card-body py-3">
        <div class="relative">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            v-model="busqueda"
            @input="buscar"
            type="text"
            placeholder="Buscar por nombre, apellido o DNI..."
            class="input-field pl-9"
          />
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card">
      <div v-if="cargando" class="card-body text-center py-16 text-gray-400">
        <i class="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
        Cargando...
      </div>
      <div v-else-if="pacientes.length === 0" class="card-body text-center py-16">
        <i class="fas fa-user-injured text-4xl text-gray-200 mb-3 block"></i>
        <p class="text-gray-400">No se encontraron pacientes</p>
        <RouterLink to="/pacientes/nuevo" class="btn-primary mt-4 inline-flex">
          <i class="fas fa-plus"></i> Agregar paciente
        </RouterLink>
      </div>
      <table v-else class="tabla">
        <thead>
          <tr>
            <th>Paciente</th>
            <th>DNI</th>
            <th>Edad</th>
            <th>Sexo</th>
            <th>Teléfono</th>
            <th>Obra social</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in pacientes" :key="p.id">
            <td>
              <RouterLink :to="`/pacientes/${p.id}`" class="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                {{ p.apellido }}, {{ p.nombre }}
              </RouterLink>
            </td>
            <td class="text-gray-500">{{ p.dni || '—' }}</td>
            <td>{{ calcEdad(p.fecha_nacimiento) }}</td>
            <td>
              <span v-if="p.sexo" :class="['badge', p.sexo === 'masculino' ? 'badge-blue' : p.sexo === 'femenino' ? 'badge-red' : 'badge-gray']">
                {{ p.sexo }}
              </span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="text-gray-500">{{ p.telefono || '—' }}</td>
            <td class="text-gray-500">{{ p.obra_social || '—' }}</td>
            <td class="text-right">
              <RouterLink :to="`/pacientes/${p.id}`" class="btn-primary py-1 px-3 text-xs mr-1">
                Ver
              </RouterLink>
              <RouterLink :to="`/pacientes/${p.id}/editar`" class="btn-secondary py-1 px-3 text-xs mr-1">
                Editar
              </RouterLink>
              <button @click="eliminar(p)" class="py-1 px-3 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginación -->
      <div v-if="!busqueda && totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <p class="text-xs text-gray-500">
          Mostrando {{ (paginaActual - 1) * pageSize + 1 }}–{{ Math.min(paginaActual * pageSize, total) }} de {{ total }}
        </p>
        <div class="flex gap-1">
          <button
            @click="cambiarPagina(paginaActual - 1)"
            :disabled="paginaActual === 1"
            class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          <button
            v-for="p in paginasVisibles"
            :key="p"
            @click="cambiarPagina(p)"
            :class="['px-3 py-1.5 text-xs rounded-lg border transition-colors',
              p === paginaActual ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50']"
          >
            {{ p }}
          </button>
          <button
            @click="cambiarPagina(paginaActual + 1)"
            :disabled="paginaActual === totalPages"
            class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import axios from 'axios'

const toast = useToast()

const pacientes    = ref([])
const busqueda     = ref('')
const cargando     = ref(true)
const total        = ref(0)
const paginaActual = ref(1)
const totalPages   = ref(1)
const pageSize     = 20
let timer = null

const paginasVisibles = computed(() => {
  const pages = []
  const inicio = Math.max(1, paginaActual.value - 2)
  const fin    = Math.min(totalPages.value, paginaActual.value + 2)
  for (let i = inicio; i <= fin; i++) pages.push(i)
  return pages
})

function calcEdad(fecha) {
  if (!fecha) return '—'
  const hoy = new Date()
  const nac = new Date(fecha)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return `${edad} años`
}

async function cargar(q = '', pagina = 1) {
  cargando.value = true
  try {
    if (q) {
      // Búsqueda: sin paginación para mejor UX
      const { data } = await axios.get('/api/pacientes', { params: { q } })
      pacientes.value = data
      total.value = data.length
      totalPages.value = 1
    } else {
      const { data } = await axios.get('/api/pacientes', { params: { page: pagina, limit: pageSize } })
      pacientes.value = data.data
      total.value = data.total
      totalPages.value = data.totalPages
      paginaActual.value = data.page
    }
  } catch {}
  finally { cargando.value = false }
}

function buscar() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    paginaActual.value = 1
    cargar(busqueda.value)
  }, 300)
}

function cambiarPagina(p) {
  if (p < 1 || p > totalPages.value) return
  cargar('', p)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function eliminar(p) {
  if (!confirm(`¿Eliminar a ${p.apellido}, ${p.nombre}? Esta acción no se puede deshacer.`)) return
  try {
    await axios.delete(`/api/pacientes/${p.id}`)
    toast.success('Paciente eliminado')
    await cargar('', paginaActual.value)
  } catch (err) { toast.error(err.response?.data?.error || 'Error al eliminar') }
}

onMounted(() => cargar())
</script>
