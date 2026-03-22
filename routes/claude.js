import { Router } from 'express'
import { Op } from 'sequelize'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { authMiddleware } from '../middleware/auth.js'
import { Consulta } from '../models/Consulta.js'
import { Paciente } from '../models/Paciente.js'
import { Antecedente } from '../models/Antecedente.js'
import { Medicacion } from '../models/Medicacion.js'
import { ConsultaIA } from '../models/ConsultaIA.js'
import { Archivo } from '../models/Archivo.js'
import { Usuario } from '../models/Usuario.js'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../uploads')

const router = Router()
router.use(authMiddleware)

const IS_PROD = process.env.NODE_ENV === 'production'
const MAX_HISTORIAL = 50  // máximo de turnos de follow-up por consulta

// ─── Helper: cuenta consultas IA usadas en el mes actual ──────────
async function contarUsoPorMes(doctorId) {
  const ahora    = new Date()
  const inicio   = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const fin      = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1)

  return ConsultaIA.count({
    include: [{
      model: Consulta,
      as: 'consulta',
      required: true,
      include: [{
        model: Paciente,
        as: 'paciente',
        required: true,
        where: { doctor_id: doctorId },
        attributes: [],
      }],
      attributes: [],
    }],
    where: {
      createdAt: { [Op.gte]: inicio, [Op.lt]: fin },
    },
  })
}

// ─── Helper: verifica que la consulta pertenece al doctor ─────────
async function verificarOwnerConsulta(consultaId, userId) {
  const c = await Consulta.findByPk(consultaId, {
    include: [
      { model: ConsultaIA, as: 'respuestaIA', required: false },
      { model: Paciente,   as: 'paciente',   attributes: ['doctor_id'] },
    ],
  })
  if (!c) return null
  if (c.paciente.doctor_id !== userId) return null
  return c
}

