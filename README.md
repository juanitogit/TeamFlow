# TeamFlow 🚀

TeamFlow es una plataforma integral de gestión de equipos, seguimiento del rendimiento y análisis de productividad diseñada especialmente para equipos de desarrollo de software. Permite a los líderes y miembros colaborar, registrar aportes, gestionar tareas y medir el impacto a través de integraciones directas con GitHub, todo bajo una interfaz moderna, limpia y altamente intuitiva.

---

## ✨ Características Principales

### 🏢 Gestión de Workspaces (Espacios de Trabajo)
- **Creación y Configuración:** Los usuarios pueden crear múltiples workspaces, personalizarlos con un logo, descripción y vincular múltiples repositorios de GitHub.
- **Roles y Permisos:** Sistema avanzado de roles que incluye **Líder** (dueño y administrador total), **Co-líder** (apoyo en administración y revisión) y **Miembro** (colaborador regular).
- **Invitaciones Dinámicas:** Generación de enlaces y códigos de invitación con vigencia configurable (desde 1 minuto hasta días, o tiempo personalizado) para invitar nuevos miembros de forma segura.

### 📊 Dashboard de Rendimiento (Gamificación)
- **Score de Rendimiento y Puntos de Salud:** Cada usuario tiene un "Score" (0-100%) y "Puntos de Salud" que reflejan su actividad. Los líderes pueden editar manualmente el score si es necesario.
- **Vista Global:** Panel unificado donde se visualizan métricas clave como aportes aprobados, pendientes, salud general y gráficos de "Aportes de la Semana".
- **Feed del Equipo:** Muro de actividad en tiempo real mostrando los últimos aportes subidos por los miembros del equipo y su estado de revisión.

### 📝 Registro y Revisión de Aportes (Contributions)
- **Registro de Trabajo:** Los miembros pueden subir sus aportaciones de forma manual detallando el trabajo realizado.
- **Flujo de Aprobación:** Los líderes y co-líderes tienen una sección dedicada para **Revisar Aportes**, donde pueden aprobarlos (sumando métricas al usuario) o rechazarlos con feedback.

### 🔔 Sistema de Alertas por Correo Electrónico
- **Notificaciones a Líderes:** Cuando un miembro registra un nuevo aporte, se dispara automáticamente un correo electrónico a todos los líderes y co-líderes del workspace notificándoles que hay un trabajo esperando revisión.
- **Feedback Inmediato al Miembro:** En el momento en que un líder aprueba o rechaza un aporte, el autor recibe un correo instantáneo con el veredicto y los comentarios que haya dejado el líder.
- **Invitaciones por Correo:** Posibilidad de enviar invitaciones para unirse al workspace directamente a través de email.

### 🐙 Integración Avanzada con GitHub
- **Análisis de Repositorios:** La plataforma lee los repositorios públicos/privados vinculados al workspace para extraer estadísticas en tiempo real.
- **Métricas de Código:** Muestra el "Total de Commits", "Autores Activos", el "Top Contribuyente" y la cantidad de Pull Requests.
- **Filtros por Período y Repositorio:** Filtra los gráficos (Commits por Integrante y Commits en el Tiempo) por días, semanas o meses, y desglosa la información por repositorio específico o todos a la vez.

### 🏃 Sprints y Ciclos
- **Gestión Ágil:** Creación de Sprints/Ciclos de trabajo definiendo fechas de inicio y fin.
- **Asignación de Tareas:** Permite vincular tareas específicas a cada sprint para medir la carga de trabajo y el avance en cada iteración.
- **Estados:** Seguimiento del estado del sprint (Planificación, Activo, Completado).

### ✅ Tareas (Mis Tareas)
- **Tablero de Productividad:** Visualización de todas las tareas asignadas al usuario.
- **Filtros Rápidos:** Botón de filtrado unificado e inteligente para ver tareas "Todas", "Pendientes", "En Progreso" o "Completadas".

---

## 🎨 Diseño y UI/UX (Interfaz de Usuario)

El diseño de TeamFlow ha sido cuidadosamente creado para ofrecer una experiencia **Premium, Moderna y Fluida**:

- **Fondo Geométrico Personalizado:** Utiliza un diseño sutil, claro y predominantemente blanco con formas geométricas estilo *low-poly/tessellation* que aporta un look profesional sin competir con la información.
- **Cartas Limpias y Blancas:** La información se presenta en tarjetas de fondo blanco sólido (`bg-white`) con bordes suaves, sombras ligeras y esquinas redondeadas (`rounded-[24px]`).
- **Micro-Animaciones:** Integración de **Framer Motion** para efectos de transición, entrada de elementos (`fade-up`) y animaciones sutiles al pasar el cursor (hover) que le dan "vida" a la app.
- **Visualización de Datos:** Gráficos de área y barras estilizados mediante **Recharts**, usando gradientes modernos y paletas de colores armónicas (azules primarios, esmeraldas para éxito, ámbar para alertas).
- **Responsive Design:** Interfaces completamente adaptables. Los menús de escritorio se transforman en una elegante barra de navegación inferior (bottom tab bar) en dispositivos móviles, asegurando usabilidad al 100% en teléfonos.

---

## 🛠️ Stack Tecnológico

El proyecto está dividido en un esquema cliente-servidor (Frontend + Backend):

### Frontend (Cliente)
- **Core:** React.js + TypeScript
- **Build Tool:** Vite
- **Estilos:** Tailwind CSS (Vanilla CSS para el root)
- **Componentes:** shadcn/ui (Radix UI + Tailwind)
- **Iconografía:** Lucide React
- **Animaciones:** Framer Motion
- **Gráficos:** Recharts
- **Gestión del Estado y Fetching:** React Query (@tanstack/react-query)
- **Rutas:** React Router DOM (Wouter o similar dependiendo del router implementado)
- **Manejo de Fechas:** date-fns

### Backend (API Server)
- **Core:** Node.js con Express.js
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL
- **ORM:** Drizzle ORM
- **Validación de Datos:** Zod
- **Servicio de Correos:** Resend (o librería Node Mailer configurada)
- **Autenticación:** JSON Web Tokens (JWT) con encriptación de contraseñas.

---

## ⚙️ Estructura de Base de Datos (Drizzle ORM)

La base de datos maneja un ecosistema relacional con las siguientes entidades principales:
- **`users`**: Almacena información de los usuarios registrados (email, password hash, avatar).
- **`workspaces`**: Define los espacios de trabajo, su información general y repositorios de GitHub vinculados.
- **`workspace_members`**: Tabla pivote que vincula `users` con `workspaces`, asignando el `role`, `performanceScore` y `healthPoints`.
- **`contributions`**: Registro de todos los aportes, el usuario creador, su workspace, el estado de aprobación (`pending`, `approved`, `rejected`) y feedback del revisor.
- **`sprints`**: Ciclos de desarrollo vinculados a un workspace.
- **`tasks`**: Tareas creadas, asignadas a un usuario dentro de un workspace, que pueden pertenecer a un sprint específico.

---

## 🚀 Cómo Empezar (Desarrollo Local)

*(Asumiendo que el repositorio ya está clonado en la máquina)*

1. **Instalar Dependencias:**
   Navega a las carpetas respectivas del cliente y del servidor y ejecuta:
   ```bash
   npm install
   ```
2. **Configurar Variables de Entorno (`.env`):**
   Asegúrate de configurar las credenciales de la base de datos PostgreSQL, tu clave secreta para JWT, y la clave API (ej. Resend) para el envío de correos.
3. **Migraciones de Base de Datos:**
   Levanta el esquema de Drizzle ejecutando:
   ```bash
   npm run db:push
   ```
4. **Iniciar el Backend:**
   Inicia el servidor de desarrollo del API.
   ```bash
   npm run dev
   ```
5. **Iniciar el Frontend:**
   En una terminal paralela, inicia la aplicación React/Vite.
   ```bash
   npm run dev
   ```

*¡Bienvenido a TeamFlow, la manera inteligente de medir y escalar el talento de tu equipo!*
