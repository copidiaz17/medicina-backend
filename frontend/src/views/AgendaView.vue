<template>
  <div class="p-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Agenda</h1>
        <p class="text-sm text-gray-500 mt-1">Gestión de turnos</p>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <!-- Selector de médico (solo admin) -->
        <select
          v-if="esAdmin && medicos.length"
          v-model="doctorFiltro"
          @change="cargar"
          class="select-field text-sm"
        >
          <option value="">Todos los médicos</option>
          <option v-for="m in medicos" :key="m.id" :value="m.id">Dr/a. {{ m.nombre }}</option>
        </select>
        <!-- Navegación de mes -->
        <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <button @click="cambiarMes(-1)" class="text-gray-500 hover:text-gray-800 transition-colors">
            <i class="fas fa-chevron-left text-sm"></i>
          </button>
          <span class="text-sm font-semibold text-gray-700 min-w-[130px] text-center">{{ mesLabel }}</span>
          <button @click="cambiarMes(1)" class="text-gray-500 hover:text-gray-800 transition-colors">
            <i class="fas fa-chevron-right text-sm"></i>
          </button>
        </div>
        <button @click="irHoy" class="btn-secondary text-sm">Hoy</button>
        <button @click="abrirModalNuevo" class="btn-primary text-sm">
          <i class="fas fa-plus"></i> Nuevo turno
        </button>
      </div>
    </div>

    <!-- Tabs: Mes / Lista / Disponibilidad -->
    <div class="flex gap-2 mb-5">
      <button @click="vista = 'mes'" :class="['px-4 py-2 text-sm rounded-lg font-medium transition-colors', vista === 'mes' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50']">
        <i class="fas fa-calendar-alt mr-1"></i> Mes
      </button>
      <button @click="vista = 'lista'" :class="['px-4 py-2 text-sm rounded-lg font-medium transition-colors', vista === 'lista' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50']">
        <i class="fas fa-list mr-1"></i> Lista
      </button>
      <button @click="vista = 'disponibilidad'" :class="['px-4 py-2 text-sm rounded-lg font-medium transition-colors', vista === 'disponibilidad' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50']">
        <i class="fas fa-clock mr-1"></i> Disponibilidad
      </button>
    </div>

    <!-- Vista Mes: calendario -->
    <div v-if="vista === 'mes'" class="card">
      <div class="grid grid-cols-7 border-b border-gray-100">
        <div v-for="d in diasSemana" :key="d" class="py-2 text-center text-xs font-semibold text-gray-500 uppercase">{{ d }}</div>
      </div>
      <div class="grid grid-cols-7">
        <div
          v-for="(dia, i) in diasCalendario"
          :key="i"
          :class="['min-h-[90px] p-1.5 border-b border-r border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors',
            !dia.delMes ? 'bg-gray-50' : '',
            dia.esHoy ? 'bg-blue-50' : '']"
          @click="dia.delMes && seleccionarDia(dia.fecha)"
        >
          <div :class="['text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full',
            dia.esHoy ? 'bg-blue-600 text-white' : dia.delMes ? 'text-gray-700' : 'text-gray-300']">
            {{ dia.num }}
          </div>
          <div class="space-y-0.5">
            <div
              v-for="t in turnosPorDia[dia.fecha] || []"
              :key="t.id"
              :class="['text-xs px-1.5 py-0.5 rounded font-medium truncate cursor-pointer', colorEstado(t.estado)]"
              @click.stop="verTurno(t)"
              :title="`${t.hora} — ${t.paciente?.apellido}, ${t.paciente?.nombre}`"
            >
              {{ t.hora }} {{ t.paciente?.apellido }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista Lista -->
    <div v-else-if="vista === 'lista'" class="space-y-3">
      <div v-if="cargando" class="card card-body text-center py-16 text-gray-400">
        <i class="fas fa-spinner fa-spin text-2xl mb-2 block"></i> Cargando...
      </div>
      <div v-else-if="turnosMes.length === 0" class="card card-body text-center py-16">
        <i class="fas fa-calendar-times text-4xl text-gray-200 mb-3 block"></i>
        <p class="text-gray-400">Sin turnos para este mes</p>
        <button @click="abrirModalNuevo" class="btn-primary mt-4">
          <i class="fas fa-plus"></i> Agregar turno
        </button>
      </div>
      <template v-else>
        <div v-for="(grupo, fecha) in turnosPorDia" :key="fecha" class="card">
          <div class="card-header">
            <h3 class="font-semibold text-gray-700 text-sm">{{ formatFechaLarga(fecha) }}</h3>
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="t in grupo" :key="t.id" class="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div class="text-sm font-bold text-blue-600 w-12 flex-shrink-0">{{ t.hora }}</div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800">{{ t.paciente?.apellido }}, {{ t.paciente?.nombre }}</p>
                <p v-if="t.motivo" class="text-xs text-gray-500 truncate">{{ t.motivo }}</p>
              </div>
              <span :class="['badge text-xs', badgeEstado(t.estado)]">{{ t.estado }}</span>
              <div class="flex gap-1 flex-shrink-0">
                <button @click="verTurno(t)" class="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Ver / editar">
                  <i class="fas fa-edit text-sm"></i>
                </button>
                <button @click="eliminar(t)" class="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                  <i class="fas fa-trash text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Vista Disponibilidad -->
    <div v-else-if="vista === 'disponibilidad'" class="space-y-4">
      <div class="card card-body">
        <div class="flex flex-wrap items-end gap-4">
          <div v-if="esAdmin">
            <label class="form-label">Médico</label>
            <select v-model="dispDoctor" @change="cargarDisponibilidad" class="select-field">
              <option value="">Seleccionar médico</option>
              <option v-for="m in medicosDisp" :key="m.id" :value="m.id">Dr/a. {{ m.nombre }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">Fecha</label>
            <input v-model="dispFecha" type="date" class="input-field" @change="cargarDisponibilidad" />
          </div>
          <p v-if="dispDoctor && dispFecha" class="text-sm text-gray-500">
            {{ slotsLibres }} slots disponibles de {{ slots.length }}
          </p>
        </div>
      </div>

      <div v-if="cargandoSlots" class="text-center py-10 text-gray-400">
        <i class="fas fa-spinner fa-spin text-xl"></i>
      </div>

      <div v-else-if="slots.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <button
          v-for="s in slots"
          :key="s.hora"
          @click="s.disponible && abrirModalDesdeSlot(s.hora)"
          :class="[
            'p-3 rounded-xl text-sm font-medium text-center transition-colors',
            s.disponible
              ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 cursor-pointer'
              : 'bg-red-50 border border-red-100 text-red-400 cursor-default'
          ]"
          :title="s.turno ? `${s.turno.paciente?.apellido}, ${s.turno.paciente?.nombre} — ${s.turno.estado}` : 'Disponible'"
        >
          <div class="text-base font-bold">{{ s.hora }}</div>
          <div class="text-xs mt-0.5">
            <span v-if="s.disponible">Libre</span>
            <span v-else class="truncate block max-w-full">{{ s.turno?.paciente?.apellido || 'Ocupado' }}</span>
          </div>
        </button>
      </div>

      <div v-else-if="dispDoctor && dispFecha" class="card card-body text-center py-10 text-gray-400">
        Seleccioná un médico y una fecha para ver los slots disponibles
      </div>
    </div>

    <!-- Modal Nuevo / Editar turno -->
    <div v-if="modalAbierto" class="modal-backdrop" @click.self="cerrarModal">
      <div class="modal-box max-w-md">
        <div class="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 class="font-semibold text-gray-800">{{ turnoEditando ? 'Editar turno' : 'Nuevo turno' }}</h2>
          <button @click="cerrarModal" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div class="p-5 space-y-4">

          <!-- Selector de médico (solo admin al crear) -->
          <div v-if="esAdmin && !turnoEditando">
            <label class="form-label">Médico *</label>
            <select v-model="form.doctor_id" class="select-field" required>
              <option value="">Seleccionar médico</option>
              <option v-for="m in medicos" :key="m.id" :value="m.id">Dr/a. {{ m.nombre }}</option>
            </select>
          </div>

          <!-- Paciente -->
          <div v-if="!turnoEditando" class="flex items-center gap-3 mb-1">
            <button
              @click="pacienteNuevo = false"
              :class="['text-sm px-3 py-1 rounded-lg font-medium transition-colors', !pacienteNuevo ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
            >Paciente existente</button>
            <button
              @click="pacienteNuevo = true; form.paciente_id = null; busqPaciente = ''; resultadosPac = []"
              :class="['text-sm px-3 py-1 rounded-lg font-medium transition-colors', pacienteNuevo ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
            >Primera consulta</button>
          </div>

          <!-- Buscar paciente existente -->
          <div v-if="!turnoEditando && !pacienteNuevo">
            <label class="form-label">Paciente *</label>
            <input
              v-model="busqPaciente"
              @input="buscarPacientes"
              type="text"
              class="input-field"
              placeholder="Buscar por nombre, apellido o DNI..."
            />
            <div v-if="resultadosPac.length > 0" class="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button
                v-for="p in resultadosPac"
                :key="p.id"
                @click="selPaciente(p)"
                class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
              >
                {{ p.apellido }}, {{ p.nombre }}
                <span v-if="p.telefono" class="text-xs text-gray-400 ml-1">{{ p.telefono }}</span>
              </button>
            </div>
            <p v-if="form.paciente_id" class="text-xs text-green-600 mt-1">
              <i class="fas fa-check-circle"></i> {{ busqPaciente }}
            </p>
          </div>

          <!-- Nuevo paciente (primera consulta) -->
          <div v-if="!turnoEditando && pacienteNuevo" class="space-y-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p class="text-xs text-blue-600 font-medium"><i class="fas fa-user-plus mr-1"></i>Se creará un nuevo paciente al guardar el turno</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Nombre *</label>
                <input v-model="nuevoPac.nombre" type="text" class="input-field" placeholder="Nombre" />
              </div>
              <div>
                <label class="form-label">Apellido *</label>
                <input v-model="nuevoPac.apellido" type="text" class="input-field" placeholder="Apellido" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">DNI</label>
                <input v-model="nuevoPac.dni" type="text" class="input-field" placeholder="DNI" />
              </div>
              <div>
                <label class="form-label">Teléfono</label>
                <input v-model="nuevoPac.telefono" type="text" class="input-field" placeholder="Teléfono" />
              </div>
            </div>
          </div>

          <!-- Paciente (al editar, solo lectura) -->
          <div v-if="turnoEditando">
            <label class="form-label">Paciente</label>
            <input :value="busqPaciente" type="text" class="input-field" disabled />
          </div>

          <!-- Fecha y hora -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Fecha *</label>
              <input v-model="form.fecha" type="date" class="input-field" />
            </div>
            <div>
              <label class="form-label">Hora *</label>
              <select v-model="form.hora" class="select-field">
                <option value="">Seleccionar hora</option>
                <option v-for="slot in slotsHora" :key="slot" :value="slot">{{ slot }}</option>
              </select>
            </div>
          </div>

          <!-- Motivo -->
          <div>
            <label class="form-label">Motivo</label>
            <input v-model="form.motivo" type="text" class="input-field" placeholder="Motivo de la consulta" />
          </div>

          <!-- Estado (solo al editar) -->
          <div v-if="turnoEditando">
            <label class="form-label">Estado</label>
            <select v-model="form.estado" class="select-field">
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
              <option value="realizado">Realizado</option>
            </select>
          </div>

          <!-- Notas -->
          <div>
            <label class="form-label">Notas</label>
            <textarea v-model="form.notas" class="textarea-field" rows="2" placeholder="Observaciones..."></textarea>
          </div>

          <!-- WhatsApp (solo al crear, si paciente tiene teléfono y WA está configurado) -->
          <div v-if="!turnoEditando && whatsappDisponible && pacienteSeleccionado?.telefono"
            class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <i class="fab fa-whatsapp text-green-600 text-lg"></i>
            <label class="flex-1 text-sm text-green-800 cursor-pointer">
              Enviar confirmación por WhatsApp a {{ pacienteSeleccionado.telefono }}
            </label>
            <input type="checkbox" v-model="form.notificar_whatsapp" class="rounded" />
          </div>

          <div class="flex gap-3 pt-1">
            <button @click="guardar" :disabled="guardando" class="btn-primary flex-1">
              <i v-if="guardando" class="fas fa-spinner fa-spin mr-1"></i>
              {{ turnoEditando ? 'Guardar cambios' : 'Crear turno' }}
            </button>
            <button @click="cerrarModal" class="btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const toast     = useToast()
const authStore = useAuthStore()

const esAdmin      = computed(() => authStore.user?.rol === 'admin')
const esSecretaria = computed(() => authStore.user?.rol === 'secretaria')
const esSecretariaOAdmin = computed(() => esAdmin.value || esSecretaria.value)

// ── Estado ──────────────────────────────────────────────────────
const vista          = ref('mes')
const mesActual      = ref(new Date())
const turnosMes      = ref([])
const cargando       = ref(false)
const modalAbierto   = ref(false)
const turnoEditando  = ref(null)
const guardando      = ref(false)
const busqPaciente   = ref('')
const resultadosPac  = ref([])
const pacienteSeleccionado = ref(null)
const pacienteNuevo  = ref(false)
const nuevoPac       = ref({ nombre: '', apellido: '', dni: '', telefono: '' })
const medicos        = ref([])
const doctorFiltro   = ref('')
const whatsappDisponible = ref(false)
let timerPac = null

// Disponibilidad
const dispDoctor      = ref('')
const dispFecha       = ref(new Date().toISOString().split('T')[0])
const slots           = ref([])
const cargandoSlots   = ref(false)
const medicosDisp     = computed(() => medicos.value.length ? medicos.value : [])
const slotsLibres     = computed(() => slots.value.filter(s => s.disponible).length)

const form = ref({
  paciente_id: null, doctor_id: '', fecha: '', hora: '',
  motivo: '', estado: 'pendiente', notas: '', notificar_whatsapp: false,
})

// ── Helpers de fecha ────────────────────────────────────────────
// Slots de 30 min entre 08:00 y 20:00
const slotsHora = (() => {
  const slots = []
  for (let h = 8; h < 20; h++)
    for (const m of ['00', '30'])
      slots.push(`${String(h).padStart(2,'0')}:${m}`)
  return slots
})()

const diasSemana  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const mesesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const mesLabel = computed(() => `${mesesNombre[mesActual.value.getMonth()]} ${mesActual.value.getFullYear()}`)

function hoyStr() { return new Date().toISOString().split('T')[0] }
function padMes() {
  const y = mesActual.value.getFullYear()
  const m = String(mesActual.value.getMonth() + 1).padStart(2,'0')
  return `${y}-${m}`
}
function formatFechaLarga(f) {
  if (!f) return ''
  const [y,m,d] = f.split('-')
  return new Date(Number(y), Number(m)-1, Number(d))
    .toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })
}