// ═══════════════════════════════════════════════════════════════════
// ESPECIALIDADES — prompts por especialidad, nunca se exponen al frontend
// ═══════════════════════════════════════════════════════════════════
const ESPECIALIDADES = {
  cardiologia: {
    label: 'Cardiología',
    persona: 'cardiólogo especialista con más de 30 años de experiencia clínica',
    alertas: 'Destacá cualquier signo de alarma, urgencia/emergencia cardiológica (SCA, arritmia maligna, IC aguda, disección aórtica) o hallazgo que requiera atención inmediata.',
    estudios: 'ECG, Holter, ecocardiograma Doppler, laboratorio cardiovascular (troponina, BNP, lípidos, coagulación), ergometría, coronariografía, score de calcio coronario, etc.',
    tratamiento: 'Farmacología cardiológica (antihipertensivos, anticoagulantes, antiagregantes, antiarrítmicos, diuréticos), intervenciones percutáneas o quirúrgicas a considerar.',
    seguimiento: 'Parámetros a monitorear: PA, FC, ritmo cardíaco, fracción de eyección, peso, diuresis. Periodicidad según riesgo cardiovascular.',
  },
  clinica_medica: {
    label: 'Clínica Médica',
    persona: 'internista clínico con más de 30 años de experiencia en medicina interna',
    alertas: 'Destacá signos de deterioro multiorgánico, sepsis, abdomen agudo, o cualquier condición que requiera internación o derivación urgente.',
    estudios: 'Laboratorio completo (hemograma, ionograma, función renal y hepática, glucemia, reactantes de fase aguda), radiografía de tórax, ecografía abdominal, cultivos si corresponde.',
    tratamiento: 'Plan de manejo integral considerando comorbilidades e interacciones medicamentosas. Ambulatorio vs hospitalario.',
    seguimiento: 'Parámetros clínicos y de laboratorio a monitorear, periodicidad según complejidad del caso y enfermedades crónicas de base.',
  },
  diabetologia: {
    label: 'Diabetología / Endocrinología',
    persona: 'diabetólogo y endocrinólogo especialista con más de 30 años de experiencia clínica',
    alertas: 'Destacá hipoglucemia severa, cetoacidosis diabética, estado hiperosmolar, crisis tiroidea, insuficiencia suprarrenal u otras emergencias endocrinológicas.',
    estudios: 'HbA1c, glucemia en ayunas y postprandial, perfil lipídico, función renal (creatinina, microalbuminuria), función tiroidea (TSH, T4L), insulinemia, péptido C, fondo de ojo, etc.',
    tratamiento: 'Ajuste de insulinoterapia o hipoglucemiantes orales, manejo de comorbilidades metabólicas, tratamiento de complicaciones crónicas (nefropatía, neuropatía, retinopatía).',
    seguimiento: 'HbA1c cada 3 meses, microalbuminuria semestral, fondo de ojo anual, control de PA, peso y perfil lipídico.',
  },
  pediatria: {
    label: 'Pediatría',
    persona: 'pediatra especialista con más de 30 años de experiencia clínica en medicina pediátrica',
    alertas: 'Destacá signos de dificultad respiratoria, deshidratación severa, sepsis pediátrica, síndrome febril sin foco, convulsiones o cualquier emergencia que requiera derivación hospitalaria inmediata.',
    estudios: 'Hemograma, proteína C reactiva, hemocultivos si corresponde, análisis de orina, radiografía según clínica, estudios de desarrollo psicomotor, curvas de crecimiento, vacunación al día.',
    tratamiento: 'Dosis pediátricas ajustadas por peso (mg/kg). Plan de hidratación, antitérmicos, antibióticos si indica, y seguimiento del desarrollo.',
    seguimiento: 'Controles de crecimiento y desarrollo según edad, hitos del neurodesarrollo, vacunación, alimentación y vínculo familiar.',
  },
  neurologia: {
    label: 'Neurología',
    persona: 'neurólogo especialista con más de 30 años de experiencia clínica',
    alertas: 'Destacá signos de ACV (FAST), hemorragia subaracnoidea, crisis epiléptica prolongada, meningitis/encefalitis, hipertensión endocraneana o síndrome de cola de caballo que requieran atención urgente.',
    estudios: 'RMN cerebral/medular con y sin contraste, TC de cráneo, EEG, potenciales evocados, punción lumbar si corresponde, Doppler de vasos del cuello, laboratorio con vitaminas, TSH, B12.',
    tratamiento: 'Manejo de epilepsia (antiepilépticos), cefaleas (profilaxis y crisis), Parkinson, esclerosis múltiple, neuropatías periféricas. Rehabilitación neurológica.',
    seguimiento: 'Frecuencia de crisis, escala de discapacidad, adherencia al tratamiento, efectos adversos de antiepilépticos, neuroimagen de control.',
  },
  neumologia: {
    label: 'Neumología',
    persona: 'neumonólogo especialista con más de 30 años de experiencia clínica',
    alertas: 'Destacá insuficiencia respiratoria aguda, neumotórax, tromboembolismo pulmonar, hemoptisis masiva o EPOC exacerbado severo que requieran atención urgente.',
    estudios: 'Espirometría con prueba broncodilatadora, Rx y TC de tórax, gasometría arterial, oximetría de pulso, cultivo de esputo, fibrobroncoscopía si corresponde, polisomnografía.',
    tratamiento: 'Broncodilatadores (LABA/LAMA), corticoides inhalados, antibióticos en exacerbaciones, O₂ domiciliario, VNI/CPAP en SAHOS, inmunomoduladores en enfermedades intersticiales.',
    seguimiento: 'FEV1, SatO₂, frecuencia de exacerbaciones, adherencia al tratamiento inhalatorio, control de tabaquismo.',
  },
  gastroenterologia: {
    label: 'Gastroenterología',
    persona: 'gastroenterólogo especialista con más de 30 años de experiencia clínica',
    alertas: 'Destacá hemorragia digestiva activa, abdomen agudo, perforación visceral, ictericia obstructiva aguda o cirrosis descompensada que requieran intervención urgente.',
    estudios: 'Laboratorio hepático (TGO, TGP, FAL, bilirrubinas, TP), VEDA, VCC, ecografía y TC abdominal, serología viral hepática, H. pylori, calprotectina fecal, elastografía hepática.',
    tratamiento: 'IBPs, erradicación H. pylori, mesalazina/corticoides en EII, antivirales para hepatitis, tratamiento de HDA, manejo de ascitis, laxantes en hepatoencefalopatía.',
    seguimiento: 'Control de enzimas hepáticas, seguimiento endoscópico de lesiones, monitoreo de EII (calprotectina, colonoscopía), vigilancia de cirrosis (ecografía cada 6 meses, AFP).',
  },
  oncologia: {
    label: 'Oncología',
    persona: 'oncólogo clínico especialista con más de 30 años de experiencia en oncología médica',
    alertas: 'Destacá emergencias oncológicas: neutropenia febril, síndrome de lisis tumoral, compresión medular, hipercalcemia maligna, síndrome de vena cava superior o toxicidad severa a quimioterapia.',
    estudios: 'Marcadores tumorales específicos, TC/PET-CT de estadificación, RMN si compromiso SNC o medular, biopsia/histología, inmunohistoquímica, perfil molecular/mutaciones, laboratorio completo con función renal y hepática.',
    tratamiento: 'Esquemas de quimioterapia según tumor primario y estadio, inmunoterapia (checkpoint inhibitors), terapias dirigidas, radioterapia, cirugía. Manejo de toxicidades.',
    seguimiento: 'Respuesta por imágenes según criterios RECIST, control de marcadores, toxicidades acumuladas, performance status (ECOG), calidad de vida y cuidados paliativos.',
  },
  traumatologia: {
    label: 'Traumatología / Ortopedia',
    persona: 'traumatólogo y ortopedista especialista con más de 30 años de experiencia clínica',
    alertas: 'Destacá fracturas inestables, luxaciones que comprometan la vascularización, síndrome compartimental, lesiones de columna con riesgo neurológico o infección osteoarticular aguda.',
    estudios: 'Radiografías (mínimo 2 planos), TC para fracturas complejas, RMN para lesiones de tejidos blandos/ligamentos/médula, densitometría ósea, laboratorio con marcadores inflamatorios.',
    tratamiento: 'Reducción e inmovilización, tratamiento quirúrgico (osteosíntesis, artroplastia), rehabilitación kinésica, AINEs/analgesia, tratamiento de osteoporosis si fractura patológica.',
    seguimiento: 'Consolidación ósea por radiología, recuperación funcional, escalas de dolor y funcionalidad (EVA, Oxford), adherencia a rehabilitación.',
  },
  ginecologia: {
    label: 'Ginecología / Obstetricia',
    persona: 'ginecólogo-obstetra especialista con más de 30 años de experiencia clínica',
    alertas: 'Destacá emergencias obstétricas (preeclampsia severa, desprendimiento placentario, eclampsia) o ginecológicas (embarazo ectópico, abdomen agudo pélvico, hemorragia uterina masiva).',
    estudios: 'Ecografía transvaginal/obstétrica, Papanicolaou, colposcopía, HPV test, β-hCG, perfil hormonal (FSH, LH, estradiol, prolactina, AMH), TORCH en embarazo, laboratorio obstétrico completo.',
    tratamiento: 'Anticoncepción, tratamiento hormonal (SOP, menopausia, endometriosis), manejo del embarazo, preparación al parto, tratamiento de infecciones genitales, planificación de cirugía ginecológica.',
    seguimiento: 'Controles prenatales según semanas de gestación, Papanicolaou cada 3 años (o según riesgo), densitometría en menopausia, seguimiento post-tratamiento oncológico ginecológico.',
  },
  alergologia: {
    label: 'Alergología / Inmunología',
    persona: 'alergólogo e inmunólogo clínico especialista con más de 30 años de experiencia',
    alertas: 'Destacá anafilaxia (criterios de diagnóstico, necesidad de adrenalina IM inmediata y derivación urgente), angioedema laríngeo, status asmático, urticaria con compromiso sistémico o shock anafiláctico.',
    estudios: 'Prick test, IgE total e IgE específica (ImmunoCAP/RAST), diagnóstico molecular (ISAC/ALEX), espirometría con prueba broncodilatadora, provocación oral controlada, parche epicutáneo (patch test), eosinofilia en hemograma, complemento (C3, C4, CH50) en urticaria crónica espontánea, ANA y perfil inmunológico si sospecha autoinmune.',
    tratamiento: 'Antihistamínicos H1 de 2ª generación (dosis, frecuencia), corticoides sistémicos (indicación, vía, duración, pauta de descenso), adrenalina autoinyectable (prescripción, educación del paciente y familia), inmunoterapia específica con alérgenos (vía subcutánea SCIT o sublingual SLIT), omalizumab (asma severo/urticaria crónica refractaria), dupilumab (dermatitis atópica moderada-severa), mesalazina o montelukast si corresponde.',
    seguimiento: 'Control de síntomas con scores validados (SCORAD/EASI en dermatitis atópica, ACQ/ACT en asma, UAS7 en urticaria), función pulmonar (FEV1, PEF), niveles de IgE total en seguimiento de inmunoterapia, evaluación de reacciones locales/sistémicas a la inmunoterapia, educación sobre evitación de desencadenantes y uso correcto del autoinyector de adrenalina.',
  },
}

