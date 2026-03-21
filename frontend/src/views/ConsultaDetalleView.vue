<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div v-if="cargando" class="text-center py-20 text-gray-400">
      <i class="fas fa-spinner fa-spin text-2xl"></i>
    </div>

    <div v-else-if="errorCarga" class="text-center py-20">
      <i class="fas fa-exclamation-triangle text-4xl text-red-300 mb-3 block"></i>
      <p class="text-gray-500 mb-2">No se pudo cargar la consulta</p>
      <p class="text-xs text-red-400">{{ errorCarga }}</p>
      <RouterLink to="/pacientes" class="btn-secondary mt-4 inline-flex">
        <i class="fas fa-arrow-left"></i> Volver a pacientes
      </RouterLink>
    </div>

    <template v-else-if="consulta">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4 gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <RouterLink :to="`/pacientes/${consulta.paciente_id}`" class="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <i class="fas fa-arrow-left"></i>
          </RouterLink>
          <div class="min-w-0">
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900 truncate">Consulta del {{ formatFecha(consulta.fecha) }}</h1>
            <p class="text-sm text-gray-500 mt-0.5 truncate">
              {{ consulta.paciente?.apellido }}, {{ consulta.paciente?.nombre }}
            </p>
          </div>
        </div>
        <div class="flex gap-2 no-print">
          <button @click="exportarPDF" class="btn-secondary text-xs flex-shrink-0">
            <i class="fas fa-file-pdf"></i> <span class="hidden sm:inline">PDF</span>
          </button>
          <button @click="imprimirConsulta" class="btn-secondary text-xs flex-shrink-0">
            <i class="fas fa-print"></i> <span class="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      <!-- Stepper visual del flujo -->
      <div class="flex items-center gap-0 mb-6 overflow-x-auto pb-1">
        <div v-for="(step, i) in pasos" :key="i" class="flex items-center flex-shrink-0">
          <div :class="['flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
            step.done ? 'bg-green-100 text-green-700' : step.active ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'bg-gray-100 text-gray-400']">
            <i :class="step.done ? 'fas fa-check-circle text-green-500' : step.icon"></i>
            {{ step.label }}
          </div>
          <i v-if="i < pasos.length - 1" class="fas fa-chevron-right text-gray-300 mx-1 text-xs flex-shrink-0"></i>
        </div>
      </div>

      <!-- ── GRID: datos clínicos + signos vitales ── -->
      <div class="grid lg:grid-cols-3 gap-5 mb-5">
        <!-- Columna izquierda: datos clínicos -->
        <div class="lg:col-span-2 space-y-5">

          <!-- Motivo y síntomas -->
          <div class="card">
            <div class="card-header">
              <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                <i class="fas fa-notes-medical text-blue-500"></i> Consulta
              </h2>
            </div>
            <div class="card-body space-y-4">
              <div>
                <p class="form-label">Motivo</p>
                <p class="text-sm text-gray-800 font-medium">{{ consulta.motivo }}</p>
              </div>
              <div v-if="consulta.sintomas_actuales">
                <p class="form-label">Síntomas</p>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ consulta.sintomas_actuales }}</p>
              </div>
              <div v-if="consulta.notas_clinicas">
                <p class="form-label">Notas clínicas</p>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ consulta.notas_clinicas }}</p>
              </div>
            </div>
          </div>

          <!-- ECG y estudios -->
          <div v-if="consulta.ecg_descripcion || consulta.estudios_realizados" class="card">
            <div class="card-header">
              <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                <i class="fas fa-wave-square text-green-500"></i> ECG y estudios
              </h2>
            </div>
            <div class="card-body space-y-4">
              <div v-if="consulta.ecg_descripcion">
                <p class="form-label">ECG</p>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ consulta.ecg_descripcion }}</p>
              </div>
              <div v-if="consulta.estudios_realizados">
                <p class="form-label">Estudios / laboratorio</p>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ consulta.estudios_realizados }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Columna derecha: signos vitales -->
        <div class="space-y-5">
          <div class="card">
            <div class="card-header">
              <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                <i class="fas fa-heartbeat text-red-500"></i> Signos vitales
              </h2>
            </div>
            <div class="card-body grid grid-cols-2 gap-3">
              <div v-for="sv in signosVitales" :key="sv.label" class="vital-card" :class="sv.clase">
                <i :class="[sv.icon, 'text-lg']"></i>
                <p class="vital-value">{{ sv.valor || '—' }}</p>
                <p class="vital-label">{{ sv.label }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── ARCHIVOS ADJUNTOS (full-width) ── -->
      <div class="card mb-5">
        <div class="card-header">
          <h2 class="font-semibold text-gray-700 flex items-center gap-2">
            <i class="fas fa-paperclip text-indigo-500"></i> Estudios y archivos adjuntos
            <span v-if="archivos.length" class="badge badge-gray">{{ archivos.length }}</span>
          </h2>
          <button @click="abrirUpload = true" class="btn-secondary text-xs no-print">
            <i class="fas fa-upload"></i> Subir archivos
          </button>
        </div>
        <div class="card-body">
          <!-- Drop zone -->
          <div
            v-if="archivos.length === 0 && !abrirUpload"
            @click="abrirUpload = true"
            class="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
          >
            <i class="fas fa-cloud-upload-alt text-3xl text-gray-300 mb-2 block"></i>
            <p class="text-sm text-gray-400">Clic para adjuntar estudios, laboratorio, ECG, imágenes...</p>
            <p class="text-xs text-gray-300 mt-1">PDF, JPG, PNG, DICOM · Máx 30 MB por archivo</p>
          </div>

          <!-- Lista de archivos -->
          <div v-if="archivos.length" class="space-y-2">
            <div v-for="a in archivos" :key="a.id"
              class="rounded-xl border border-gray-100 hover:border-gray-200 group transition-colors"
            >
              <div class="flex items-center gap-3 p-3">
                <!-- Ícono por tipo -->
                <div :class="['w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg', iconoBg(a)]">
                  <i :class="iconoArchivo(a)"></i>
                </div>

                <!-- Preview imagen inline -->
                <div v-if="esImagen(a)" class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 -ml-3">
                  <img :src="urlArchivo(a)" class="w-full h-full object-cover" />
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ a.descripcion || a.nombre_original }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span :class="['badge text-xs', categoriaBadge(a.categoria)]">{{ a.categoria }}</span>
                    <span v-if="a.tipo_mime !== 'text/plain'" class="text-xs text-gray-400">{{ formatTamano(a.tamano) }}</span>
                    <span v-if="a.tipo_mime === 'text/plain'" class="text-xs text-green-600 font-medium">Informe escrito</span>
                  </div>
                </div>

                <!-- Acciones -->
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button v-if="a.tipo_mime === 'text/plain'" @click="toggleTexto(a)"
                    class="text-blue-500 hover:text-blue-700 text-sm" title="Ver informe">
                    <i :class="textosExpandidos.has(a.id) ? 'fas fa-chevron-up' : 'fas fa-eye'"></i>
                  </button>
                  <a v-else :href="urlArchivo(a)" target="_blank" class="text-blue-500 hover:text-blue-700 text-sm" title="Ver / descargar">
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                  <button @click="editarArchivo(a)" class="text-gray-400 hover:text-gray-600 text-sm" title="Editar descripción">
                    <i class="fas fa-tag"></i>
                  </button>
                  <button @click="eliminarArchivo(a)" class="text-red-400 hover:text-red-600 text-sm" title="Eliminar">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <!-- Expansión de informe de texto -->
              <div v-if="a.tipo_mime === 'text/plain' && textosExpandidos.has(a.id)"
                class="px-3 pb-3">
                <pre class="text-xs text-gray-700 whitespace-pre-wrap font-sans p-3 bg-gray-50 border border-gray-200 rounded-lg">{{ textosExpandidos.get(a.id) }}</pre>
              </div>
            </div>

            <!-- Botón agregar más -->
            <button @click="abrirUpload = true" class="w-full mt-1 py-2 text-xs text-indigo-500 hover:text-indigo-700 border border-dashed border-indigo-200 rounded-lg hover:border-indigo-300 transition-colors">
              <i class="fas fa-plus mr-1"></i> Agregar más archivos
            </button>
          </div>
        </div>
      </div>

      <!-- ── BOTÓN CONSULTAR A CLAUDE (full-width) ── -->
      <div v-if="!respuestaIA && !cargandoClaude" class="mb-5 space-y-3 no-print">
        <!-- Indicador de uso mensual -->
        <div v-if="usoIA" :class="[
          'flex items-center justify-between px-4 py-2 rounded-lg text-sm border',
          usoIA.disponibles === 0 ? 'bg-red-50 border-red-200 text-red-700' :
          usoIA.disponibles !== null && usoIA.disponibles <= 20 ? 'bg-orange-50 border-orange-200 text-orange-700' :
          'bg-gray-50 border-gray-200 text-gray-500'
        ]">
          <span>
            <i class="fas fa-brain mr-1"></i>
            Consultas IA este mes:
            <strong>{{ usoIA.usadas }}</strong>
            <template v-if="usoIA.limite !== null"> / {{ usoIA.limite }}</template>
            <template v-else> (ilimitado)</template>
          </span>
          <span v-if="usoIA.disponibles !== null">
            {{ usoIA.disponibles }} disponibles
          </span>
        </div>
        <!-- Selector de especialidad -->
        <div class="flex items-center gap-3 p-3 bg-violet-50 border border-violet-100 rounded-xl">
          <i class="fas fa-stethoscope text-violet-400 flex-shrink-0"></i>
          <label class="text-sm font-medium text-violet-700 whitespace-nowrap">Especialidad</label>
          <select v-model="especialidad" class="flex-1 select-field text-sm">
            <option value="alergologia">🌿 Alergología / Inmunología</option>
            <option value="cardiologia">🫀 Cardiología</option>
            <option value="cirugia_general">🔪 Cirugía General</option>
            <option value="clinica_medica">🩺 Clínica Médica</option>
            <option value="dermatologia">🧴 Dermatología</option>
            <option value="diabetologia">🩸 Diabetología / Endocrinología</option>
            <option value="emergentologia">🚨 Emergentología / Urgencias</option>
            <option value="gastroenterologia">🫃 Gastroenterología</option>
            <option value="geriatria">👴 Geriatría</option>
            <option value="ginecologia">🌸 Ginecología / Obstetricia</option>
            <option value="hematologia">🩸 Hematología</option>
            <option value="infectologia">🦠 Infectología</option>
            <option value="nefrologia">🫘 Nefrología</option>
            <option value="neumologia">🫁 Neumología</option>
            <option value="neurologia">🧠 Neurología</option>
            <option value="nutricion">🥗 Nutrición y Dietología</option>
            <option value="oftalmologia">👁️ Oftalmología</option>
            <option value="oncologia">🔬 Oncología</option>
            <option value="otorrinolaringologia">👂 Otorrinolaringología</option>
            <option value="pediatria">👶 Pediatría</option>
            <option value="psiquiatria">🧩 Psiquiatría</option>
            <option value="reumatologia">🦴 Reumatología</option>
            <option value="traumatologia">🦴 Traumatología / Ortopedia</option>
            <option value="urologia">🫀 Urología</option>
          </select>
        </div>
        <button
          @click="consultarClaude"
          :disabled="cargandoClaude"
          class="btn-claude w-full py-4 text-base font-semibold flex items-center justify-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-shadow disabled:opacity-70 disabled:cursor-wait"
        >
          <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <i v-if="cargandoClaude" class="fas fa-spinner fa-spin text-white text-lg"></i>
            <i v-else class="fas fa-brain text-white text-lg"></i>
          </div>
          <span v-if="cargandoClaude">Analizando con IA... puede tardar unos segundos</span>
          <span v-else>Consultar IA</span>
        </button>
        <p v-if="errorClaude" class="mt-2 text-center text-sm text-red-500">
          <i class="fas fa-exclamation-triangle mr-1"></i>{{ errorClaude }}
          <button @click="consultarClaude" class="ml-2 underline">Reintentar</button>
        </p>
      </div>

      <!-- ── CLAUDE CARGANDO ── -->
      <div v-if="cargandoClaude" class="mb-5 card border-violet-200">
        <div class="card-body flex items-center justify-center gap-4 py-10">
          <div class="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
            <i class="fas fa-brain text-violet-600 text-xl animate-pulse"></i>
          </div>
          <div>
            <p class="font-semibold text-gray-800">Analizando con Claude...</p>
            <p class="text-sm text-gray-500">El especialista IA está revisando todos los datos del paciente</p>
          </div>
        </div>
      </div>

      <!-- ── RESPUESTA CLAUDE (full-width) ── -->
      <div v-if="respuestaIA && !cargandoClaude" class="mb-5 card border-violet-200">
        <div class="card-header bg-gradient-to-r from-violet-50 to-purple-50 rounded-t-xl">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <i class="fas fa-brain text-white text-sm"></i>
            </div>
            <div>
              <h2 class="font-semibold text-violet-900">Análisis de {{ respuestaIA.especialidadLabel || 'IA' }} — Claude</h2>
              <p class="text-xs text-violet-500">Orientación diagnóstica para el médico tratante</p>
            </div>
          </div>
          <div class="flex items-center flex-wrap gap-2 no-print">
            <div v-if="respuestaIA.tokens" class="text-xs text-gray-400">
              {{ respuestaIA.tokens.input_tokens }} → {{ respuestaIA.tokens.output_tokens }} tokens
            </div>
            <select v-model="especialidad" class="select-field text-xs py-1 no-print">
              <option value="alergologia">🌿 Alergología</option>
              <option value="cardiologia">🫀 Cardiología</option>
              <option value="cirugia_general">🔪 Cirugía General</option>
              <option value="clinica_medica">🩺 Clínica Médica</option>
              <option value="dermatologia">🧴 Dermatología</option>
              <option value="diabetologia">🩸 Diabetología</option>
              <option value="emergentologia">🚨 Emergentología</option>
              <option value="gastroenterologia">🫃 Gastroenterología</option>
              <option value="geriatria">👴 Geriatría</option>
              <option value="ginecologia">🌸 Ginecología</option>
              <option value="hematologia">🩸 Hematología</option>
              <option value="infectologia">🦠 Infectología</option>
              <option value="nefrologia">🫘 Nefrología</option>
              <option value="neumologia">🫁 Neumología</option>
              <option value="neurologia">🧠 Neurología</option>
              <option value="nutricion">🥗 Nutrición</option>
              <option value="oftalmologia">👁️ Oftalmología</option>
              <option value="oncologia">🔬 Oncología</option>
              <option value="otorrinolaringologia">👂 Otorrino</option>
              <option value="pediatria">👶 Pediatría</option>
              <option value="psiquiatria">🧩 Psiquiatría</option>
              <option value="reumatologia">🦴 Reumatología</option>
              <option value="traumatologia">🦴 Traumatología</option>
              <option value="urologia">🫀 Urología</option>
            </select>
            <button @click="consultarClaude" :disabled="cargandoClaude" class="btn-secondary text-xs">
              <i class="fas fa-redo"></i> Regenerar
            </button>
          </div>
        </div>
        <div class="card-body">
          <div
            class="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900"
            v-html="renderMarkdown(respuestaIA.texto)"
          ></div>
          <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <i class="fas fa-info-circle mr-1"></i>
            Esta respuesta es orientativa. El diagnóstico y las decisiones terapéuticas son responsabilidad exclusiva del médico tratante.
          </div>
        </div>
      </div>

      <!-- ── CHAT FOLLOW-UP CON CLAUDE ── -->
      <div v-if="respuestaIA && !cargandoClaude" class="mb-5 card border-violet-100 no-print">
        <div class="card-header bg-violet-50/50 rounded-t-xl">
          <h3 class="font-semibold text-violet-800 flex items-center gap-2 text-sm">
            <i class="fas fa-comments text-violet-500"></i> Consultas adicionales a la IA
          </h3>
          <span class="text-xs text-violet-400">{{ chatHistorial.length }} pregunta(s)</span>
        </div>
        <div class="card-body space-y-4">
          <!-- Historial de preguntas/respuestas -->
          <div v-if="chatHistorial.length" class="space-y-4">
            <div v-for="(turno, i) in chatHistorial" :key="i" class="space-y-2">
              <div class="flex justify-end">
                <div class="max-w-2xl bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                  {{ turno.pregunta }}
                </div>
              </div>
              <div class="flex justify-start">
                <div class="max-w-3xl bg-white border border-violet-200 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div
                    class="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700"
                    v-html="renderMarkdown(turno.respuesta)"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <!-- Input nueva pregunta -->
          <div class="flex gap-2 items-end">
            <textarea
              v-model="chatPregunta"
              @keydown.enter.ctrl.prevent="enviarPregunta"
              rows="2"
              class="flex-1 textarea-field text-sm resize-none"
              placeholder="Ej: ¿Podría ser una disección aórtica? ¿Qué dosis de atenolol recomendarías? — Ctrl+Enter para enviar"
              :disabled="chatCargando"
            ></textarea>
            <button
              @click="enviarPregunta"
              :disabled="!chatPregunta.trim() || chatCargando"
              class="btn-claude px-4 py-2.5 rounded-xl flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
            >
              <i v-if="chatCargando" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-paper-plane"></i>
              <span class="text-sm">{{ chatCargando ? 'Consultando...' : 'Enviar' }}</span>
            </button>
          </div>
          <p v-if="chatError" class="text-red-500 text-xs">{{ chatError }}</p>
        </div>
      </div>

      <!-- ── DIAGNÓSTICO DEL MÉDICO (full-width, después de Claude) ── -->
      <div class="card" :class="!consulta.diagnostico_medico && !consulta.tratamiento ? 'border-dashed border-orange-200' : ''">
        <div class="card-header">
          <h2 class="font-semibold text-gray-700 flex items-center gap-2">
            <i class="fas fa-file-medical text-orange-500"></i> Diagnóstico del médico
          </h2>
          <button @click="editDiag = !editDiag" class="btn-secondary text-xs">
            <i :class="editDiag ? 'fas fa-times' : 'fas fa-edit'"></i>
            {{ editDiag ? 'Cancelar' : (consulta.diagnostico_medico ? 'Editar' : 'Completar') }}
          </button>
        </div>
        <div class="card-body">
          <!-- Vista: sin diagnóstico todavía -->
          <div v-if="!editDiag && !consulta.diagnostico_medico && !consulta.tratamiento"
            class="text-center py-6 text-gray-400">
            <i class="fas fa-lightbulb text-3xl text-orange-200 mb-3 block"></i>
            <p class="text-sm font-medium text-gray-500 mb-1">Diagnóstico pendiente</p>
            <p class="text-xs text-gray-400 mb-3">Revisá el análisis de Claude y luego completá tu diagnóstico final</p>
            <button @click="editDiag = true" class="btn-primary text-xs">
              <i class="fas fa-edit"></i> Completar diagnóstico
            </button>
          </div>

          <!-- Vista: diagnóstico cargado -->
          <div v-else-if="!editDiag" class="space-y-4">
            <div v-if="consulta.diagnostico_medico">
              <p class="form-label">Diagnóstico médico</p>
              <p class="text-sm text-gray-800 font-medium whitespace-pre-wrap">{{ consulta.diagnostico_medico }}</p>
            </div>
            <div v-if="consulta.tratamiento">
              <p class="form-label">Tratamiento indicado</p>
              <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ consulta.tratamiento }}</p>
            </div>
            <div v-if="consulta.proxima_consulta">
              <p class="form-label">Próxima consulta</p>
              <p class="text-sm text-gray-700">{{ new Date(consulta.proxima_consulta).toLocaleDateString('es-AR') }}</p>
            </div>
          </div>

          <!-- Formulario edición inline -->
          <div v-else class="space-y-4">
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-600 flex items-start gap-2">
              <i class="fas fa-brain mt-0.5 flex-shrink-0"></i>
              <span>Tomá en cuenta el análisis de Claude antes de escribir el diagnóstico definitivo.</span>
            </div>
            <div>
              <label class="form-label">Diagnóstico médico</label>
              <textarea v-model="diagForm.diagnostico_medico" rows="3" class="textarea-field"
                placeholder="HTA esencial grado II, dislipemia mixta, síndrome metabólico..."></textarea>
            </div>
            <div>
              <label class="form-label">Tratamiento / indicaciones</label>
              <textarea v-model="diagForm.tratamiento" rows="3" class="textarea-field"
                placeholder="Atenolol 50mg c/12hs, dieta hiposódica, actividad aeróbica moderada, control en 30 días..."></textarea>
            </div>
            <div>
              <label class="form-label">Próxima consulta</label>
              <input v-model="diagForm.proxima_consulta" type="date" class="input-field w-48" />
            </div>
            <div class="flex gap-3 justify-end">
              <button @click="editDiag = false" class="btn-secondary text-xs">Cancelar</button>
              <button @click="guardarDiagnostico" :disabled="guardandoDiag" class="btn-success text-xs">
                <i v-if="guardandoDiag" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-check"></i>
                Guardar diagnóstico
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- MODAL UPLOAD                                        -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="abrirUpload" class="modal-backdrop" @click.self="cerrarUpload">
      <div class="modal-box max-w-lg">
        <div class="card-header">
          <h3 class="font-semibold flex items-center gap-2">
            <i class="fas fa-plus-circle text-indigo-500"></i> Agregar estudio
          </h3>
          <button @click="cerrarUpload" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="card-body space-y-4">

          <!-- Tabs -->
          <div class="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              @click="modalTab = 'archivo'"
              :class="['flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2',
                modalTab === 'archivo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
            >
              <i class="fas fa-paperclip"></i> Subir archivo
            </button>
            <button
              @click="modalTab = 'texto'"
              :class="['flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2',
                modalTab === 'texto' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
            >
              <i class="fas fa-file-alt"></i> Informe escrito
            </button>
          </div>

          <!-- TAB: Subir archivo -->
          <template v-if="modalTab === 'archivo'">
            <div
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="onDrop"
              @click="fileInput.click()"
              :class="['border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40']"
            >
              <i class="fas fa-cloud-upload-alt text-4xl text-indigo-300 mb-3 block"></i>
              <p class="text-sm font-medium text-gray-600">Arrastrá archivos acá o hacé clic</p>
              <p class="text-xs text-gray-400 mt-1">PDF · JPG · PNG · DICOM · Máx 30 MB</p>
              <input ref="fileInput" type="file" multiple class="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.dcm,.bmp,.txt,.xlsx"
                @change="onFileSelect" />
            </div>

            <div v-if="archivosSeleccionados.length" class="space-y-2">
              <div v-for="(f, i) in archivosSeleccionados" :key="i"
                class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
              >
                <i :class="['text-lg', iconoPorMime(f.type)]"></i>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-gray-700 truncate">{{ f.name }}</p>
                  <p class="text-xs text-gray-400">{{ formatTamano(f.size) }}</p>
                </div>
                <button @click="archivosSeleccionados.splice(i,1)" class="text-red-400 hover:text-red-600 text-xs">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div v-if="archivosSeleccionados.length" class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Categoría</label>
                <select v-model="uploadCategoria" class="select-field">
                  <option value="laboratorio">🧪 Laboratorio</option>
                  <option value="ecg">💓 ECG / Holter</option>
                  <option value="ecografia">🔊 Ecografía</option>
                  <option value="radiologia">🩻 Radiología</option>
                  <option value="resonancia">🧲 Resonancia</option>
                  <option value="tomografia">💿 Tomografía</option>
                  <option value="otro">📎 Otro</option>
                </select>
              </div>
              <div>
                <label class="form-label">Descripción (opcional)</label>
                <input v-model="uploadDescripcion" type="text" class="input-field" placeholder="Ej: ECG de esfuerzo" />
              </div>
            </div>

            <div v-if="subiendo" class="space-y-1">
              <div class="flex justify-between text-xs text-gray-500">
                <span>Subiendo...</span><span>{{ progresoUpload }}%</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-2">
                <div class="bg-indigo-500 h-2 rounded-full transition-all duration-300" :style="`width:${progresoUpload}%`"></div>
              </div>
            </div>

            <p v-if="errorUpload" class="text-red-500 text-sm">{{ errorUpload }}</p>

            <div class="flex gap-3 justify-end pt-2">
              <button @click="cerrarUpload" class="btn-secondary">Cancelar</button>
              <button @click="subirArchivos" :disabled="!archivosSeleccionados.length || subiendo" class="btn-primary">
                <i v-if="subiendo" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-upload"></i>
                {{ subiendo ? 'Subiendo...' : `Subir ${archivosSeleccionados.length || ''} archivo${archivosSeleccionados.length !== 1 ? 's' : ''}` }}
              </button>
            </div>
          </template>

          <!-- TAB: Informe escrito -->
          <template v-if="modalTab === 'texto'">
            <div class="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600 flex items-start gap-2">
              <i class="fas fa-info-circle mt-0.5 flex-shrink-0"></i>
              <span>Cuando no tenés el archivo digital, podés transcribir el informe del especialista. Claude lo leerá como parte del análisis.</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Tipo de estudio *</label>
                <select v-model="textoCategoria" class="select-field">
                  <option value="laboratorio">🧪 Laboratorio</option>
                  <option value="ecg">💓 ECG / Holter</option>
                  <option value="ecografia">🔊 Ecografía</option>
                  <option value="radiologia">🩻 Radiología</option>
                  <option value="resonancia">🧲 Resonancia</option>
                  <option value="tomografia">💿 Tomografía</option>
                  <option value="otro">📎 Otro</option>
                </select>
              </div>
              <div>
                <label class="form-label">Título del informe *</label>
                <input v-model="textoTitulo" type="text" class="input-field"
                  placeholder="Ej: Eco doppler cardíaco" />
              </div>
            </div>

            <div>
              <label class="form-label">Contenido del informe *</label>
              <textarea v-model="textoContenido" rows="8" class="textarea-field font-mono text-xs"
                placeholder="Pegá o escribí el informe del especialista aquí...