// ── Calendario ──────────────────────────────────────────────────
const diasCalendario = computed(() => {
  const y = mesActual.value.getFullYear()
  const m = mesActual.value.getMonth()
  const primerDia  = new Date(y, m, 1).getDay()
  const diasEnMes  = new Date(y, m + 1, 0).getDate()
  const hoy        = hoyStr()
  const dias       = []
  const diasMesAnt = new Date(y, m, 0).getDate()
  for (let i = primerDia - 1; i >= 0; i--)
    dias.push({ num: diasMesAnt - i, delMes: false, fecha: '', esHoy: false })
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    dias.push({ num: d, delMes: true, fecha, esHoy: fecha === hoy })
  }
  const resto = 7 - (dias.length % 7)
  if (resto < 7) for (let d = 1; d <= resto; d++) dias.push({ num: d, delMes: false, fecha: '', esHoy: false })
  return dias
})

const turnosPorDia = computed(() => {
  const grupos = {}
  for (const t of turnosMes.value) {
    if (!grupos[t.fecha]) grupos[t.fecha] = []
    grupos[t.fecha].push(t)
  }
  return grupos
})

// ── Colores ─────────────────────────────────────────────────────
function colorEstado(e) {
  return { pendiente:'bg-yellow-100 text-yellow-700', confirmado:'bg-green-100 text-green-700', cancelado:'bg-red-100 text-red-500 line-through', realizado:'bg-gray-100 text-gray-500' }[e] || 'bg-gray-100 text-gray-500'
}
function badgeEstado(e) {
  return { pendiente:'badge-orange', confirmado:'badge-green', cancelado:'badge-red', realizado:'badge-gray' }[e] || 'badge-gray'
}