function buildSystemPrompt(esp) {
  const e = ESPECIALIDADES[esp] || ESPECIALIDADES.cardiologia
  return `Sos un ${e.persona}. Tu rol es asistir al médico tratante con un análisis conciso y específico del caso clínico presentado.

Respondé SIEMPRE con esta estructura exacta, sin agregar secciones adicionales:

## 🩺 Diagnósticos más probables

Listá SOLO los 1 o 2 diagnósticos más compatibles con el cuadro clínico. Para cada uno indicá:
- **Nombre del diagnóstico**
- **Probabilidad:** Alta / Media / Baja
- **Justificación clínica breve:** en 2-3 líneas, basada únicamente en los datos provistos

Si los datos son insuficientes para establecer un diagnóstico, indicalo explícitamente. No supongas datos que no fueron provistos.

## 🔬 Estudios complementarios sugeridos

Solo si son necesarios para confirmar o descartar los diagnósticos anteriores. Listá máximo 3-4 estudios concretos y justificá brevemente para qué sirve cada uno. Si los estudios ya realizados son suficientes, indicalo.
Estudios disponibles según la especialidad (${e.label}): ${e.estudios}

## 💊 Orientación terapéutica

Solo si existe suficiente información clínica para sugerirlo. Sé específico: nombrar fármaco o intervención, dosis orientativa si corresponde. Si no hay datos suficientes para sugerir tratamiento, indicalo claramente.
${e.tratamiento}

## ⚠️ Alertas
${e.alertas}
Si no hay signos de alarma en este caso, escribí: "Sin alertas identificadas con los datos disponibles."

---
Reglas estrictas:
- Respondés SIEMPRE en español, con lenguaje médico técnico pero directo.
- Sé conciso. Evitá repetir datos del caso en tu respuesta.
- Si hay archivos adjuntos (imágenes, laboratorio, PDFs), integrá sus hallazgos directamente en tu análisis.
- NUNCA inventes datos, valores ni diagnósticos que no puedas respaldar con la información provista.
- Si la información es insuficiente para alguna sección, escribí: "Datos insuficientes para evaluar este punto."
- Al final agregá siempre en una línea: "⚠️ *Apoyo diagnóstico orientativo. El diagnóstico y tratamiento definitivos son responsabilidad exclusiva del médico tratante.*"`
}