Ej:
ECOCARDIOGRAMA DOPPLER
Fecha: 15/03/2026 — Dr. García

VI: diámetros normales. FE 62%. Sin alteraciones de la motilidad segmentaria.
Válvulas: Insuficiencia mitral leve. Resto normal.
Conclusión: Función sistólica conservada. IM leve sin repercusión hemodinámica."></textarea>
            </div>

            <p v-if="errorUpload" class="text-red-500 text-sm">{{ errorUpload }}</p>

            <div class="flex gap-3 justify-end pt-2">
              <button @click="cerrarUpload" class="btn-secondary">Cancelar</button>
              <button @click="guardarInformeTexto" :disabled="!textoTitulo || !textoContenido || subiendo" class="btn-primary">
                <i v-if="subiendo" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-save"></i>
                Guardar informe
              </button>
            </div>
          </template>

        </div>
      </div>
    </div>

    <!-- Modal editar descripción de archivo -->
    <div v-if="archivoEditando" class="modal-backdrop" @click.self="archivoEditando = null">
      <div class="modal-box max-w-sm">
        <div class="card-header">
          <h3 class="font-semibold">Editar archivo</h3>
          <button @click="archivoEditando = null"><i class="fas fa-times text-gray-400"></i></button>
        </div>
        <div class="card-body space-y-4">
          <div>
            <label class="form-label">Categoría</label>
            <select v-model="archivoEditando.categoria" class="select-field">
              <option value="laboratorio">🧪 Laboratorio</option>
              <option value="ecg">💓 ECG / Holter</option>
              <option value="ecografia">🔊 Ecografía</option>
              <option value="radiologia">🩻 Radiología</option>
              <option value="resonancia">🧲 Resonancia</option>
              <option value="tomografia">💿 Tomografía</option>
              <option value="otro">📎 Otro</option>
            </select>
          </div>
          <div>
            <label class="form-label">Descripción</label>
            <input v-model="archivoEditando.descripcion" type="text" class="input-field" />
          </div>
          <div class="flex gap-3 justify-end">
            <button @click="archivoEditando = null" class="btn-secondary">Cancelar</button>
            <button @click="guardarEdicionArchivo" class="btn-primary">Guardar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal demo: suscripción -->
    <div v-if="modalDemo" class="modal-backdrop">
      <div class="modal-box max-w-sm text-center">
        <div class="mb-4">
          <div class="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-robot text-violet-500 text-2xl"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-1">¡Probaste la IA!</h3>
          <p class="text-sm text-gray-500">Agotaste las consultas del modo demo. Para acceder ilimitado suscribite a Medicina IA.</p>
        </div>
        <div class="bg-violet-50 rounded-xl p-4 mb-5">
          <p class="text-sm font-semibold text-violet-800 mb-1">¿Qué incluye la suscripción?</p>
          <ul class="text-xs text-violet-700 space-y-1 text-left">
            <li><i class="fas fa-check mr-1"></i> Consultas IA ilimitadas</li>
            <li><i class="fas fa-check mr-1"></i> Gestión de pacientes y turnos</li>
            <li><i class="fas fa-check mr-1"></i> Agenda para tu secretaria</li>
            <li><i class="fas fa-check mr-1"></i> Historial clínico completo</li>
          </ul>
        </div>
        <a
          href="https://wa.me/543854414082?text=Hola!%20Quiero%20suscribirme%20a%20Medicina%20IA"
          target="_blank"
          class="w-full btn-primary justify-center py-3 text-base flex items-center gap-2 mb-3"
          style="background:#25D366; border-color:#25D366"
        >
          <i class="fab fa-whatsapp text-lg"></i> Contactar por WhatsApp
        </a>
        <button @click="modalDemo = false" class="text-sm text-gray-400 hover:text-gray-600">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { marked } from 'marked'
