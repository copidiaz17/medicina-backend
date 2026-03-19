import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login',  name: 'Login',  component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  { path: '/setup',  name: 'Setup',  component: () => import('@/views/SetupView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/components/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '',               name: 'Dashboard',         component: () => import('@/views/DashboardView.vue') },
      { path: 'pacientes',      name: 'Pacientes',         component: () => import('@/views/PacientesView.vue') },
      { path: 'pacientes/nuevo',name: 'NuevoPaciente',     component: () => import('@/views/PacienteFormView.vue') },
      { path: 'pacientes/:id',  name: 'PacienteDetalle',   component: () => import('@/views/PacienteDetalleView.vue'), props: true },
      { path: 'pacientes/:id/editar', name: 'EditarPaciente', component: () => import('@/views/PacienteFormView.vue'), props: true },
      { path: 'pacientes/:pacienteId/consultas/nueva', name: 'NuevaConsulta', component: () => import('@/views/ConsultaFormView.vue'), props: true },
      { path: 'consultas/:id',  name: 'ConsultaDetalle',   component: () => import('@/views/ConsultaDetalleView.vue'), props: true },
      { path: 'agenda',         name: 'Agenda',            component: () => import('@/views/AgendaView.vue') },
      { path: 'usuarios',       name: 'Usuarios',          component: () => import('@/views/UsuariosView.vue') },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isLoggedIn) return { name: 'Login' }
  if (to.name === 'Login' && auth.isLoggedIn) return { name: 'Dashboard' }
})

export default router