// ─── Calcular edad ────────────────────────────────────────────────
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return 'No registrada'
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return `${edad} años`
}

// ─── Armar historial de consultas anteriores ─────────────────────
function armarHistorial(consultasPrevias) {
  if (!consultasPrevias || consultasPrevias.length === 0) return ''

  let texto = `\n# HISTORIAL DE CONSULTAS ANTERIORES (${consultasPrevias.length} consulta(s))\n`
  consultasPrevias.forEach((c, i) => {
    texto += `\n## Consulta ${i + 1} — ${new Date(c.fecha).toLocaleDateString('es-AR')}\n`
    texto += `- Motivo: ${c.motivo}\n`
    if (c.sintomas_actuales) texto += `- Síntomas: ${c.sintomas_actuales}\n`
    if (c.presion_arterial)  texto += `- PA: ${c.presion_arterial} mmHg\n`
    if (c.frecuencia_cardiaca) texto += `- FC: ${c.frecuencia_cardiaca} lpm\n`
    if (c.saturacion_o2)     texto += `- SpO₂: ${c.saturacion_o2}%\n`
    if (c.peso_kg)           texto += `- Peso: ${c.peso_kg} kg\n`
    if (c.ecg_descripcion)   texto += `- ECG: ${c.ecg_descripcion}\n`
    if (c.estudios_realizados) texto += `- Estudios: ${c.estudios_realizados}\n`
    if (c.notas_clinicas)    texto += `- Notas clínicas: ${c.notas_clinicas}\n`
    if (c.diagnostico_medico) texto += `- **Diagnóstico médico:** ${c.diagnostico_medico}\n`
    if (c.tratamiento)       texto += `- **Tratamiento indicado:** ${c.tratamiento}\n`
    if (c.proxima_consulta)  texto += `- Próxima consulta indicada: ${new Date(c.proxima_consulta).toLocaleDateString('es-AR')}\n`
  })
  return texto
}