import axios from 'axios'

const route = useRoute()
const toast = useToast()

const cargando        = ref(true)
const cargandoClaude  = ref(false)
const consulta        = ref(null)
const respuestaIA     = ref(null)
const errorClaude     = ref('')
const usoIA           = ref(null)
const modalDemo       = ref(false)
const errorCarga      = ref('')
const archivos        = ref([])
const pacienteCompleto = ref(null)

// Diagnóstico inline
const editDiag     = ref(false)
const guardandoDiag = ref(false)
const diagForm     = ref({ diagnostico_medico: '', tratamiento: '', proxima_consulta: '' })

// Upload state
const abrirUpload          = ref(false)
const modalTab             = ref('archivo')
const dragOver             = ref(false)
const archivosSeleccionados = ref([])
const uploadCategoria      = ref('otro')
const uploadDescripcion    = ref('')
const subiendo             = ref(false)
const progresoUpload       = ref(0)
const errorUpload          = ref('')
const archivoEditando      = ref(null)
const fileInput            = ref(null)
// Informe de texto
const textoCategoria       = ref('otro')
const textoTitulo          = ref('')
const textoContenido       = ref('')
const textosExpandidos     = ref(new Map())

// Chat follow-up
const chatPregunta  = ref('')
const chatCargando  = ref(false)
const chatError     = ref('')
const chatHistorial = ref([])

