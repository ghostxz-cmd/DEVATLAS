# 📚 Advanced Module Management System - DevAtlas

## Prezentare Generală

Sistem avansat de gestionare module și cursuri cu feature-uri complete pentru profesori:
- 🎯 Creiere module cu popup elegant
- 📚 Gestionare curriculum (lecții, materiale, videoclipuri)
- 📅 Calendar cursuri cu gestionare evenimente (prelegeri, examene, laboratoare)
- ✍️ Quiz Builder - creare teste cu răspunsuri multiple, True/False, exerciții cod
- 📋 Task Manager - creiere și gestionare taskuri/teme
- 🔬 Laborator System - exerciții practice (coding, desen, experimentale)
- 📊 Grades Management - jurnal note elevi, rapoarte

---

## 🗄️ Schema Database - Tabele Noi

### Enums
```sql
LESSON_TYPE: 'MATERIAL' | 'VIDEO' | 'INTERACTIVE' | 'READING'
QUIZ_QUESTION_TYPE: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'CODE' | 'ESSAY'
CALENDAR_EVENT_TYPE: 'LECTURE' | 'EXAM' | 'LABORATORY' | 'SEMINAR' | 'CONSULTATION' | 'ASSIGNMENT_DUE'
TASK_STATUS: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
LABORATOR_TYPE: 'CODING' | 'DRAWING' | 'EXPERIMENTAL' | 'PRACTICAL'
```

### Tabele
- **course_lessons** - Lecții și materiale curriculum
- **course_quizzes** - Teste și quizuri
- **quiz_questions** - Întrebări în cadrul unui quiz
- **quiz_submissions** - Submisii student la quizuri (scor, răspunsuri, timp)
- **course_tasks** - Taskuri/teme cu rubrice de evaluare
- **task_submissions** - Submisii student la taskuri (cod, feedback, scor)
- **course_calendar_events** - Evenimente calendar (prelegeri, examene, seminare)
- **event_attendance** - Urmărire prezență elevi la evenimente
- **laborator_sessions** - Sesiuni laborator cu instrucțiuni și test cases
- **laborator_submissions** - Submisii student laborator (cod/desene)
- **course_drawing_elements** - Elemente desenate/diagrame (canvas data)
- **course_grades** - Jurnal note finale per elev

---

## 📦 Migrație Database

### Pas 1: Aplică schema extinsa

```bash
cd sursacod
node migrate.js supabase/course_system_v1.sql
```

**Expected output:**
```
✓ Enums created (lesson_type, quiz_question_type, calendar_event_type, task_status, laborator_type)
✓ Tables created (course_lessons, course_quizzes, quiz_questions, quiz_submissions, etc.)
✓ Indexes created (25 indexes)
✓ Triggers created (10 triggers)
✓ RLS policies updated
```

### Pas 2: Verifică status

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'course_%' OR tablename LIKE 'quiz_%' OR tablename LIKE 'task_%' OR tablename LIKE 'event_%' OR tablename LIKE 'laborator_%';
```

---

## 🎨 Components Structură

```
components/
├── module/
│   ├── ModuleCreationModal.tsx         # Popup creare modul
│   ├── ModuleManagementDashboard.tsx   # Dashboard principal (tab-uri)
│   └── tabs/
│       ├── LessonEditor.tsx            # Curriculum management
│       ├── QuizBuilder.tsx              # Quiz creation interface
│       ├── TaskManager.tsx              # Task management
│       ├── CalendarView.tsx             # Calendar events
│       ├── LaboratorManager.tsx         # Laborator sessions
│       └── GradesView.tsx               # Grades journal

app/
├── api/
│   └── courses/[courseId]/
│       ├── modules/
│       │   ├── route.ts                 # GET modules, POST create module
│       │   └── [moduleId]/route.ts      # GET, PATCH, DELETE module
│       └── lessons/route.ts             # GET, POST lessons
└── dashboard-profesor-management/[courseId]/
    └── modules/
        └── page.tsx                     # Module management page
