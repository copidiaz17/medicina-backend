<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-sm text-gray-500 mt-1 capitalize">{{ fechaHoy }}</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="stat in stats" :key="stat.label" class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">{{ stat.label }}</span>
          <div :class="['w-8 h-8 rounded-lg flex items-center justify-center text-sm', stat.iconBg]">
            <i :class="stat.icon"></i>
          </div>
        </div>
        <p :class="['text-3xl font-bold', stat.color]">{{ cargando ? '…' : stat.value }}</p>
      </div>
    </div>

    <!-- ── Onboarding (sin pacientes) ── -->
    <div v-if="!cargando && stats[0].value === 0" class="card mb-6 border-blue-100 bg-blue-50/30">
      <div class="card-body py-8">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-heartbeat text-blue-600 text-2xl"></i>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mb-1">¡Bienvenido a Medicina IA!</h2>
          <p class="text-sm text-gray-500">Seguí estos pasos para comenzar tu primer análisis con IA</p>
        </div>
        <div class="grid sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div v-for="(paso, i) in pasos" :key="i" class="flex flex-col items-center text-center gap-2">
            <div :class="['w-12 h-12 rounded-xl flex items-center justify-center text-lg shadow-sm', paso.bg]">
              <i :class="[paso.icon, paso.color]"></i>
            </div>
            <div class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold">{{ i+1 }}</div>
            <p class="text-xs font-semibold text-gray-700">{{ paso.titulo }}</p>
            <p class="text-xs text-gray-500 leading-relaxed">{{ paso.desc }}</p>
          </div>
        </div>
        <div class="flex justify-center mt-8">
          <RouterLink to="/pacientes/nuevo" class="btn-primary px-6 py-2.5">
            <i class="fas fa-user-plus"></i> Crear primer paciente
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- ── Contenido principal ── -->
    <div v-if="!cargando && stats[0].value > 0" class="grid lg:grid-cols-5 gap-5">

      <!-- Últimas consultas (col 3) -->
      <div class="lg:col-span-3 card">
        <div class="card-header">
          <h2 class="font-semibold text-gray-800 flex items-center gap-2">
            <i class="fas fa-stethoscope text-blue-500 text-sm"></i> Últimas consultas
          </h2>
          <RouterLink to="/pacientes" class="btn-secondary text-xs">Ver pacientes</RouterLink>
        </div>
        <div v-if="ultimasConsultas.length === 0" class="card-body text-center py-10 text-gray-400">
          <i class="fas fa-stethoscope text-3xl mb-2 block opacity-30"></i>
          <p class="text-sm">No hay consultas todavía</p>
        </div>
        <div v-else class="divide-y divide-gray-50">
          <RouterLink
            v-for="c in ultimasConsultas" :key="c.id"
            :to="`/consultas/${c.id}`"
            class="flex items-center gap-3 px-5 py-3.5 hover:bg-blue-50/40 transition-colors group"
          >
            <div class="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-file-medical text-blue-600 text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">
                {{ c.paciente?.apellido }}, {{ c.paciente?.nombre }}
              </p>
              <p class="text-xs text-gray-500 truncate">{{ c.motivo }}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span v-if="c.respuestaIA" class="badge badge-gray text-xs">
                <i class="fas fa-brain text-violet-500 mr-1"></i>IA
              </span>
              <span class="text-xs text-gray-400">{{ formatFecha(c.fecha) }}</span>
              <i class="fas fa-chevron-right text-gray-300 text-xs group-hover:text-blue-400"></i>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- Últimos pacientes (col 2) -->
      <div class="lg:col-span-2 card">
        <div class="card-header">
          <h2 class="font-semibold text-gray-800 flex items-center gap-2">
            <i class="fas fa-users text-green-500 text-sm"></i> Pacientes recientes
          </h2>
        </div>
        <div v-if="pacientes.length === 0" class="card-body text-center py-10 text-gray-400">
          <p class="text-sm">Sin pacientes</p>
        </div>
        <div v-else class="divide-y divide-gray-50">
          <RouterLink
            v-for="p in pacientes.slice(0,6)" :key="p.id"
            :to="`/pacientes/${p.id}`"
            class="flex items-center gap-3 px-5 py-3 hover:bg-green-50/40 transition-colors group"
          >
            <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {{ (p.nombre[0] + p.apellido[0]).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">{{ p.apellido }}, {{ p.nombre }}</p>
              <p class="text-xs text-gray-400">{{ calcEdad(p.fecha_nacimiento) }}</p>
            </div>
            <i class="fas fa-chevron-right text-gray-300 text-xs group-hover:text-green-400 flex-shrink-0"></i>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const cargando      = ref(true)
const pacientes     = ref([])
const ultimasConsultas = ref([])

const fechaHoy = new Date().toLocaleDateString('es-AR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})

const pasos = [
  { titulo: 'Crear paciente', desc: 'Ingresá los datos personales y antropométricos', icon: 'fas fa-user-plus', bg: 'bg-blue-50', color: 'text-blue-600' },
  { titulo: 'Cargar antecedentes', desc: 'Patologías previas, alergias y hábitos', icon: 'fas fa-notes-medical', bg: 'bg-green-50', color: 'text-green-600' },
  { titulo: 'Nueva consulta', desc: 'Motivo, síntomas, signos vitales y estudios', icon: 'fas fa-stethoscope', bg: 'bg-orange-50', color: 'text-orange-600' },
  { titulo: 'Consultar IA', desc: 'Claude analiza todo el caso y da orientación diagnóstica', icon: 'fas fa-brain', bg: 'bg-violet-50', color: 'text-violet-600' },
]

const stats = ref([
  { label: 'Pacientes',      value: 0, icon: 'fas fa-user-injured text-blue-600',   iconBg: 'bg-blue-50',   color: 'text-blue-700' },
  { label: 'Consultas hoy',  value: 0, icon: 'fas fa-stethoscope text-green-600',   iconBg: 'bg-green-50',  color: 'text-green-700' },
  { label: 'Con IA',         value: 0, icon: 'fas fa-brain text-violet-600',         iconBg: 'bg-violet-50', color: 'text-violet-700' },
  { label: 'Total consultas',value: 0, icon: 'fas fa-file-medical text-orange-500', iconBg: 'bg-orange-50', color: 'text-orange-600' },
])

function calcEdad(fecha) {
  if (!fecha) return '—'
  const hoy = new Date(), nac = new Date(fecha)
  const edad = hoy.getFullYear() - nac.getFullYear()
  return `${edad} años`
}

function formatFecha(f) {
  if (!f) return ''
  return new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

onMounted(async () => {
  try {
    const [statsRes, pacRes] = await Promise.all([
      axios.get('/api/dashboard/stats'),
      axios.get('/api/pacientes'),
    ])
    const d = statsRes.data
    stats.value[0].value = d.totalPacientes
    stats.value[1].value = d.consultasHoy
    stats.value[2].value = d.consultasConIA
    stats.value[3].value = d.totalConsultas
    ultimasConsultas.value = d.ultimasConsultas || []
    pacientes.value = pacRes.data
  } catch {}
  finally { cargando.value = false }
})
</script>