// ─── Armar contexto textual ───────────────────────────────────────
function armarContexto(paciente, antecedente, medicaciones, consulta, archivos, consultasPrevias) {
  const p = paciente
  const imc = (p.peso_kg && p.talla_cm)
    ? (p.peso_kg / Math.pow(p.talla_cm / 100, 2)).toFixed(1)
    : 'No calculable'

  let texto = `# DATOS DEL PACIENTE\n`
  texto += `- Nombre: ${p.apellido}, ${p.nombre}\n`
  texto += `- Edad: ${calcularEdad(p.fecha_nacimiento)}\n`
  texto += `- Sexo: ${p.sexo || 'No registrado'}\n`
  texto += `- Grupo sanguíneo: ${p.grupo_sanguineo || 'No registrado'}\n`
  texto += `- Peso: ${p.peso_kg ? p.peso_kg + ' kg' : 'No registrado'}\n`
  texto += `- Talla: ${p.talla_cm ? p.talla_cm + ' cm' : 'No registrada'}\n`
  texto += `- IMC: ${imc}\n`

  if (antecedente) {
    texto += `\n# ANTECEDENTES\n`
    if (antecedente.antecedentes_familiares) texto += `- Familiares: ${antecedente.antecedentes_familiares}\n`
    if (antecedente.patologias_previas)      texto += `- Patologías previas: ${antecedente.patologias_previas}\n`
    if (antecedente.alergias)               texto += `- Alergias: ${antecedente.alergias}\n`
    if (antecedente.cirugias_previas)       texto += `- Cirugías previas: ${antecedente.cirugias_previas}\n`
    texto += `- Tabaquismo: ${antecedente.tabaco}\n`
    texto += `- Alcohol: ${antecedente.alcohol}\n`
    texto += `- Actividad física: ${antecedente.actividad_fisica}\n`
    if (antecedente.otros_habitos) texto += `- Otros hábitos: ${antecedente.otros_habitos}\n`
  }

  if (medicaciones && medicaciones.length > 0) {
    texto += `\n# MEDICACIÓN ACTUAL\n`
    medicaciones.forEach(m => {
      texto += `- ${m.nombre}`
      if (m.dosis) texto += ` ${m.dosis}`
      if (m.frecuencia) texto += ` — ${m.frecuencia}`
      if (m.indicacion) texto += ` (indicación: ${m.indicacion})`
      texto += `\n`
    })
  } else {
    texto += `\n# MEDICACIÓN ACTUAL\nSin medicación registrada\n`
  }

  texto += `\n# CONSULTA ACTUAL\n`
  texto += `- Fecha: ${new Date(consulta.fecha).toLocaleDateString('es-AR')}\n`
  texto += `- Motivo de consulta: ${consulta.motivo}\n`
  if (consulta.sintomas_actuales)      texto += `- Síntomas referidos: ${consulta.sintomas_actuales}\n`

  texto += `\n## Signos vitales\n`
  if (consulta.presion_arterial)        texto += `- Presión arterial: ${consulta.presion_arterial} mmHg\n`
  if (consulta.frecuencia_cardiaca)     texto += `- Frecuencia cardíaca: ${consulta.frecuencia_cardiaca} lpm\n`
  if (consulta.frecuencia_respiratoria) texto += `- Frecuencia respiratoria: ${consulta.frecuencia_respiratoria} rpm\n`
  if (consulta.temperatura)             texto += `- Temperatura: ${consulta.temperatura} °C\n`
  if (consulta.saturacion_o2)           texto += `- Saturación O₂: ${consulta.saturacion_o2}%\n`
  if (consulta.peso_kg)                 texto += `- Peso consulta: ${consulta.peso_kg} kg\n`

  if (consulta.ecg_descripcion)        texto += `\n## Descripción ECG (médico)\n${consulta.ecg_descripcion}\n`
  if (consulta.estudios_realizados)    texto += `\n## Estudios / laboratorio (descripción textual)\n${consulta.estudios_realizados}\n`
  if (consulta.notas_clinicas)         texto += `\n## Notas clínicas\n${consulta.notas_clinicas}\n`

  if (archivos && archivos.length > 0) {
    texto += `\n## Archivos adjuntos\n`
    archivos.forEach((a, i) => {
      texto += `- ${i+1}. ${a.nombre_original} | Tipo: ${a.categoria}${a.descripcion ? ' | Descripción: ' + a.descripcion : ''}\n`
    })
    texto += `\nLos archivos de imagen (ECG, radiografías, ecografías, etc.) y PDFs se adjuntan a continuación para tu análisis visual directo.\n`
  }

  texto += armarHistorial(consultasPrevias)

  return texto
}

