<template>
  <div class="p-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <RouterLink :to="`/pacientes/${pacienteId}`" class="text-gray-400 hover:text-gray-600">
        <i class="fas fa-arrow-left"></i>
      </RouterLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Nueva consulta</h1>
        <p v-if="paciente" class="text-sm text-gray-500">{{ paciente.apellido }}, {{ paciente.nombre }}</p>
      </div>
    </div>

    <!-- Aviso de flujo -->
    <div class="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
      <i class="fas fa-info-circle text-blue-500 mt-0.5 flex-shrink-0"></i>
      <div class="text-sm text-blue-700">
        <p class="font-semibold mb-0.5">Flujo recomendado</p>
        <p class="text-xs text-blue-600">
          1. Completá los datos clínicos y guardá la consulta &nbsp;→&nbsp;
          2. Subí estudios adjuntos o transcribí informes &nbsp;→&nbsp;
          3. Consultá a la IA &nbsp;→&nbsp;
          4. Escribí tu diagnóstico final
        </p>
      </div>
    </div>

    <form @submit.prevent="guardar" class="space-y-5">

      <!-- Antecedentes -->
      <div class="card">
        <div class="card-header">
          <h2 class="font-semibold text-gray-800 flex items-center gap-2">
            <i class="fas fa-history text-purple-500"></i> Antecedentes del paciente
          </h2>
          <span v-if="antecedentePrevio" class="text-xs text-green-600 flex items-center gap-1">
            <i class="fas fa-check-circle"></i> Datos del historial
          </span>
          <span v-else class="text-xs text-orange-500 flex items-center gap-1">
            <i class="fas fa-user-plus"></i> Paciente nuevo
          </span>
        </div>
        <div class="card-body space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Antecedentes familiares / hereditarios</label>
              <textarea v-model="antForm.antecedentes_familiares" rows="3" class="textarea-field"
                placeholder="Cardiopatía isquémica, HTA, diabetes, dislipemia, ACV, muerte súbita..."></textarea>
            </div>
            <div>
              <label class="form-label">Patologías previas / enfermedades crónicas</label>
              <textarea v-model="antForm.patologias_previas" rows="3" class="textarea-field"
                placeholder="HTA, DBT tipo II, dislipemia, obesidad, EPOC, hipotiroidismo..."></textarea>
            </div>
            <div>
              <label class="form-label">Alergias</label>
              <textarea v-model="antForm.alergias" rows="2" class="textarea-field"
                placeholder="Penicilina, AAS, contrastes yodados, látex..."></textarea>
            </div>
            <div>
              <label class="form-label">Cirugías / internaciones previas</label>
              <textarea v-model="antForm.cirugias_previas" rows="2" class="textarea-field"
                placeholder="Angioplastia 2019, apendicectomía 2010..."></textarea>
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label class="form-label">Tabaquismo</label>
              <select v-model="antForm.tabaco" class="select-field">
                <option value="no">No fumador</option>
                <option value="ex">Ex fumador</option>
                <option value="leve">Leve (&lt;10/día)</option>
                <option value="moderado">Moderado</option>
                <option value="intenso">Intenso (&gt;20/día)</option>
              </select>
            </div>
            <div>
              <label class="form-label">Alcohol</label>
              <select v-model="antForm.alcohol" class="select-field">
                <option value="no">No consume</option>
                <option value="ocasional">Ocasional</option>
                <option value="moderado">Moderado</option>
                <option value="intenso">Intenso</option>
              </select>
            </div>
            <div>
              <label class="form-label">Actividad física</label>
              <select v-model="antForm.actividad_fisica" class="select-field">
                <option value="sedentario">Sedentario</option>
                <option value="leve">Leve (1-2/sem)</option>
                <option value="moderado">Moderado (3-4/sem)</option>
                <option value="intenso">Intenso (5+/sem)</option>
              </select>
            </div>
            <div>
              <label class="form-label">Otros hábitos</label>
              <input v-model="antForm.otros_habitos" type="text" class="input-field"
                placeholder="Drogas, suplementos..." />
            </div>
          </div>
        </div>
      </div>

      <!-- Motivo y síntomas -->
      <div class="card">
        <div class="card-header">
          <h2 class="font-semibold text-gray-800 flex items-center gap-2">
            <i class="fas fa-notes-medical text-blue-500"></i> Datos de la consulta
          </h2>
        </div>
        <div class="card-body space-y-4">
          <div>
            <label class="form-label">Motivo de consulta *</label>
            <input v-model="form.motivo" type="text" class="input-field" required
              placeholder="Dolor precordial, disnea de esfuerzo, control de HTA..." />
          </div>
          <div>
            <label class="form-label">Síntomas actuales</label>
            <textarea v-model="form.sintomas_actuales" rows="3" class="textarea-field"
              placeholder="Describir síntomas en detalle: inicio, duración, características, irradiación, factores que agravan o alivian..."></textarea>
          </div>
          <div>
            <label class="form-label">Notas clínicas / examen físico</label>
            <textarea v-model="form.notas_clinicas" rows="3" class="textarea-field"
              placeholder="Hallazgos del examen físico, auscultación, palpación..."></textarea>
          </div>
        </div>
      </div>

      <!-- Signos vitales -->
      <div class="card">
        <div class="card-header">
          <h2 class="font-semibold text-gray-800 flex items-center gap-2">
            <i class="fas fa-heartbeat text-red-500"></i> Signos vitales
          </h2>
        </div>
        <div class="card-body grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label class="form-label">Presión arterial (mmHg)</label>
            <input v-model="form.presion_arterial" type="text" class="input-field" placeholder="120/80" />
          </div>
          <div>
            <label class="form-label">Frec. cardíaca (lpm)</label>
            <input v-model="form.frecuencia_cardiaca" type="number" min="0" max="300" class="input-field" placeholder="72" />
          </div>
          <div>
            <label class="form-label">Frec. respiratoria (rpm)</label>
            <input v-model="form.frecuencia_respiratoria" type="number" min="0" max="60" class="input-field" placeholder="16" />
          </div>
          <div>
            <label class="form-label">Temperatura (°C)</label>
            <input v-model="form.temperatura" type="number" step="0.1" min="30" max="45" class="input-field" placeholder="36.5" />
          </div>
          <div>
            <label class="form-label">Saturación O₂ (%)</label>
            <input v-model="form.saturacion_o2" type="number" min="0" max="100" class="input-field" placeholder="98" />
          </div>
          <div>
            <label class="form-label">Peso (kg)</label>
            <input v-model="form.peso_kg" type="number" step="0.1" min="0" max="300" class="input-field" placeholder="75" />
          </div>
        </div>
      </div>

      <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

      <div class="flex gap-3 justify-end">
        <RouterLink :to="`/pacientes/${pacienteId}`" class="btn-secondary">Cancelar</RouterLink>
        <button type="submit" :disabled="guardando" class="btn-primary">
          <i v-if="guardando" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          Guardar y continuar
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const props   = defineProps({ pacienteId: String })
const router  = useRouter()

