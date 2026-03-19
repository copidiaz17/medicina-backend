<template>
  <div class="p-6">
    <div v-if="cargando" class="text-center py-20 text-gray-400">
      <i class="fas fa-spinner fa-spin text-2xl"></i>
    </div>

    <template v-else-if="paciente">
      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div class="flex items-center gap-4">
          <RouterLink to="/pacientes" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-arrow-left"></i>
          </RouterLink>
          <div class="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-blue-200">
            {{ iniciales }}
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ paciente.apellido }}, {{ paciente.nombre }}</h1>
            <div class="flex items-center gap-3 mt-1">
              <span v-if="paciente.sexo" :class="['badge text-xs', paciente.sexo === 'masculino' ? 'badge-blue' : 'badge-red']">{{ paciente.sexo }}</span>
              <span class="text-sm text-gray-500">{{ calcEdad(paciente.fecha_nacimiento) }}</span>
              <span v-if="paciente.grupo_sanguineo" class="badge badge-orange text-xs">{{ paciente.grupo_sanguineo }}</span>
              <span v-if="imc" :class="['badge text-xs', imcClase]">IMC {{ imc }}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <RouterLink :to="`/pacientes/${paciente.id}/consultas/nueva`" class="btn-primary">
            <i class="fas fa-stethoscope"></i> Nueva consulta
          </RouterLink>
          <RouterLink :to="`/pacientes/${paciente.id}/editar`" class="btn-secondary">
            <i class="fas fa-edit"></i> Editar
          </RouterLink>
          <button @click="eliminarPaciente" class="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-5 border-b border-gray-100 pb-0">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="['px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
            activeTab === tab.key
              ? 'bg-white border border-b-white border-gray-100 text-cardio-blue -mb-px'
              : 'text-gray-500 hover:text-gray-700']"
        >
          <i :class="[tab.icon, 'mr-1.5']"></i>{{ tab.label }}
          <span v-if="tab.count" class="ml-1.5 badge badge-gray text-xs">{{ tab.count }}</span>
        </button>
      </div>

      <!-- ─── TAB: Info personal ─────────────────────────────── -->
      <template v-if="activeTab === 'info'">
        <div class="grid lg:grid-cols-2 gap-5">
          <div class="card">
            <div class="card-header"><h3 class="font-semibold text-gray-700">Datos personales</h3></div>
            <div class="card-body space-y-3">
              <div v-for="campo in camposPersonales" :key="campo.label" class="flex justify-between text-sm">
                <span class="text-gray-500">{{ campo.label }}</span>
                <span class="font-medium text-gray-800">{{ campo.valor || '—' }}</span>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3 class="font-semibold text-gray-700">Contacto y cobertura</h3></div>
            <div class="card-body space-y-3">
              <div v-for="campo in camposContacto" :key="campo.label" class="flex justify-between text-sm">
                <span class="text-gray-500">{{ campo.label }}</span>
                <span class="font-medium text-gray-800">{{ campo.valor || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ─── TAB: Antecedentes ─────────────────────────────── -->
      <template v-else-if="activeTab === 'antecedentes'">
        <div class="card">
          <div class="card-header">
            <h3 class="font-semibold text-gray-700">Historia clínica — Antecedentes</h3>
            <button @click="editAnt = !editAnt" class="btn-secondary text-xs">
              <i :class="editAnt ? 'fas fa-times' : 'fas fa-edit'"></i>
              {{ editAnt ? 'Cancelar' : 'Editar' }}
            </button>
          </div>
          <div class="card-body">
            <div v-if="!editAnt" class="grid lg:grid-cols-2 gap-6">
              <div>
                <p class="form-label">Antecedentes familiares</p>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ ant.antecedentes_familiares || '—' }}</p>
              </div>
              <div>
                <p class="form-label">Patologías previas</p>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ ant.patologias_previas || '—' }}</p>
              </div>
              <div>
                <p class="form-label">Alergias</p>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ ant.alergias || '—' }}</p>
              </div>
              <div>
                <p class="form-label">Cirugías previas</p>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ ant.cirugias_previas || '—' }}</p>
              </div>
              <div class="lg:col-span-2 grid grid-cols-3 gap-4">
                <div class="p-3 rounded-xl border text-center" :class="antBadgeClass(ant.tabaco, 'tabaco')">
                  <p class="form-label mb-1">Tabaco</p>
                  <p class="text-sm font-medium">{{ ant.tabaco || 'no_fumador' }}</p>
                </div>
                <div class="p-3 rounded-xl border text-center" :class="antBadgeClass(ant.alcohol, 'alcohol')">
                  <p class="form-label mb-1">Alcohol</p>
                  <p class="text-sm font-medium">{{ ant.alcohol || 'no' }}</p>
                </div>
                <div class="p-3 rounded-xl border text-center">
                  <p class="form-label mb-1">Actividad física</p>
                  <p class="text-sm font-medium">{{ ant.actividad_fisica || 'sedentario' }}</p>
                </div>
              </div>
              <div class="lg:col-span-2">
                <p class="form-label">Otros hábitos</p>
                <p class="text-sm text-gray-700">{{ ant.otros_habitos || '—' }}</p>
              </div>
            </div>

            <!-- Formulario editar antecedentes -->
            <form v-else @submit.prevent="guardarAnt" class="grid lg:grid-cols-2 gap-4">
              <div>
                <label class="form-label">Antecedentes familiares</label>
                <textarea v-model="antForm.antecedentes_familiares" rows="3" class="textarea-field"
                  placeholder="HTA familiar, cardiopatía isquémica, diabetes..."></textarea>
              </div>
              <div>
                <label class="form-label">Patologías previas</label>
                <textarea v-model="antForm.patologias_previas" rows="3" class="textarea-field"
                  placeholder="HTA, dislipemia, diabetes tipo 2..."></textarea>
              </div>
              <div>
                <label class="form-label">Alergias</label>
                <textarea v-model="antForm.alergias" rows="2" class="textarea-field"
                  placeholder="Penicilina, AAS..."></textarea>
              </div>
              <div>
                <label class="form-label">Cirugías previas</label>
                <textarea v-model="antForm.cirugias_previas" rows="2" class="textarea-field"
                  placeholder="Bypass 2018, RCP..."></textarea>
              </div>
              <div>
                <label class="form-label">Tabaquismo</label>
                <select v-model="antForm.tabaco" class="select-field">
                  <option value="no_fumador">No fumador</option>
                  <option value="ex_fumador">Ex fumador</option>
                  <option value="fumador_leve">Fumador leve (&lt;10/día)</option>
                  <option value="fumador_moderado">Fumador moderado (10-20/día)</option>
                  <option value="fumador_severo">Fumador severo (&gt;20/día)</option>
                </select>
              </div>
              <div>
                <label class="form-label">Consumo de alcohol</label>
                <select v-model="antForm.alcohol" class="select-field">
                  <option value="no">No consume</option>
                  <option value="ocasional">Ocasional</option>
                  <option value="moderado">Moderado</option>
                  <option value="frecuente">Frecuente</option>
                </select>
              </div>
              <div>
                <label class="form-label">Actividad física</label>
                <select v-model="antForm.actividad_fisica" class="select-field">
                  <option value="sedentario">Sedentario</option>
                  <option value="leve">Leve (1-2 veces/sem)</option>
                  <option value="moderado">Moderado (3-4 veces/sem)</option>
                  <option value="intenso">Intenso (&gt;5 veces/sem)</option>
                </select>
              </div>
              <div>
                <label class="form-label">Otros hábitos</label>
                <input v-model="antForm.otros_habitos" type="text" class="input-field" />
              </div>
              <div class="lg:col-span-2 flex gap-3 justify-end">
                <button type="button" @click="editAnt = false" class="btn-secondary">Cancelar</button>
                <button type="submit" :disabled="guardandoAnt" class="btn-primary">
                  <i v-if="guardandoAnt" class="fas fa-spinner fa-spin"></i>
                  Guardar antecedentes
                </button>
              </div>
            </form>
          </div>
        </div>
      </template>

      <!-- ─── TAB: Medicación ───────────────────────────────── -->
      <template v-else-if="activeTab === 'medicacion'">
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="font-semibold text-gray-700">Medicación actual</h3>
            <button @click="abrirModalMed()" class="btn-primary text-xs">
              <i class="fas fa-plus"></i> Agregar
            </button>
          </div>
          <div v-if="medicaciones.length === 0" class="card-body text-center py-8 text-gray-400">
            Sin medicación registrada
          </div>
          <table v-else class="tabla">
            <thead><tr>
              <th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Indicación</th><th>Desde</th><th></th>
            </tr></thead>
            <tbody>
              <tr v-for="m in medicaciones" :key="m.id">
                <td class="font-medium">{{ m.nombre }}</td>
                <td>{{ m.dosis || '—' }}</td>
                <td>{{ m.frecuencia || '—' }}</td>
                <td class="text-gray-500">{{ m.indicacion || '—' }}</td>
                <td class="text-gray-500">{{ m.desde ? new Date(m.desde).toLocaleDateString('es-AR') : '—' }}</td>
                <td>
                  <button @click="abrirModalMed(m)" class="text-blue-500 hover:text-blue-700 mr-3 text-sm">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button @click="eliminarMed(m)" class="text-red-400 hover:text-red-600 text-sm">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- ─── TAB: Consultas ────────────────────────────────── -->
      <template v-else-if="activeTab === 'consultas'">
        <div class="flex justify-end mb-4">
          <RouterLink :to="`/pacientes/${paciente.id}/consultas/nueva`" class="btn-primary">
            <i class="fas fa-plus"></i> Nueva consulta
          </RouterLink>
        </div>
        <div class="space-y-3">
          <div v-if="consultas.length === 0" class="card card-body text-center py-10 text-gray-400">
            Sin consultas registradas
          </div>
          <div v-for="c in consultas" :key="c.id" class="card hover:border-blue-200 transition-colors">
            <div class="card-body">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-1">
                    <p class="text-sm font-semibold text-gray-900">{{ formatFecha(c.fecha) }}</p>
                    <span v-if="c.respuestaIA" class="badge bg-violet-100 text-violet-700 text-xs">
                      <i class="fas fa-brain mr-1"></i> Con IA
                    </span>
                  </div>
                  <p class="text-sm text-gray-600">{{ c.motivo }}</p>
                  <div class="flex gap-4 mt-2 text-xs text-gray-400">
                    <span v-if="c.presion_arterial"><i class="fas fa-heart mr-1"></i>{{ c.presion_arterial }}</span>
                    <span v-if="c.frecuencia_cardiaca"><i class="fas fa-heartbeat mr-1"></i>{{ c.frecuencia_cardiaca }} lpm</span>
                    <span v-if="c.saturacion_o2"><i class="fas fa-lungs mr-1"></i>{{ c.saturacion_o2 }}% SpO₂</span>
                  </div>
                </div>
                <RouterLink :to="`/consultas/${c.id}`" class="btn-secondary text-xs ml-4">
                  Ver consulta →
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Modal medicación -->
    <div v-if="modalMed" class="modal-backdrop" @click.self="modalMed = false">
      <div class="modal-box max-w-md">
        <div class="card-header">
          <h3 class="font-semibold">{{ medForm.id ? 'Editar' : 'Agregar' }} medicamento</h3>
          <button @click="modalMed = false" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form @submit.prevent="guardarMed" class="card-body space-y-4">
          <div>
            <label class="form-label">Nombre del medicamento *</label>
            <input v-model="medForm.nombre" type="text" class="input-field" required
              placeholder="Atenolol, Losartán..." />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Dosis</label>
              <input v-model="medForm.dosis" type="text" class="input-field" placeholder="50mg" />
            </div>
            <div>
              <label class="form-label">Frecuencia</label>
              <input v-model="medForm.frecuencia" type="text" class="input-field" placeholder="1 vez/día" />
            </div>
          </div>
          <div>
            <label class="form-label">Indicación / motivo</label>
            <input v-model="medForm.indicacion" type="text" class="input-field" placeholder="HTA, ICC..." />
          </div>
          <div>
            <label class="form-label">Desde</label>
            <input v-model="medForm.desde" type="date" class="input-field" />
          </div>
          <div class="flex gap-3 justify-end pt-2">
            <button type="button" @click="modalMed = false" class="btn-secondary">Cancelar</button>
            <button type="submit" :disabled="guardandoMed" class="btn-primary">
              <i v-if="guardandoMed" class="fas fa-spinner fa-spin"></i>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import axios from 'axios'