// ── API ─────────────────────────────────────────────────────────
async function cargar() {
  cargando.value = true
  try {
    const params = { mes: padMes() }
    if (doctorFiltro.value) params.doctor_id = doctorFiltro.value
    const { data } = await axios.get('/api/turnos', { params })
    turnosMes.value = data
  } catch { turnosMes.value = [] }
  finally { cargando.value = false }
}

async function cargarMedicos() {
  try {
    const { data } = await axios.get('/api/usuarios/medicos')
    medicos.value = data
    if (esSecretaria.value) {
      // Secretaria: bloquear a su médico asignado
      doctorFiltro.value = authStore.user?.medico_id
      dispDoctor.value   = authStore.user?.medico_id
    } else if (!esAdmin.value) {
      // Médico: ver sus propios slots
      dispDoctor.value = authStore.user?.id
    }
  } catch { medicos.value = [] }
}

async function cargarDisponibilidad() {
  if (!dispDoctor.value || !dispFecha.value) { slots.value = []; return }
  cargandoSlots.value = true
  try {
    const { data } = await axios.get('/api/turnos/disponibles', {
      params: { doctor_id: dispDoctor.value, fecha: dispFecha.value }
    })
    slots.value = data.slots
  } catch { slots.value = [] }
  finally { cargandoSlots.value = false }
}