// ─── Construir content blocks multimodal ─────────────────────────
function construirContentBlocks(contextoTexto, archivos) {
  const blocks = [{ type: 'text', text: contextoTexto }]

  for (const archivo of archivos) {
    const label = `${archivo.nombre_original} (${archivo.categoria}${archivo.descripcion ? ' — ' + archivo.descripcion : ''})`

    // Archivos de texto: leer desde DB directamente
    if (archivo.tipo_mime === 'text/plain') {
      const contenido = archivo.contenido || '[Contenido no disponible]'
      blocks.push({ type: 'text', text: `\n---\n**Informe escrito (${archivo.categoria}):** ${label}\n${contenido}` })
      continue
    }

    // Archivos binarios (imágenes, PDFs): leer desde DB (base64) o disco como fallback
    let buffer = null
    if (archivo.contenido) {
      // Guardado en DB como base64 — siempre disponible aunque Render reinicie
      buffer = Buffer.from(archivo.contenido, 'base64')
    } else {
      // Fallback: archivo subido antes del fix, intentar desde disco
      const ruta = join(UPLOADS_DIR, archivo.nombre_archivo)
      if (!fs.existsSync(ruta)) {
        blocks.push({ type: 'text', text: `[Archivo "${archivo.nombre_original}" (${archivo.categoria}) adjunto a la consulta pero no disponible para análisis visual — fue subido antes de la actualización del sistema. El médico lo tiene disponible en su historial.]` })
        continue
      }
      buffer = fs.readFileSync(ruta)
    }

    try {
      // Límite: 4 MB por archivo para no exceder límite de la API
      if (buffer.length > 4 * 1024 * 1024) {
        blocks.push({ type: 'text', text: `[Archivo "${archivo.nombre_original}" omitido: ${(buffer.length/1024/1024).toFixed(1)} MB supera el límite de análisis visual]` })
        continue
      }
      const base64 = buffer.toString('base64')

      if (archivo.tipo_mime.startsWith('image/')) {
        const mediaType = ['image/jpeg','image/png','image/gif','image/webp'].includes(archivo.tipo_mime)
          ? archivo.tipo_mime : 'image/jpeg'
        blocks.push({ type: 'text', text: `\n---\n**Imagen adjunta para análisis:** ${label}` })
        blocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } })

      } else if (archivo.tipo_mime === 'application/pdf') {
        blocks.push({ type: 'text', text: `\n---\n**PDF adjunto para análisis:** ${label}` })
        blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } })
      }
    } catch (e) {
      blocks.push({ type: 'text', text: `[Error al procesar ${archivo.nombre_original}: ${e.message}]` })
    }
  }

  return blocks
}