```

---

## 🚀 API Routes

### Module Management
```
GET    /api/courses/[courseId]/modules                 # Listează module
POST   /api/courses/[courseId]/modules                 # Crează modul
GET    /api/courses/[courseId]/modules/[moduleId]      # Get modul
PATCH  /api/courses/[courseId]/modules/[moduleId]      # Actualizează modul
DELETE /api/courses/[courseId]/modules/[moduleId]      # Șterge modul
```

### Lessons
```
GET    /api/courses/[courseId]/lessons                 # Listează lecții
POST   /api/courses/[courseId]/lessons                 # Crează lecție
```

### Future endpoints (to implement)
```
POST   /api/courses/[courseId]/quizzes                 # Crează quiz
POST   /api/courses/[courseId]/quizzes/[quizId]/submit # Submit quiz
POST   /api/courses/[courseId]/tasks                   # Crează task
POST   /api/courses/[courseId]/calendar-events         # Crează event
POST   /api/courses/[courseId]/laborator-sessions      # Crează laborator
GET    /api/courses/[courseId]/grades                  # Obține note
```

---

## 📋 Fluxuri Utilizator

### Profesor: Creare Modul
1. Apasă "Creare Modul Nou" din `/dashboard-profesor-management/[courseId]/modules`
2. Completează popup:
   - Titlu
   - Descriere
   - Imagine copertă (URL)
   - Medie minima de trecere (%)
3. Sistem creează module cu status DRAFT
4. Profesor e redirectat la ModuleManagementDashboard

### Profesor: Gestionare Curriculum
1. Se deschide ModuleManagementDashboard cu tab-uri
2. Tab **Curriculum**:
   - Apasă "+ Adaugă Lecție"
   - Completeaza: titlu, descriere, tip (MATERIAL/VIDEO/INTERACTIVE/READING), conținut
   - Sistem salvează lecția ordine
   - Profesor poate sort/edit lecții

### Profesor: Creare Quiz
1. Tab **Teste**:
   - Apasă "+ Creare Test"
   - Adaugă întrebări:
     - Multiple Choice (A, B, C, D)
     - True/False
     - Short Answer
     - Code Exercise (cu test cases)
     - Essay
   - Setează scor de trecere, timp limit, permite retry
   - Publicează test

### Profesor: Gestionare Calendar
1. Tab **Calendar**:
   - Calendar grid lunar
   - Apasă "+ Adaugă Eveniment"
   - Selectează tip: LECTURE, EXAM, LABORATORY, SEMINAR, CONSULTATION, ASSIGNMENT_DUE
   - Setează data/ora, locație/link online
   - Sistem arată pe calendar

### Profesor: Laborator Setup
1. Tab **Laborator**:
   - Selectează tip: CODING, DRAWING, EXPERIMENTAL, PRACTICAL
   - **Coding**: Template cod inițial, test cases, limbaje acceptate (Python, JavaScript, etc)
   - **Drawing**: Canvas data, instrumente vector
   - **Experimental**: Simulări interactive
   - **Practical**: Scenarii reale, checklist
   - Studentul submite, sistem evaluează automat (coding) sau trimite pentru review (drawing)

### Profesor: Gestionare Note
1. Tab **Grades**:
   - Tabel cu: Elev, Teste, Taskuri, Lab, Prezență, Nota Finală
   - Statistici: Media Teste, Media Taskuri, Media Lab, Prezență
   - Export raport (CSV/PDF)

---

## 🔧 Integrare în Dashboard Profesor Existent

### Pas 1: Adaugă link în dashboard

În `app/dashboard-profesor-management/[courseId]/page.tsx`, adaugă buton:

```tsx
<Link href={`/dashboard-profesor-management/${courseId}/modules`}>
  <button className="rounded-lg bg-cyan-500 px-4 py-2 text-white">
    📚 Gestionare Module și Curs
  </button>