async function buscarPacientes() {
  clearTimeout(timerPac)
  if (!busqPaciente.value.trim()) { resultadosPac.value = []; return }
  timerPac = setTimeout(async () => {
    try {
      const { data } = await axios.get('/api/pacientes', { params: { q: busqPaciente.value } })
      resultadosPac.value = data.slice ? data.slice(0, 8) : (data.data || []).slice(0, 8)
    } catch { resultadosPac.value = [] }
  }, 300)
}

function selPaciente(p) {
  form.value.paciente_id = p.id
  pacienteSeleccionado.value = p
  busqPaciente.value = `${p.apellido}, ${p.nombre}`
  resultadosPac.value = []
}

async function guardar() {
  if (!form.value.fecha) { toast.warning('Ingresá la fecha del turno'); return }
  if (!form.value.hora)  { toast.warning('Ingresá la hora del turno'); return }
  if (esAdmin.value && !turnoEditando.value && !form.value.doctor_id) {
    toast.warning('Seleccioná un médico'); return
  }

  // Validar según modo paciente
  if (!turnoEditando.value) {
    if (pacienteNuevo.value) {
      if (!nuevoPac.value.nombre || !nuevoPac.value.apellido) {
        toast.warning('Ingresá nombre y apellido del paciente'); return
      }
    } else if (!form.value.paciente_id) {
      toast.warning('Seleccioná un paciente de la lista'); return
    }
  }

  guardando.value = true
  try {
    // Si es paciente nuevo, crearlo primero
    if (!turnoEditando.value && pacienteNuevo.value) {
      const { data: pac } = await axios.post('/api/pacientes', nuevoPac.value)
      form.value.paciente_id = pac.id
      pacienteSeleccionado.value = pac
    }

    if (turnoEditando.value) {
      await axios.put(`/api/turnos/${turnoEditando.value.id}`, form.value)
      toast.success('Turno actualizado')
    } else {
      await axios.post('/api/turnos', form.value)
      const msg = form.value.notificar_whatsapp ? 'Turno creado y notificación enviada por WhatsApp' : 'Turno creado'
      toast.success(pacienteNuevo.value ? `Paciente registrado y ${msg.toLowerCase()}` : msg)
    }
    cerrarModal()
    await cargar()
    if (vista.value === 'disponibilidad') await cargarDisponibilidad()
  } catch (err) {
    toast.error(err.response?.data?.error || 'Error al guardar')
  } finally { guardando.value = false }
}