const route  = useRoute()
const router = useRouter()
const toast  = useToast()

const cargando   = ref(true)
const paciente   = ref(null)
const consultas  = ref([])
const medicaciones = ref([])
const activeTab  = ref('info')
const editAnt    = ref(false)
const guardandoAnt = ref(false)
const modalMed   = ref(false)
const guardandoMed = ref(false)

const ant = ref({})
const antForm = reactive({
  antecedentes_familiares: '', patologias_previas: '', alergias: '',
  cirugias_previas: '', tabaco: 'no_fumador', alcohol: 'no',
  actividad_fisica: 'sedentario', otros_habitos: '',
})

const medForm = reactive({ id: null, nombre: '', dosis: '', frecuencia: '', indicacion: '', desde: '' })

const tabs = computed(() => [
  { key: 'info',         label: 'Datos',         icon: 'fas fa-id-card' },
  { key: 'antecedentes', label: 'Antecedentes',  icon: 'fas fa-history' },
  { key: 'medicacion',   label: 'Medicación',    icon: 'fas fa-pills', count: medicaciones.value.length },
  { key: 'consultas',    label: 'Consultas',     icon: 'fas fa-stethoscope', count: consultas.value.length },
])

const iniciales = computed(() => {
  if (!paciente.value) return ''
  return `${paciente.value.nombre?.[0] || ''}${paciente.value.apellido?.[0] || ''}`.toUpperCase()
})