</Link>
```

### Pas 2: Importă componente în layout

```tsx
import ModuleCreationModal from '@/components/module/ModuleCreationModal';
import ModuleManagementDashboard from '@/components/module/ModuleManagementDashboard';
```

---

## 📝 Future Implementation Tasks

1. **Quiz Builder (Full)**
   - UI cu drag-drop pentru reordnare întrebări
   - Rich text editor pentru enunțuri
   - Test case builder pentru exerciții cod
   - Preview quiz
   - Validare răspunsuri

2. **Task Submission System**
   - Upload fișiere
   - Rubrice evaluare interactive
   - Feedback text + attachments
   - Resubmit logic

3. **Laborator Auto-grading**
   - Execuție cod (sandbox)
   - Test case validation
   - Output comparison
   - Error reporting

4. **Drawing Canvas**
   - Konva.js sau Fabric.js integration
   - Shape tools (lines, rectangles, circles)
   - Text annotations
   - Color palette
   - Export PNG/SVG

5. **Calendar Recurring Events**
   - Weekly/Monthly patterns
   - Bulk event creation
   - Timezone support

6. **Advanced Grading**
   - Weighted calculations
   - Letter grade conversion (A+, A, B+, etc)
   - Curve grading
   - Attendance impact

---

## 🔐 Security & Permissions

- **Row Level Security (RLS)**: Activat pe toate tabelele
- **Instructor Authentication**: Bearer token required pe POST/PATCH/DELETE
- **Ownership Verification**: Profesor nu poate modifica module altor profesori
- **Student Isolation**: Studenti nu pot vedea module draft sau alte curse

---

## 📊 Data Relationships

```
course_groups (MODULE)
├── course_lessons
├── course_quizzes
│   └── quiz_questions
│       └── quiz_submissions (student answers)
├── course_tasks
│   └── task_submissions (student work)
├── course_calendar_events
│   └── event_attendance (student presence)
├── laborator_sessions
│   └── laborator_submissions (student code/drawings)
├── course_drawing_elements
└── course_grades (aggregated per student)
```

---

## 📚 API Usage Examples

### Creare Modul
```bash
curl -X POST http://localhost:3000/api/courses/abc123/modules \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Modul Python Avansate",
    "description": "Curs complet Python cu OOP",
    "coverImageUrl": "https://...",
    "minPassingScore": 70
  }'
```

### Adaugă Lecție
```bash
curl -X POST http://localhost:3000/api/courses/abc123/lessons \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introducere OOP",
    "description": "Concepte fundamentale",
    "lessonType": "MATERIAL",
    "content": "...",
    "estimatedDurationMinutes": 45
  }'
```

---

## ✅ Status & Checklist

- ✅ Database schema (13 noi tabele)
- ✅ Enums (5 noi tipuri)
- ✅ RLS policies
- ✅ API routes (GET/POST modules, GET/POST lessons)
- ✅ Module creation modal
- ✅ Module management dashboard (6 tab-uri)
- ✅ Tab UI placeholders (Quiz, Tasks, Calendar, Laborator, Grades)
- ✅ TypeScript validation (0 errors)
- ⏳ Quiz Builder (full implementation)
- ⏳ Quiz Submission & Grading
- ⏳ Task Submission System
- ⏳ Calendar Event Management
- ⏳ Laborator Auto-grading
- ⏳ Drawing Canvas
- ⏳ Advanced Grading Logic

---

## 🎯 Next Steps

1. **Run database migration:**
   ```bash
   cd sursacod
   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node migrate.js supabase/course_system_v1.sql
   ```

2. **Test module creation:**
   - Open `/dashboard-profesor-management/[courseId]/modules`
   - Click "Creare Modul Nou"
   - Submit form
   - Verify modul appears in list

3. **Develop Quiz Builder:**
   - Implement QuizBuilder.tsx fully
   - Add API route for quiz CRUD
   - Build question editor UI

4. **Implement Laborator:**
   - Choose canvas library (Konva/Fabric for drawing)
   - Build code editor with syntax highlighting
   - Implement test case execution

---

**Created:** May 5, 2026  
**System Version:** 1.0 (Beta)  
**Author:** DevAtlas Team