// Especialidad para Claude
const especialidad = ref('alergologia')
const LABELS_ESP = {
  alergologia: 'Alergología / Inmunología',
  cardiologia: 'Cardiología', clinica_medica: 'Clínica Médica',
  diabetologia: 'Diabetología / Endocrinología', pediatria: 'Pediatría',
  neurologia: 'Neurología', neumologia: 'Neumología',
  gastroenterologia: 'Gastroenterología', oncologia: 'Oncología',
  traumatologia: 'Traumatología', ginecologia: 'Ginecología',
}
const especialidadLabel = computed(() => LABELS_ESP[especialidad.value] || especialidad.value)

async function exportarPDF() {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const c = consulta.value
  const p = c.paciente
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const azul = [30, 64, 175]
  const gris = [100, 116, 139]
  const ancho = doc.internal.pageSize.getWidth()
  let y = 15

  // Encabezado
  doc.setFillColor(...azul)
  doc.rect(0, 0, ancho, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('HISTORIA CLÍNICA', 14, 13)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Consulta: ${formatFecha(c.fecha)}`, ancho - 14, 13, { align: 'right' })
  y = 28

  // Datos del paciente
  doc.setTextColor(...azul)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`${p?.apellido?.toUpperCase()}, ${p?.nombre}`, 14, y)
  y += 6
  doc.setTextColor(...gris)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const infoPac = [
    p?.fecha_nacimiento ? `Nac: ${p.fecha_nacimiento}` : null,
    p?.sexo ? `Sexo: ${p.sexo}` : null,
    p?.dni ? `DNI: ${p.dni}` : null,
    p?.obra_social ? `Obra social: ${p.obra_social}` : null,
  ].filter(Boolean).join('   |   ')
  doc.text(infoPac, 14, y)
  y += 8

  // Separador
  doc.setDrawColor(...azul)
  doc.setLineWidth(0.4)
  doc.line(14, y, ancho - 14, y)
  y += 6

  // Motivo y síntomas
  const seccion = (titulo, texto) => {
    if (!texto) return
    doc.setTextColor(...azul)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(titulo, 14, y)
    y += 4
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(texto, ancho - 28)
    doc.text(lines, 14, y)
    y += lines.length * 4 + 4
    if (y > 270) { doc.addPage(); y = 15 }
  }

  // Antecedentes
  const ant = pacienteCompleto.value?.antecedente
  if (ant) {
    const antTexto = [
      ant.patologias_previas ? `Patologías previas: ${ant.patologias_previas}` : null,
      ant.antecedentes_familiares ? `Antecedentes familiares: ${ant.antecedentes_familiares}` : null,
      ant.alergias ? `Alergias: ${ant.alergias}` : null,
      ant.cirugias_previas ? `Cirugías previas: ${ant.cirugias_previas}` : null,
      ant.tabaco && ant.tabaco !== 'no_fumador' ? `Tabaco: ${ant.tabaco}` : null,
      ant.alcohol && ant.alcohol !== 'no' ? `Alcohol: ${ant.alcohol}` : null,
      ant.actividad_fisica ? `Actividad física: ${ant.actividad_fisica}` : null,
      ant.otros_habitos ? `Otros hábitos: ${ant.otros_habitos}` : null,
    ].filter(Boolean).join('\n')
    if (antTexto) seccion('ANTECEDENTES', antTexto)
  }

  // Medicaciones activas
  const meds = pacienteCompleto.value?.medicaciones?.filter(m => m.activo)
  if (meds?.length) {
    doc.setTextColor(...azul)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('MEDICACIÓN ACTUAL', 14, y)
    y += 4
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    meds.forEach(m => {
      if (y > 270) { doc.addPage(); y = 15 }
      const linea = `• ${m.nombre} ${m.dosis || ''} ${m.frecuencia || ''}`.trim()
      const lines = doc.splitTextToSize(linea, ancho - 28)
      doc.text(lines, 14, y)
      y += lines.length * 4
    })
    y += 4
    if (y > 270) { doc.addPage(); y = 15 }
  }

  seccion('MOTIVO DE CONSULTA', c.motivo)
  seccion('SÍNTOMAS', c.sintomas_actuales)
  seccion('NOTAS CLÍNICAS / EXAMEN FÍSICO', c.notas_clinicas)
  seccion('ECG', c.ecg_descripcion)
  seccion('ESTUDIOS REALIZADOS', c.estudios_realizados)

  // Archivos adjuntos
  if (archivos.value.length > 0) {
    doc.setTextColor(...azul)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ARCHIVOS Y ESTUDIOS ADJUNTOS', 14, y)
    y += 4
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    archivos.value.forEach((a, idx) => {
      if (y > 270) { doc.addPage(); y = 15 }
      const nombre = a.nombre_original || a.nombre || `Archivo ${idx + 1}`
      const desc = a.descripcion ? ` — ${a.descripcion}` : ''
      doc.text(`• ${nombre}${desc}`, 14, y)
      y += 4
    })
    y += 3
    if (y > 270) { doc.addPage(); y = 15 }
  }

  // Signos vitales
  const sv = signosVitales.value.filter(s => s.valor)
  if (sv.length > 0) {
    doc.setTextColor(...azul)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('SIGNOS VITALES', 14, y)
    y += 5
    autoTable(doc, {
      startY: y,
      head: [['Parámetro', 'Valor']],
      body: sv.map(s => [s.label, s.valor]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: azul, fontSize: 8 },
      margin: { left: 14, right: 14 },
      tableWidth: 90,
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // Diagnóstico y tratamiento
  seccion('DIAGNÓSTICO MÉDICO', c.diagnostico_medico)
  seccion('TRATAMIENTO', c.tratamiento)
  if (c.proxima_consulta) seccion('PRÓXIMA CONSULTA', new Date(c.proxima_consulta).toLocaleDateString('es-AR'))

  // Respuesta IA
  if (respuestaIA.value?.texto) {
    if (y > 200) { doc.addPage(); y = 15 }
    doc.setTextColor(...azul)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ANÁLISIS DE INTELIGENCIA ARTIFICIAL', 14, y)
    y += 4
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    const iaTexto = respuestaIA.value.texto.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '')
    const iaLines = doc.splitTextToSize(iaTexto, ancho - 28)
    for (const line of iaLines) {
      if (y > 275) { doc.addPage(); y = 15 }
      doc.text(line, 14, y)
      y += 3.8
    }
  }

  // Pie de página
  const totalPags = doc.getNumberOfPages()
  for (let i = 1; i <= totalPags; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...gris)
    doc.text(`Documento generado el ${new Date().toLocaleDateString('es-AR')} — Página ${i} de ${totalPags}`, ancho / 2, 290, { align: 'center' })
  }

  const apellido = p?.apellido?.replace(/\s/g,'_') || 'paciente'
  const fecha = c.fecha?.split('T')[0] || 'consulta'
  doc.save(`consulta_${apellido}_${fecha}.pdf`)
}

function imprimirConsulta() {
  window.print()
}

// ─── Stepper ──────────────────────────────────────────────────────
const pasos = computed(() => {
  const tieneArchivos  = archivos.value.length > 0
  const tieneIA        = !!respuestaIA.value
  const tieneDiag      = !!(consulta.value?.diagnostico_medico)

  return [
    {
      label:  'Datos clínicos',
      icon:   'fas fa-notes-medical',
      done:   true,
      active: false,
    },
    {
      label:  tieneArchivos ? `Estudios (${archivos.value.length})` : 'Subir estudios',
      icon:   'fas fa-paperclip',
      done:   tieneArchivos,
      active: !tieneArchivos,
    },
    {
      label:  'Consultar IA',
      icon:   'fas fa-brain',
      done:   tieneIA,
      active: tieneArchivos && !tieneIA,
    },
    {
      label:  'Diagnóstico final',
      icon:   'fas fa-file-medical',
      done:   tieneDiag,
      active: tieneIA && !tieneDiag,
    },
  ]
})

// ─── Signos vitales ───────────────────────────────────────────────
const signosVitales = computed(() => {
  const c = consulta.value
  if (!c) return []
  return [
    { label: 'Presión arterial', valor: c.presion_arterial ? `${c.presion_arterial} mmHg` : null, icon: 'fas fa-heart text-red-500', clase: 'border-red-100' },
    { label: 'Frec. cardíaca', valor: c.frecuencia_cardiaca ? `${c.frecuencia_cardiaca} lpm` : null, icon: 'fas fa-heartbeat text-rose-500', clase: 'border-rose-100' },
    { label: 'SpO₂', valor: c.saturacion_o2 ? `${c.saturacion_o2}%` : null, icon: 'fas fa-lungs text-blue-500', clase: 'border-blue-100' },
    { label: 'Temperatura', valor: c.temperatura ? `${c.temperatura}°C` : null, icon: 'fas fa-thermometer-half text-orange-500', clase: 'border-orange-100' },
    { label: 'Frec. resp.', valor: c.frecuencia_respiratoria ? `${c.frecuencia_respiratoria} rpm` : null, icon: 'fas fa-wind text-cyan-500', clase: 'border-cyan-100' },
    { label: 'Peso', valor: c.peso_kg ? `${c.peso_kg} kg` : null, icon: 'fas fa-weight text-gray-400', clase: 'border-gray-100' },
  ]
})

// ─── Helpers archivos ─────────────────────────────────────────────
function esImagen(a) {
  return a.tipo_mime?.startsWith('image/')
}
function urlArchivo(a) {
  return `/api/archivos/ver/${a.nombre_archivo}`
}
function iconoArchivo(a) {
  if (a.tipo_mime === 'application/pdf') return 'fas fa-file-pdf text-red-500'
  if (a.tipo_mime?.startsWith('image/')) return 'fas fa-image text-indigo-500'
  if (a.categoria === 'ecg') return 'fas fa-wave-square text-rose-500'
  if (a.categoria === 'laboratorio') return 'fas fa-flask text-green-500'
  if (a.categoria === 'radiologia' || a.categoria === 'tomografia') return 'fas fa-x-ray text-blue-500'
  if (a.categoria === 'resonancia') return 'fas fa-magnet text-purple-500'
  return 'fas fa-file text-gray-400'
}
function iconoBg(a) {
  if (a.tipo_mime === 'application/pdf') return 'bg-red-50'
  if (a.tipo_mime?.startsWith('image/')) return 'bg-indigo-50'
  if (a.categoria === 'ecg') return 'bg-rose-50'
  if (a.categoria === 'laboratorio') return 'bg-green-50'
  if (['radiologia','tomografia'].includes(a.categoria)) return 'bg-blue-50'
  if (a.categoria === 'resonancia') return 'bg-purple-50'
  return 'bg-gray-50'
}
function iconoPorMime(mime) {
  if (mime === 'application/pdf') return 'fas fa-file-pdf text-red-400'
  if (mime?.startsWith('image/')) return 'fas fa-image text-indigo-400'
  return 'fas fa-file text-gray-400'
}
function categoriaBadge(cat) {
  const map = {
    laboratorio: 'badge-green', ecg: 'badge-red', ecografia: 'badge-blue',
    radiologia: 'badge-blue', resonancia: 'badge-orange', tomografia: 'badge-orange', otro: 'badge-gray',
  }
  return map[cat] || 'badge-gray'
}
function formatTamano(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function formatFecha(f) {
  return new Date(f).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
}
function renderMarkdown(texto) {
  if (!texto) return ''
  return marked(texto)
}

// ─── Upload ───────────────────────────────────────────────────────
function onFileSelect(e) {
  archivosSeleccionados.value = [...archivosSeleccionados.value, ...Array.from(e.target.files)]
  e.target.value = ''
}
function onDrop(e) {
  dragOver.value = false
  archivosSeleccionados.value = [...archivosSeleccionados.value, ...Array.from(e.dataTransfer.files)]
}

async function subirArchivos() {
  if (!archivosSeleccionados.value.length) return
  subiendo.value = true
  progresoUpload.value = 0
  errorUpload.value = ''
  try {
    const fd = new FormData()
    archivosSeleccionados.value.forEach(f => fd.append('archivos', f))
    fd.append('categoria', uploadCategoria.value)
    fd.append('descripcion', uploadDescripcion.value)

    await axios.post(`/api/archivos/consulta/${consulta.value.id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => { progresoUpload.value = Math.round((e.loaded / e.total) * 100) },
    })

    toast.success(`${archivosSeleccionados.value.length} archivo(s) subido(s)`)
    cerrarUpload()
    await cargarArchivos()
  } catch (err) {
    errorUpload.value = err.response?.data?.error || 'Error al subir archivos'
  } finally {
    subiendo.value = false
  }
}