async function eliminar(t) {
  if (!confirm(`¿Eliminar turno de ${t.paciente?.apellido}, ${t.paciente?.nombre}?`)) return
  try {
    await axios.delete(`/api/turnos/${t.id}`)
    toast.success('Turno eliminado')
    await cargar()
  } catch { toast.error('Error al eliminar') }
}

// ── Navegación ──────────────────────────────────────────────────
function cambiarMes(delta) {
  const d = new Date(mesActual.value)
  d.setMonth(d.getMonth() + delta)
  mesActual.value = d
}
function irHoy() { mesActual.value = new Date() }
function seleccionarDia(fecha) { abrirModalNuevo(fecha) }

// ── Modal ───────────────────────────────────────────────────────
function abrirModalNuevo(fecha = '') {
  turnoEditando.value = null
  busqPaciente.value = ''
  pacienteSeleccionado.value = null
  resultadosPac.value = []
  pacienteNuevo.value = false
  nuevoPac.value = { nombre: '', apellido: '', dni: '', telefono: '' }
  form.value = {
    paciente_id: null,
    doctor_id:   esAdmin.value ? (doctorFiltro.value || '') : '',
    fecha:       fecha || hoyStr(),
    hora:        '',
    motivo:      '',
    estado:      'pendiente',
    notas:       '',
    notificar_whatsapp: false,
  }
  modalAbierto.value = true
}