// ─── GET /api/claude/uso-mes ─────────────────────────────────────
router.get('/uso-mes', async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, { attributes: ['consultas_ia_limite'] })
    const usadas  = await contarUsoPorMes(req.user.id)
    res.json({
      usadas,
      limite:     usuario.consultas_ia_limite,   // null = ilimitado
      disponibles: usuario.consultas_ia_limite === null
        ? null
        : Math.max(0, usuario.consultas_ia_limite - usadas),
    })
  } catch (err) {
    res.status(500).json({ error: IS_PROD ? 'Error interno' : err.message })
  }
})

// ─── POST /api/claude/consultar/:consultaId ───────────────────────
router.post('/consultar/:consultaId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY no configurada. Agregala en backend/.env y reiniciá el servidor.'
    })
  }

  // Validar especialidad contra el enum
  const especialidad = req.body?.especialidad || 'cardiologia'
  if (!ESPECIALIDADES[especialidad]) {
    return res.status(400).json({ error: `Especialidad inválida: ${especialidad}` })
  }

  try {
    // Verificar límite mensual de consultas IA
    const usuario = await Usuario.findByPk(req.user.id, { attributes: ['consultas_ia_limite', 'demo'] })
    if (usuario.consultas_ia_limite !== null) {
      const usadas = await contarUsoPorMes(req.user.id)
      if (usadas >= usuario.consultas_ia_limite) {
        return res.status(429).json({
          error: usuario.demo
            ? 'Límite de consultas demo alcanzado.'
            : `Límite mensual de ${usuario.consultas_ia_limite} consultas IA alcanzado. Contactá al administrador para ampliar tu plan.`,
          limite_alcanzado: true,
          es_demo: usuario.demo ?? false,
        })
      }
    }

    // Verificar que la consulta pertenece al doctor autenticado
    const consulta = await verificarOwnerConsulta(req.params.consultaId, req.user.id)
    if (!consulta) return res.status(404).json({ error: 'Consulta no encontrada o acceso denegado' })

    const [paciente, antecedente, medicaciones, archivos, consultasPrevias] = await Promise.all([
      Paciente.findByPk(consulta.paciente_id),
      Antecedente.findOne({ where: { paciente_id: consulta.paciente_id } }),
      Medicacion.findAll({ where: { paciente_id: consulta.paciente_id, activo: true } }),
      Archivo.findAll({ where: { consulta_id: consulta.id } }),
      Consulta.findAll({
        where: { paciente_id: consulta.paciente_id, id: { [Op.ne]: consulta.id } },
        order: [['fecha', 'DESC']],
        limit: 10,
      }),
    ])

    const contextoTexto = armarContexto(paciente, antecedente, medicaciones, consulta, archivos, consultasPrevias)
    const contentBlocks = construirContentBlocks(contextoTexto, archivos)
    const systemPrompt  = buildSystemPrompt(especialidad)

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 3000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: contentBlocks }],
    })

    const respuesta = message.content[0].text

    // Guardar / actualizar en DB
    const [iaRecord, created] = await ConsultaIA.findOrCreate({
      where:    { consulta_id: consulta.id },
      defaults: { consulta_id: consulta.id, respuesta, tokens_input: message.usage?.input_tokens, tokens_output: message.usage?.output_tokens }
    })
    if (!created) {
      await iaRecord.update({ respuesta, tokens_input: message.usage?.input_tokens, tokens_output: message.usage?.output_tokens })
    }

    res.json({ respuesta, tokens: message.usage, archivos_analizados: archivos.length })
  } catch (err) {
    console.error('Error Claude:', err.message)
    res.status(500).json({ error: IS_PROD ? 'Error al consultar IA' : err.message })
  }
})