function editarArchivo(a) {
  archivoEditando.value = { ...a }
}

async function guardarEdicionArchivo() {
  try {
    await axios.put(`/api/archivos/${archivoEditando.value.id}`, {
      categoria: archivoEditando.value.categoria,
      descripcion: archivoEditando.value.descripcion,
    })
    archivoEditando.value = null
    toast.success('Archivo actualizado')
    await cargarArchivos()
  } catch { toast.error('Error al actualizar') }
}

async function eliminarArchivo(a) {
  if (!confirm(`¿Eliminar "${a.nombre_original}"?`)) return
  try {
    await axios.delete(`/api/archivos/${a.id}`)
    toast.success('Archivo eliminado')
    await cargarArchivos()
  } catch { toast.error('Error al eliminar') }
}

async function cargarArchivos() {
  const { data } = await axios.get(`/api/archivos/consulta/${consulta.value.id}`, { timeout: 10000 })
  archivos.value = data
}

function cerrarUpload() {
  abrirUpload.value = false
  archivosSeleccionados.value = []
  uploadDescripcion.value = ''
  uploadCategoria.value = 'otro'
  textoTitulo.value = ''
  textoContenido.value = ''
  textoCategoria.value = 'otro'
  errorUpload.value = ''
  modalTab.value = 'archivo'
}