function abrirModalDesdeSlot(hora) {
  abrirModalNuevo(dispFecha.value)
  form.value.hora = hora
  if (dispDoctor.value) form.value.doctor_id = dispDoctor.value
}

function verTurno(t) {
  turnoEditando.value = t
  pacienteSeleccionado.value = t.paciente
  busqPaciente.value = `${t.paciente?.apellido}, ${t.paciente?.nombre}`
  form.value = {
    paciente_id: t.paciente_id, doctor_id: t.doctor_id,
    fecha: t.fecha, hora: t.hora, motivo: t.motivo || '',
    estado: t.estado, notas: t.notas || '', notificar_whatsapp: false,
  }
  modalAbierto.value = true
}

function cerrarModal() {
  modalAbierto.value = false
  turnoEditando.value = null
  resultadosPac.value = []
  pacienteSeleccionado.value = null
  pacienteNuevo.value = false
  nuevoPac.value = { nombre: '', apellido: '', dni: '', telefono: '' }
}

// ── Watchers ────────────────────────────────────────────────────
watch(mesActual, cargar)

onMounted(async () => {
  await cargarMedicos()
  await cargar()
  // Pre-cargar disponibilidad del día de hoy para médico y secretaria
  if (!esAdmin.value) {
    await cargarDisponibilidad()
  }
  // Verificar si WhatsApp está configurado
  try {
    const { data } = await axios.get('/api/config')
    whatsappDisponible.value = data.whatsapp
  } catch { whatsappDisponible.value = false }
})
</script>