const paciente          = ref(null)
const antecedentePrevio = ref(false)
const guardando         = ref(false)
const error             = ref('')

const form = reactive({
  paciente_id:             props.pacienteId,
  motivo:                  '',
  sintomas_actuales:       '',
  notas_clinicas:          '',
  presion_arterial:        '',
  frecuencia_cardiaca:     '',
  frecuencia_respiratoria: '',
  temperatura:             '',
  saturacion_o2:           '',
  peso_kg:                 '',
})

const antForm = reactive({
  antecedentes_familiares: '',
  patologias_previas:      '',
  alergias:                '',
  cirugias_previas:        '',
  tabaco:                  'no',
  alcohol:                 'no',
  actividad_fisica:        'sedentario',
  otros_habitos:           '',
})

onMounted(async () => {
  try {
    const { data } = await axios.get(`/api/pacientes/${props.pacienteId}`)
    paciente.value = data
    if (data.antecedente) {
      antecedentePrevio.value = true
      Object.assign(antForm, {
        antecedentes_familiares: data.antecedente.antecedentes_familiares || '',
        patologias_previas:      data.antecedente.patologias_previas      || '',
        alergias:                data.antecedente.alergias                || '',
        cirugias_previas:        data.antecedente.cirugias_previas        || '',
        tabaco:                  data.antecedente.tabaco                  || 'no',
        alcohol:                 data.antecedente.alcohol                 || 'no',
        actividad_fisica:        data.antecedente.actividad_fisica        || 'sedentario',
        otros_habitos:           data.antecedente.otros_habitos           || '',
      })
    }
  } catch {}
})

async function guardar() {
  guardando.value = true
  error.value     = ''
  try {
    // Guardar/actualizar antecedentes del paciente
    await axios.put(`/api/pacientes/${props.pacienteId}/antecedentes`, antForm)
    // Crear la consulta
    const { data } = await axios.post('/api/consultas', form)
    router.push(`/consultas/${data.id}`)
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al guardar'
  } finally { guardando.value = false }
}
</script>