function toggleTexto(a) {
  const map = new Map(textosExpandidos.value)
  if (map.has(a.id)) {
    map.delete(a.id)
  } else {
    map.set(a.id, a.contenido || '[Sin contenido]')
  }
  textosExpandidos.value = map
}

async function guardarInformeTexto() {
  if (!textoTitulo.value || !textoContenido.value) return
  subiendo.value = true
  errorUpload.value = ''
  try {
    const blob = new Blob([textoContenido.value], { type: 'text/plain' })
    const file = new File([blob], `${textoTitulo.value}.txt`, { type: 'text/plain' })
    const fd = new FormData()
    fd.append('archivos', file)
    fd.append('categoria', textoCategoria.value)
    fd.append('descripcion', textoTitulo.value)
    await axios.post(`/api/archivos/consulta/${consulta.value.id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    toast.success('Informe guardado')
    cerrarUpload()
    await cargarArchivos()
  } catch (err) {
    errorUpload.value = err.response?.data?.error || 'Error al guardar'
  } finally {
    subiendo.value = false
  }
}

// ─── Diagnóstico inline ───────────────────────────────────────────
async function guardarDiagnostico() {
  guardandoDiag.value = true
  try {
    const { data } = await axios.put(`/api/consultas/${consulta.value.id}`, {
      diagnostico_medico: diagForm.value.diagnostico_medico,
      tratamiento:        diagForm.value.tratamiento,
      proxima_consulta:   diagForm.value.proxima_consulta || null,
    })
    consulta.value.diagnostico_medico = data.diagnostico_medico
    consulta.value.tratamiento        = data.tratamiento
    consulta.value.proxima_consulta   = data.proxima_consulta
    editDiag.value = false
    toast.success('Diagnóstico guardado')
  } catch { toast.error('Error al guardar diagnóstico') }
  finally { guardandoDiag.value = false }
}

// ─── Chat follow-up ───────────────────────────────────────────────
async function enviarPregunta() {
  if (!chatPregunta.value.trim() || chatCargando.value) return
  chatCargando.value = true
  chatError.value = ''
  const texto = chatPregunta.value.trim()
  chatPregunta.value = ''
  try {
    const { data } = await axios.post(
      `/api/claude/consultar/${consulta.value.id}/pregunta`,
      { pregunta: texto, especialidad: especialidad.value }
    )
    chatHistorial.value.push({ pregunta: texto, respuesta: data.respuesta })
  } catch (err) {
    chatError.value = err.response?.data?.error || 'Error al consultar'
    chatPregunta.value = texto // restaurar si falla
  } finally {
    chatCargando.value = false
  }
}

// ─── Claude ───────────────────────────────────────────────────────
async function consultarClaude() {
  cargandoClaude.value = true
  errorClaude.value = ''
  try {
    const { data } = await axios.post(`/api/claude/consultar/${consulta.value.id}`, { especialidad: especialidad.value }, { timeout: 120000 })
    respuestaIA.value = { texto: data.respuesta, tokens: data.tokens, especialidadLabel: especialidadLabel.value }
    const msg = data.archivos_analizados > 0
      ? `Análisis generado (${data.archivos_analizados} archivo(s) analizados por visión IA)`
      : 'Análisis de IA generado'
    toast.success(msg)
    // Actualizar contador de uso
    try {
      const { data: uso } = await axios.get('/api/claude/uso-mes')
      usoIA.value = uso
    } catch { /* ignorar */ }
  } catch (err) {
    if (err.response?.data?.es_demo) {
      modalDemo.value = true
    } else {
      const msg = err.response?.data?.error || 'Error al consultar IA'
      errorClaude.value = msg
      toast.error(msg)
    }
  } finally {
    cargandoClaude.value = false
  }
}

// ─── Mount ────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const { data } = await axios.get(`/api/consultas/${route.params.id}`, { timeout: 15000 })
    consulta.value = data
    diagForm.value = {
      diagnostico_medico: data.diagnostico_medico || '',
      tratamiento:        data.tratamiento || '',
      proxima_consulta:   data.proxima_consulta || '',
    }
    if (data.respuestaIA) {
      respuestaIA.value = {
        texto: data.respuestaIA.respuesta,
        tokens: { input_tokens: data.respuestaIA.tokens_input, output_tokens: data.respuestaIA.tokens_output }
      }
      chatHistorial.value = data.respuestaIA.historial || []
    }
    try { await cargarArchivos() } catch { archivos.value = [] }
    try {
      const { data: pac } = await axios.get(`/api/pacientes/${data.paciente_id}`)
      pacienteCompleto.value = pac
    } catch { /* ignorar */ }
    try {
      const { data } = await axios.get('/api/claude/uso-mes')
      usoIA.value = data
    } catch { /* no bloquear si falla */ }
  } catch (err) {
    errorCarga.value = err.code === 'ECONNABORTED'
      ? 'El servidor tardó demasiado en responder. Verificá que el backend esté corriendo.'
      : (err.response?.data?.error || err.message || 'Error desconocido')
    console.error(err)
  }
  finally { cargando.value = false }
})
</script>