const imc = computed(() => {
  const p = paciente.value
  if (!p?.peso_kg || !p?.talla_cm) return null
  return (p.peso_kg / Math.pow(p.talla_cm / 100, 2)).toFixed(1)
})

const imcClase = computed(() => {
  const v = parseFloat(imc.value)
  if (v < 18.5) return 'badge-orange'
  if (v < 25)   return 'badge-green'
  if (v < 30)   return 'badge-orange'
  return 'badge-red'
})

const camposPersonales = computed(() => {
  const p = paciente.value
  return [
    { label: 'Apellido y nombre', valor: `${p.apellido}, ${p.nombre}` },
    { label: 'DNI', valor: p.dni },
    { label: 'Fecha de nacimiento', valor: p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toLocaleDateString('es-AR') : null },
    { label: 'Edad', valor: calcEdad(p.fecha_nacimiento) },
    { label: 'Sexo', valor: p.sexo },
    { label: 'Grupo sanguíneo', valor: p.grupo_sanguineo },
    { label: 'Peso', valor: p.peso_kg ? `${p.peso_kg} kg` : null },
    { label: 'Talla', valor: p.talla_cm ? `${p.talla_cm} cm` : null },
    { label: 'IMC', valor: imc.value ? `${imc.value} kg/m²` : null },
  ]
})