// ─── POST /api/claude/consultar/:consultaId/pregunta ─────────────
router.post('/consultar/:consultaId/pregunta', async (req, res) => {
  const { pregunta, especialidad: espBody } = req.body
  if (!pregunta?.trim()) return res.status(400).json({ error: 'Pregunta requerida' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY no configurada.' })
  }

  const especialidad = espBody || 'cardiologia'
  if (!ESPECIALIDADES[especialidad]) {
    return res.status(400).json({ error: `Especialidad inválida: ${especialidad}` })
  }

  try {
    // Verificar que la consulta pertenece al doctor autenticado
    const consulta = await verificarOwnerConsulta(req.params.consultaId, req.user.id)
    if (!consulta) return res.status(404).json({ error: 'Consulta no encontrada o acceso denegado' })

    const iaRecord = await ConsultaIA.findOne({ where: { consulta_id: consulta.id } })
    if (!iaRecord) return res.status(404).json({ error: 'Primero realizá el análisis inicial' })

    // Limitar historial para evitar crecimiento infinito
    const historial = iaRecord.historial || []
    if (historial.length >= MAX_HISTORIAL) {
      return res.status(400).json({ error: `Límite de ${MAX_HISTORIAL} preguntas de seguimiento alcanzado para esta consulta.` })
    }

    // Reconstruir contexto completo
    const [paciente, antecedente, medicaciones, archivos, consultasPrevias] = await Promise.all([
      Paciente.findByPk(consulta.paciente_id),
      Antecedente.findOne({ where: { paciente_id: consulta.paciente_id } }),
      Medicacion.findAll({ where: { paciente_id: consulta.paciente_id, activo: true } }),
      Archivo.findAll({ where: { consulta_id: consulta.id } }),
      Consulta.findAll({
        where: { paciente_id: consulta.paciente_id, id: { [Op.ne]: consulta.id } },
        order: [['fecha', 'DESC']], limit: 10,
      }),
    ])

    const contextoTexto = armarContexto(paciente, antecedente, medicaciones, consulta, archivos, consultasPrevias)
    const primerosBlocks = construirContentBlocks(contextoTexto, archivos)

    // Cadena completa: contexto → respuesta inicial → historial previo → nueva pregunta
    const messages = [
      { role: 'user',      content: primerosBlocks },
      { role: 'assistant', content: iaRecord.respuesta },
    ]
    for (const turno of historial) {
      messages.push({ role: 'user',      content: turno.pregunta })
      messages.push({ role: 'assistant', content: turno.respuesta })
    }
    messages.push({ role: 'user', content: pregunta.trim() })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      system:     buildSystemPrompt(especialidad),
      messages,
    })

    const respuestaFollowUp = message.content[0].text

    // Guardar nuevo turno en historial
    await iaRecord.update({
      historial: [...historial, {
        pregunta: pregunta.trim(),
        respuesta: respuestaFollowUp,
        ts: new Date().toISOString(),
      }]
    })

    res.json({ respuesta: respuestaFollowUp, tokens: message.usage })
  } catch (err) {
    console.error('Error Claude follow-up:', err.message)
    res.status(500).json({ error: IS_PROD ? 'Error al consultar IA' : err.message })
  }
})

export default router