const camposContacto = computed(() => {
  const p = paciente.value
  return [
    { label: 'Teléfono', valor: p.telefono },
    { label: 'Email', valor: p.email },
    { label: 'Obra social', valor: p.obra_social },
    { label: 'N° afiliado', valor: p.nro_afiliado },
  ]
})

function calcEdad(fecha) {
  if (!fecha) return '—'
  const hoy = new Date(); const nac = new Date(fecha)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return `${e} años`
}

function formatFecha(f) {
  return new Date(f).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function antBadgeClass(val, tipo) {
  if (tipo === 'tabaco' && val && val !== 'no_fumador') return 'border-red-200 bg-red-50'
  if (tipo === 'alcohol' && val && val !== 'no') return 'border-orange-200 bg-orange-50'
  return 'border-green-200 bg-green-50'
}

function abrirModalMed(m = null) {
  if (m) {
    Object.assign(medForm, { id: m.id, nombre: m.nombre, dosis: m.dosis||'', frecuencia: m.frecuencia||'', indicacion: m.indicacion||'', desde: m.desde||'' })
  } else {
    Object.assign(medForm, { id: null, nombre: '', dosis: '', frecuencia: '', indicacion: '', desde: '' })
  }
  modalMed.value = true
}

async function guardarMed() {
  guardandoMed.value = true
  try {
    if (medForm.id) {
      await axios.put(`/api/pacientes/${paciente.value.id}/medicaciones/${medForm.id}`, medForm)
      toast.success('Medicamento actualizado')
    } else {
      await axios.post(`/api/pacientes/${paciente.value.id}/medicaciones`, medForm)
      toast.success('Medicamento agregado')
    }
    modalMed.value = false
    await cargarMedicaciones()
  } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  finally { guardandoMed.value = false }
}

async function eliminarMed(m) {
  if (!confirm(`¿Eliminar ${m.nombre}?`)) return
  await axios.delete(`/api/pacientes/${paciente.value.id}/medicaciones/${m.id}`)
  toast.success('Medicamento eliminado')
  await cargarMedicaciones()
}

async function guardarAnt() {
  guardandoAnt.value = true
  try {
    const { data } = await axios.put(`/api/pacientes/${paciente.value.id}/antecedentes`, antForm)
    ant.value = data
    Object.assign(antForm, data)
    editAnt.value = false
    toast.success('Antecedentes guardados')
  } catch (err) { toast.error('Error al guardar') }
  finally { guardandoAnt.value = false }
}

async function eliminarPaciente() {
  if (!confirm(`¿Eliminar a ${paciente.value.apellido}, ${paciente.value.nombre}? Esta acción no se puede deshacer.`)) return
  try {
    await axios.delete(`/api/pacientes/${paciente.value.id}`)
    toast.success('Paciente eliminado')
    router.push('/pacientes')
  } catch (err) { toast.error(err.response?.data?.error || 'Error al eliminar') }
}

async function cargarMedicaciones() {
  const { data } = await axios.get(`/api/pacientes/${paciente.value.id}`)
  medicaciones.value = data.medicaciones || []
}

onMounted(async () => {
  try {
    const { data } = await axios.get(`/api/pacientes/${route.params.id}`)
    paciente.value = data
    ant.value = data.antecedente || {}
    Object.keys(antForm).forEach(k => { if (data.antecedente?.[k] !== undefined) antForm[k] = data.antecedente[k] })
    medicaciones.value = data.medicaciones || []
    // Cargar consultas
    const r2 = await axios.get(`/api/consultas/paciente/${route.params.id}`)
    consultas.value = r2.data
  } catch (err) { console.error(err) }
  finally { cargando.value = false }
})
</script>
