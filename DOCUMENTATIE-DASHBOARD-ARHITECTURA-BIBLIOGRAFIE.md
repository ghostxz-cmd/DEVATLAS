# DevAtlas - Documentatie Extinsa

## 1. Introducere
Acest document este un material complet de analiza functionala si tehnica pentru platforma DevAtlas, construit pentru a acoperi detaliat:
- pagina de dashboard general profesor;
- pagina de dashboard elev pentru cursuri;
- pagina de dashboard profesor pentru administrarea unui curs;
- sistemele existente si sistemele planificate pentru administrarea cursurilor (catalog, grup chat curs, note, module, taskuri, program, camera online, assets, analytics, workflow-uri de publicare);
- arhitectura aplicatiei de la A la Z (frontend, backend, API-uri, baze de date, securitate, deploy, observabilitate);
- bibliografie extinsa cu minim 50 de resurse relevante.

Documentul combina informatii din implementarea actuala cu directii de extensie pentru modulele aflate in stadiu partial sau planificat.

---

## 2. Context General Platforma
DevAtlas este o platforma educationala modulara dezvoltata in monorepo, orientata catre:
- invatare asistata prin cursuri structurate;
- dashboard-uri diferentiate pe rol (elev, profesor, admin);
- administrare de continut, progres, feedback si support;
- integrare cu Supabase (Auth + Postgres + API SQL) pentru date si securitate.

### 2.1 Obiective de produs
- centralizarea experientei de invatare intr-un dashboard clar si actionabil;
- monitorizare in timp real a progresului educational;
- oferirea de instrumente de management curs pentru profesor;
- suport operational complet (ticketing + chat + audit + logs);
- scalare progresiva a platformei prin arhitectura modulara.

### 2.2 Roluri principale
- Elev: parcurge cursuri, urmareste progresul, acumuleaza XP, interactioneaza cu suportul si comunitatea.
- Profesor: creeaza/organizeaza cursuri, monitorizeaza studenti, analizeaza engagement, gestioneaza pipeline-ul de continut.
- Admin: gestioneaza sistemul global, calitatea continutului, moderare, audit, suport avansat.

---

## 3. Dashboard General Profesor (descriere extinsa)
Referinta implementare UI: apps/web/app/dashboard-profesor/page.tsx
Referinta API: apps/web/app/api/dashboard/instructor/overview/route.ts

### 3.1 Rol strategic in platforma
Dashboard-ul general al profesorului este conceput ca un spatiu de control operational in care instructorul intra pentru a intelege rapid starea reala a activitatii sale academice, iar valoarea acestei pagini vine din faptul ca aduce intr-un singur loc datele de profil, starea cursurilor, dinamica studentilor, calitatea feedback-ului si istoricul de activitate, fara ca utilizatorul sa fie obligat sa treaca prin mai multe meniuri doar ca sa raspunda la intrebarea simpla "ce trebuie sa fac acum". In practica, aceasta pagina functioneaza ca o punte intre analiza si executie, pentru ca profesorul nu vede doar cifre, ci vede si directii concrete de actiune, astfel incat dashboard-ul devine un instrument de decizie, nu doar o vitrina cu statistici.

### 3.2 Structura de suprafata in experienta utilizatorului
La intrarea in pagina, utilizatorul vede antetul contextual, unde apar titlul principal, starea de sincronizare si elementele de identitate profesionala, iar acest antet are rolul de a ancora profesorul in contextul corect al sesiunii. Imediat dupa antet este randata zona KPI, unde sunt prezentate cele mai importante valori de performanta, cum ar fi numarul de cursuri active, volumul de studenti, numarul total de lectii, media de feedback si procentul de completare a profilului, iar aceasta combinatie este gandita pentru scanare rapida, astfel incat in cateva secunde profesorul sa poata evalua daca ecosistemul sau de cursuri evolueaza sanatos.

In continuare, sectiunea de profil si recomandari nu se limiteaza la afisarea numelui sau a email-ului, ci adauga semnale de completitudine, competenta declarata si recomandari contextuale bazate pe date, ceea ce transforma profilul dintr-un bloc static intr-o componenta activa de ghidaj. Sectiunea de activitate recenta extinde acest tablou printr-un feed cronologic in care apar evenimente relevante pentru profesor, cu marcaj temporal relativ, iar acest lucru este util deoarece reduce timpul de investigatie atunci cand instructorul vrea sa afle ce s-a intamplat in ultimele ore sau zile. Sectiunea de cursuri proprii si blocul de feedback top completeaza tabloul printr-o vedere comparativa asupra performantelor pe curs, permitand prioritizarea imbunatatirilor acolo unde impactul este cel mai mare.

### 3.3 Fluxul de date si mecanismul de agregare
Din punct de vedere tehnic, pagina urmeaza un flux clar: frontend-ul extrage sesiunea activa din clientul Supabase, trimite token-ul de acces catre endpoint-ul de overview, iar serverul valideaza identitatea si rolul instructorului inainte sa inceapa agregarea. Dupa aceasta validare, endpoint-ul rezolva contul de instructor prin auth_user_id sau email, rezolva maparea in tabela users si, daca maparea lipseste, poate realiza reprovisionare controlata, apoi interogheaza sursele de date operationale, inclusiv courses, lessons, enrollments, submissions, course_categories, instructor_profiles si instructor_activity_logs. Ultimul pas este compunerea unui payload consolidat care contine summary, activityFeed, feedbackSummary si recommendations, payload ce este trimis catre UI pentru randare in stari predictibile de loading, success, error sau empty.

### 3.4 Semnificatia indicatorilor pentru managementul academic
Indicatorii afisati nu sunt doar metrici tehnice, ci semnale de management: distributia cursurilor pe stari arata maturitatea pipeline-ului de continut, totalul de studenti arata amplitudinea operationala a activitatii didactice, totalul lectiilor reflecta adancimea curriculei, iar media feedback-ului indica perceptia calitatii din perspectiva cursantului. In paralel, recentActivityCount masoara pulsul operational, iar profileCompletion are rol de indicator de incredere institutionala si de pregatire profesionala in interfata publica. Interpretate impreuna, aceste valori permit profesorului sa ia decizii privind prioritati de publicare, consolidare de cursuri sau interventii de calitate.

### 3.5 Recomandari inteligente si impact operational
Modulul de recomandari are rol de asistent decizional, pentru ca traduce datele brute in pasi concreti, de exemplu completarea profilului, corectarea zonelor cu engagement scazut sau cresterea volumului de feedback valid. Acest strat poate evolua natural catre un engine de recomandare mai avansat, combinand reguli euristice, segmentari pe comportament si semnale predictive legate de risc de abandon sau de stagnare a progresului. In ansamblu, dashboard-ul general profesor reduce timpul dintre observatie si actiune, creste capacitatea de monitorizare continua si imbunatateste viteza cu care instructorul poate regla calitatea cursurilor sale.

### 3.6 Inventar complet de componente din dashboard-ul general profesor
Pentru a descrie complet pagina de dashboard general profesor, este important sa privim ecranul ca pe o compozitie de componente functionale care au fiecare un rol explicit in procesul de decizie, nu ca pe o simpla colectie de carduri. Componenta de antet are rol de orientare imediata si afiseaza titlul zonei generale, contextul de date reale si indicatorul de sincronizare, iar in aceeasi zona sunt integrate chips de expertiza si metadate de profil care comunica instant nivelul de completare profesionala al instructorului. Sub acest strat, componenta KPI Grid afiseaza cele cinci semnale rapide de control operational, respectiv cursuri active, studenti, lectii, feedback mediu si profil completat, astfel incat profesorul sa poata evalua in cateva secunde daca starea globala a activitatii sale necesita interventie sau poate continua in ritm normal.

Componenta "Profil si recomandari" este construita in doua subcoloane, unde prima subcoloana consolideaza datele de identitate si maturitate a contului, iar a doua subcoloana livreaza recomandari prioritizate pe baza datelor agregate, astfel incat utilizatorul sa nu fie obligat sa deduca singur ce ar trebui sa faca mai departe. In aceeasi arie functionala, componenta de expertiza afiseaza etichete de competenta care pot fi folosite ulterior pentru personalizarea recomandarilor de continut si pentru clasificare institutionala in panoul de administrare. Componenta "Activitate recenta" functioneaza ca jurnal tactic si ordoneaza evenimentele in timp relativ, oferind profesorului o vedere compacta asupra schimbarilor importante care i-au afectat cursurile, iar componenta "Cursuri proprii" livreaza un rezumat comparativ pe fiecare curs cu indicatori de nivel, categorie, status, lectii, studenti si semnal de rating, ceea ce permite prioritizare rapida a interventiilor pe continut.

La final, componenta "Feedback top" inchide bucla de observabilitate academica prin evidentierea cursurilor cu semnale de calitate cele mai relevante, astfel incat profesorul sa poata decide daca mentine directia curenta sau daca deschide o iteratie de imbunatatire a structurii pedagogice, a ritmului de predare sau a materialelor asociate.

### 3.7 Subsectiuni operationale si comportament in stari diferite
Dashboard-ul general profesor trebuie descris si prin comportamentul sau in stari operationale diferite, pentru ca valoarea unei pagini de comanda nu se masoara doar cand datele sunt perfecte, ci mai ales cand apar exceptii. In starea de incarcare, indicatorul de sincronizare semnaleaza explicit faptul ca agregarea este in curs, iar componentele principale raman stabile vizual pentru a evita senzatia de "salt" la randare. In starea de succes, toate blocurile sunt populate cu payload-ul agregat, iar utilizatorul poate parcurge pagina de sus in jos intr-un flux logic care incepe cu status global si se termina cu actiuni recomandate. In starea de eroare, pagina afiseaza un mesaj clar si contextual, fara a ascunde cauza esecului, ceea ce reduce timpul de diagnostic atat pentru utilizator, cat si pentru suport tehnic.

In starea de date insuficiente, componentele afiseaza mesaje de tip empty-state explicative, nu valori implicite inselatoare, astfel incat profesorul sa inteleaga daca lipsa datelor vine din inactivitate, din lipsa cursurilor publicate sau dintr-o problema de mapare cont. Acest model de comportament este critic pentru mentenanta operationala deoarece previne concluzii eronate in momentele in care platforma este in tranzitie de date.

### 3.8 KPI management pe niveluri de interpretare
Indicatorii din dashboard-ul general profesor trebuie interpretati pe trei niveluri complementare pentru a avea valoare reala in managementul academic. Primul nivel este nivelul descriptiv, unde profesorul vede ce se intampla acum, de exemplu cate cursuri are active si ce volum de studenti gestioneaza. Al doilea nivel este nivelul diagnostic, unde combinatia dintre feedback mediu, activitate recenta si distributia cursurilor pe status poate semnala probleme de pipeline, de engagement sau de calitate a continutului. Al treilea nivel este nivelul prescriptiv, unde sistemul de recomandari transforma aceste observatii in pasi concreti de executie, reducand intervalul dintre detectie si corectie.

Din perspectiva institutiei, aceiasi indicatori pot fi reinterpretati in scop de governance, de exemplu profileCompletion poate functiona ca indicator de conformitate profesionala, totalLessons poate indica adancimea de acoperire curriculara, iar averageFeedback poate fi folosit ca semnal de monitorizare a experientei de invatare la nivel de cohorta. Tocmai aceasta posibilitate de citire multi-nivel face ca dashboard-ul general profesor sa fie util nu doar individual, ci si organizational.

### 3.9 Extindere recomandata pentru dashboard-ul general profesor
Pentru extindere, dashboard-ul general profesor poate integra in mod nativ un strat de forecasting care sa estimeze riscul de scadere a engagement-ului in urmatoarele saptamani, un strat de comparatie intre perioade pentru a masura impactul schimbarilor de continut si un strat de alertare inteligenta care sa prioritizeze automat cursurile ce necesita interventie rapida. In aceeasi directie, se poate adauga un modul de obiective trimestriale pentru instructor, unde profesorul isi seteaza tinte pe publicare, finalizare, feedback sau participare, iar pagina urmareste progresul fata de aceste tinte cu semnale vizuale si notificari contextuale.

O alta extensie valoroasa este legatura directa intre dashboard-ul general si zonele de actiune, astfel incat fiecare recomandare sau fiecare card critic sa poata deschide imediat pagina de gestionare asociata, reducand numarul de click-uri dintre observatie si executie. Acest tip de integrare transforma dashboard-ul dintr-un centru de monitorizare intr-un centru de comanda complet, unde analiza si operarea sunt unite intr-un singur flux continuu.

---

## 4. Dashboard Elev pentru Cursuri (descriere extinsa)
Referinta implementare UI: apps/web/app/dashboard-elev/cursuri/page.tsx
Referinta API-uri:
- apps/web/app/api/dashboard/student/overview/route.ts
- apps/web/app/api/courses/public/route.ts
- apps/web/app/api/courses/enroll/route.ts

### 4.1 Rol functional
Pagina de cursuri din dashboard-ul elevului este gandita ca un hub de invatare continuu, in care utilizatorul poate trece natural de la descoperire la inscriere si apoi la executie, fara sa iasa din acelasi context operational. In loc sa separe artificial zona de consum de zona de catalog, pagina unifica cele doua perspective, astfel incat elevul vede simultan ce face deja si ce poate incepe imediat, iar aceasta continuitate reduce frictiunea decizionala si creste sansa ca utilizatorul sa porneasca urmatorul curs direct din dashboard.

### 4.2 Structura experientei si logica de interactiune
Partea superioara introduce contextul paginii prin titlu, semnal de sincronizare si un rezumat clar al scopului, apoi urmeaza zona KPI in care elevul primeste instant o radiografie a traseului sau educational, prin numarul de cursuri enrolled, numarul de cursuri active, numarul de cursuri finalizate si procentul mediu de progres total. Dupa aceasta zona de orientare rapida, sectiunea de cursuri enrolled devine zona principala de executie, pentru ca fiecare card de curs afiseaza informatii care raspund la intrebarile reale ale elevului: cat am facut, ce mi-a mai ramas, care este urmatoarea lectie si cand am avut ultima activitate.

In paralel, catalogul public este integrat in aceeasi pagina, ceea ce inseamna ca elevul poate compara imediat ceea ce parcurge cu ceea ce poate adauga in planul sau de invatare. Butonul de inscriere este gestionat dinamic, astfel incat starea fiecarui curs este afisata corect in functie de realitatea din baza de date, iar utilizatorul primeste feedback explicit pentru fiecare actiune, inclusiv atunci cand este deja inscris sau cand o cerere este in procesare. Sectiunea de camera online, chiar daca este momentan in stadiu de extindere, este pozitionata intentionat in flux, pentru a pregati traseul catre componenta live a platformei.

### 4.3 Flux enroll end-to-end si consistenta sesiunii
Mecanismul de enroll este implementat astfel incat sa fie robust in productie: elevul initiaza cererea din cardul de catalog, frontend-ul trimite POST catre endpoint-ul de enroll cu credentials include, iar serverul valideaza sesiunea pe baza cookie-ului semnat, rezolva contul elevului activ, confirma maparea in users si valideaza faptul ca acel curs este eligibil pentru inscriere, adica nu este in stadiu draft. Insertul in enrollments este idempotent, iar dupa raspunsul pozitiv frontend-ul face refresh de date, pentru ca pagina sa reflecte instant noua stare fara pas suplimentar din partea utilizatorului.

### 4.4 Sincronizare si tratare scenarii reale
Pentru a evita discrepantele dintre datele afisate si datele reale, pagina foloseste un model de revalidare multi-trigger, care combina polling periodic, refresh la focus si refresh la revenirea tab-ului in prim-plan, ceea ce ofera o experienta apropiata de realtime chiar si fara websocket obligatoriu. Acest model este important in special in scenarii in care apar cursuri noi publicate, inrolari recente sau modificari de progres facute din alte pagini. In plus, sunt tratate explicit scenariile de eroare, de sesiune invalida si de liste goale, astfel incat elevul nu ramane niciodata intr-o stare ambigua.

### 4.5 Valoare educationala si impact in retenție
Valoarea acestei pagini nu vine doar din UI, ci din felul in care ordoneaza comportamentul de invatare: elevul vede progresul, identifica urmatorul pas, descopera cursuri noi relevante si actioneaza imediat prin enroll, apoi continua din dashboard-ul dedicat cursului ales. Aceasta secventa compacta reduce abandonul dintre intentie si actiune si creeaza un flux de invatare coerent, in care utilizatorul are mereu claritate asupra directiei urmatoare.

---

## 5. Dashboard Profesor - Management Curs (descriere extinsa)
Referinta implementare UI: apps/web/app/dashboard-profesor-management/[courseId]/page.tsx
Referinta API: apps/web/app/api/dashboard/instructor/courses/[courseId]/management/route.ts

### 5.1 Rol strategic
Dashboard-ul de management curs pentru profesor este o consola dedicata executiei, proiectata pentru situatia in care instructorul nu mai are nevoie de o vedere globala asupra intregului cont, ci are nevoie sa conduca un singur curs cu precizie operationala ridicata. Diferenta fata de dashboard-ul general este ca aici analitica este contextualizata exclusiv pe cursul selectat, astfel incat fiecare metrica, fiecare grafic si fiecare lista de studenti poate fi transformata imediat intr-o decizie concreta de administrare, de la ajustarea continutului si pana la interventii asupra ritmului clasei.

### 5.2 Arhitectura navigatiei interne
Navigatia din sidebar este construita in jurul unui model de administrare complet, in care sectiunea General este nucleul analitic activ, iar sectiunile Grup chat, Module, Taskuri, Program si Catalog camera online reprezinta suprafete functionale care definesc directia de extindere a platformei catre un management academic end-to-end. Chiar daca nu toate sunt finalizate la acelasi nivel de adancime functionala, structura lor este deja prezenta ca design de sistem, ceea ce permite dezvoltare etapizata fara a rupe fluxul existent al profesorului.

### 5.3 Continutul sectiunii General
Sectiunea General este implementata cu un strat analitic dens, in care antetul cursului afiseaza identitatea academica a cursului, nivelul, vizibilitatea, durata estimata si momentul ultimei actualizari, iar imediat sub antet apar KPI-urile critice care masoara sanatatea operationala a clasei: volumul total de studenti, numarul de studenti activi, distributia lectiilor publicate fata de total, progresul mediu al clasei, rata de finalizare si scorul mediu de feedback. Aceste valori sunt dublate de reprezentari vizuale pe ferestre temporale relevante, inclusiv grafice pe 7 zile pentru enrollments si activitate, distributii de progres si de scor, plus analiza de timp de invatare pe 14 zile.

Pe langa aceste agregari, dashboard-ul aduce in prim-plan si date actionabile la nivel de continut si cohorta: top lectii dupa engagement, studenti recenti cu status si completion, precum si indicatori de tip pulse care ajuta profesorul sa inteleaga rapid ritmul clasei si sa depisteze zonele in care este nevoie de interventie. In acest sens, pagina functioneaza nu doar ca instrument de raportare, ci ca un centru tactic de management didactic.

### 5.4 Flux API, control acces si siguranta datelor
Fluxul backend urmeaza un traseu strict de securitate si proprietate: se valideaza header-ul de autorizare, se valideaza identitatea prin serviciul auth, se confirma rolul de instructor, se rezolva contul activ, se verifica maparea in users, apoi se incarca cursul solicitat si se verifica explicit faptul ca acel curs apartine profesorului curent. Abia dupa aceste verificari are loc agregarea efectiva a datelor din lessons, enrollments, progress si submissions, iar rezultatul este un payload consolidat care pastreaza izolarea contextului la nivel de courseId. Prin acest model, sistemul previne accesul lateral la datele altor cursuri si mentine consistenta intre drepturi si date expuse.

### 5.5 Directii de extindere pentru administrare avansata
Din perspectiva evolutiei produsului, acest dashboard este baza naturala pentru activarea tuturor sistemelor avansate cerute in administrarea unui curs, inclusiv catalog cu note si formule de calcul, chat de curs pe canale, management modular cu dependente intre lectii, assignment workflow, calendar academic si camera online cu prezenta si replay. Avantajul major este ca aceste extensii nu trebuie construite in afara paginii, deoarece structura de navigatie si modelul de agregare exista deja, iar implementarea lor poate continua incremental, pastrand acelasi model de experienta pentru profesor.

---

## 6. Sisteme de Administrare Curs (existente + roadmap complet)
Aceasta sectiune trebuie inteleasa ca o descriere de arhitectura functionala completa pentru administrarea de curs in DevAtlas, pentru ca nu vorbim despre un singur ecran sau despre un singur formular, ci despre un ecosistem de subsisteme care trebuie sa functioneze coerent intre ele, astfel incat profesorul sa poata planifica, construi, publica, urmari, corecta si imbunatati un curs fara sa iasa din cadrul operational al platformei, iar elevul sa primeasca o experienta previzibila, transparenta si consistenta pe tot ciclul educational, de la enroll si pana la evaluare finala.

### 6.1 Grup Chat Curs
Sistemul de grup chat la nivel de curs este gandit ca o infrastructura de comunicare academica permanenta care completeaza partea de continut, pentru ca in practica invatarea nu se intampla doar prin lectii, ci si prin clarificari, intrebari rapide, feedback contextual si anunturi operationale, iar pentru acest comportament real al utilizatorilor este necesar un spatiu dedicat pe fiecare curs, cu canale pe module, cu mesaje structurate pe topic, cu istoric cautabil si cu reguli de moderare clare. In starea actuala exista infrastructura de suport chat reutilizabila, insa extinderea naturala presupune introducerea camerelor de chat pentru curs, a permisiunilor pe rol didactic, a thread-urilor pentru discutii punctuale, a mention-urilor pentru alerte directionate, a pin-urilor pentru mesaje importante si a legaturii directe dintre conversatii si artefacte academice, astfel incat un mesaj din chat sa poata deschide un task, sa poata genera o notificare pe deadline sau sa poata fi atasat unei lectii ca explicatie suplimentara. Componenta tehnica trebuie sa includa transport realtime prin websocket, fallback polling pentru retele instabile, protectie anti-spam, limitare de frecventa pe utilizator, log de actiuni administrative si mecanism de arhivare pe sesiuni de curs, pentru ca in lipsa acestor straturi chat-ul devine rapid greu de administrat si pierde valoarea educationala.

### 6.2 Module si structurare continut
Sistemul de module este coloana vertebrala a designului curricular, iar scopul sau nu este doar sa grupeze vizual lectii, ci sa defineasca trasee pedagogice clare in care ordinea, dependentele si conditiile de progres sunt explicite, masurabile si usor de mentinut. In implementarea actuala exista baza relationala prin course_groups, course_group_members si course_assets, precum si puncte de intrare in interfata de creare, ceea ce permite evolutia catre un editor ierarhic complet in care profesorul compune structuri de tip folder -> modul -> curs -> sectiune -> lectie -> bloc, apoi configureaza dependente intre module, praguri de acces, reguli de publicare progresiva si conditii de finalizare. Pentru exploatare reala la scara, sistemul trebuie sa includa drag and drop cu persistenta ordinii, versionare de continut la nivel de modul si lectie, comparatie intre versiuni, rollback controlat, import/export de pachete educationale si validare automata a integritatii structurii, astfel incat modificarile sa nu rupă fluxurile de progres deja existente pentru elevi.

### 6.3 Catalog si note (gradebook)
Catalogul academic trebuie tratat ca un subsistem critic, deoarece aici se consolideaza evidenta oficiala a performantei elevului, iar orice decizie de nota are impact direct asupra credibilitatii platformei, asupra transparentei profesorului si asupra increderii studentului in procesul de evaluare. In stadiul curent exista intrari de navigare si sectiuni hint care valideaza directia de produs, iar implementarea completa trebuie sa ofere o matrice de evaluare pe curs in care randurile sunt elevi, coloanele sunt itemi de evaluare, iar fiecare celula contine scor, status, feedback si istoric de modificare, cu suport pentru ponderi, formule personalizate de calcul final, praguri de promovare, exceptii aprobate si politici de recuperare. Un gradebook matur trebuie sa ofere audit obligatoriu pentru fiecare editare, justificare text la schimbare de scor, export in formate standard, vedere dedicata elevului cu transparenta pe calcule si comentarii contextuale, plus integrare nativa cu taskuri, quiz-uri si activitate de curs, astfel incat profesorul sa nu introduca datele de doua ori in sisteme paralele.

### 6.4 Taskuri si assignment workflow
Sistemul de taskuri are rolul de a operationaliza invatarea practica, adica de a transforma continutul teoretic in livrabile verificabile, iar fluxul complet trebuie sa acopere intreg ciclul de viata al unei teme: definire, publicare, transmitere, evaluare, feedback, re-trimitere si inchidere. In interfata de profesor, taskul trebuie configurat cu deadline, punctaj maxim, tip de livrabil, rubrici de notare si criterii de calitate, iar in interfata elevului trebuie sa existe claritate asupra cerintei, asupra fisierelor acceptate, asupra timpului ramas si asupra statusului curent. Din perspectiva back-office, sunt necesare reguli de intarziere, penalizari configurabile, numar maxim de re-submisii, comparatie intre versiuni de raspuns, feedback inline si rapoarte de completare pe clasa, pentru ca taskurile devin principalul instrument de masurare a progresului aplicat in majoritatea cursurilor tehnice.

### 6.5 Program si calendar academic
Calendarul de curs nu este doar o lista de date, ci un sistem de coordonare temporala care sincronizeaza toate componentele operationale ale cursului, de la sesiuni live si Q&A, pana la examene, deadline-uri de task si publicari de module. In varianta completa, programul trebuie sa fie timezone-aware, sa permita invitatii automate, sa trimita remindere multicanal, sa detecteze conflicte de programare si sa ofere export standard catre calendare externe, astfel incat utilizatorii sa nu piarda evenimente importante doar pentru ca folosesc ecosisteme diferite. Pentru profesor, acest subsistem trebuie sa ofere vedere pe cohorta, vedere pe curs si vedere personala, iar pentru elev trebuie sa ofere o cronologie simpla, cu prioritizare pe urgenta si legaturi directe catre actiunea necesara, de exemplu intrare in camera online, deschidere task sau acces la material.

### 6.6 Camera online
Camera online reprezinta extensia sincronă a experientei de invatare si trebuie proiectata ca un mediu de interactiune didactica, nu doar ca un stream video simplu, ceea ce inseamna ca pe langa intrarea in sesiune trebuie sa existe prezenta, controlul participantilor, whiteboard, screen share, chat contextual, hand raise, evidenta participarii si mecanism de inregistrare cu replay indexat. In stadiul actual exista puncte functionale de integrare prin dashboard-uri, iar in stadiul final sistemul trebuie sa lege fiecare sesiune de curs, modul si tema, astfel incat activitatea live sa poata alimenta automat jurnalul de progres, catalogul de participare si recomandari ulterioare pentru studentii cu implicare redusa.

### 6.7 Administrare assets educationale
Sistemul de assets este responsabil de toate resursele media si documentare care sustin procesul educational, iar valoarea lui reala apare cand profesorul poate publica rapid fisiere corect validate, usor de cautat si usor de reutilizat in mai multe contexte de curs fara duplicare inutila. Modelul existent cu scope GROUP, COURSE si LESSON este o baza buna pentru organizare, iar extinderea recomandata include uploader robust cu validare MIME si dimensiune, previzualizare pentru formate uzuale, tagging semantic, versionare, reguli de retention, control de acces pe rol si monitorizare pentru fisiere inactive sau expuse inutil. Un astfel de subsistem reduce costul operational al mentenantei de continut si previne fragmentarea bibliotecii de materiale.

### 6.8 Workflow editorial complet
Workflow-ul editorial trebuie descris si implementat ca un traseu formal de guvernanta a continutului, in care fiecare etapa are intrari, iesiri, criterii de acceptare si responsabilitati clare, deoarece publicarea haotica a lectiilor produce inconsistente care afecteaza direct experienta elevului. Traseul recomandat include stadiul de draft pentru definirea structurii de baza, etapizarea pe module si lectii, atasarea de assets si evaluari, review intern de continut, verificare pedagogica, publicare controlata cu timestamp, monitorizare post-publicare prin feedback si analytics, apoi iteratii versionate fara pierdere de istoric. Prin acest model, platforma poate pastra echilibrul dintre viteza de livrare si calitate didactica.

### 6.9 Governance si audit
Pentru toate subsistemele de mai sus, governance-ul trebuie sa fie explicit si enforceable, adica rolurile sa fie clar delimitate, permisiunile sa fie aplicate la nivel de tabela si endpoint, actiunile sensibile sa fie logate cu actor si motiv, iar alertele operationale sa semnaleze automat evenimente critice, cum ar fi schimbari de ponderi in catalog, stergeri de note, inchideri de discutii importante sau modificari de reguli academice in timpul unui curs activ. Fara acest strat de guvernanta, cresterea platformei duce rapid la neclaritati de responsabilitate si la riscuri de integritate a datelor.

---

## 7. Arhitectura Aplicatiei (A la Z)

### 7.1 Tip arhitectura
Arhitectura DevAtlas este construita ca un monorepo modular in care frontend-ul, serviciile backend si stratul de date pot evolua independent, dar in acelasi timp raman integrate prin conventii comune de domeniu, ceea ce permite dezvoltare rapida fara a sacrifica separarea responsabilitatilor. In acest model, aplicatia web actioneaza ca interfata principala de produs si include un strat BFF prin route handlers, serviciile dedicate din zona Nest sunt pregatite pentru extinderi enterprise, iar Supabase furnizeaza un backend de date robust cu autentificare, politici RLS si query-uri relationale care pot alimenta dashboard-uri cu agregari complexe.

### 7.2 Structura workspace
Organizarea in apps/web, apps/api, apps/worker, packages/shared si supabase nu este doar o impartire de directoare, ci reflecta un contract de arhitectura in care fiecare pachet are scop operational clar: web pentru experienta utilizatorului si orchestration de request-uri, api pentru logica de domeniu care cere separare si testabilitate ridicata, worker pentru sarcini asincrone, shared pentru contracte comune si tipuri reutilizabile, iar supabase pentru schema oficiala a modelului relational. Aceasta structurare permite echipei sa scaleze pe fluxuri paralele, reducand conflictele dintre schimbari de UI, schimbari de business logic si schimbari de schema.

### 7.3 Frontend architecture
Stratul frontend este construit pe Next.js cu App Router, React si TypeScript, iar combinatia este potrivita pentru un produs cu multe dashboard-uri deoarece permite rutare predictibila, layout-uri compozabile si control fin al strategiei de fetch. Tailwind este folosit pentru consistenta de design, React Query pentru sincronizare si caching la nivel de date, Zustand pentru stari locale specializate, iar clientul Supabase pentru sesiune si interactiune cu identitatea utilizatorului. In plus, prezenta pachetelor pentru Monaco, Three.js si socket client arata o directie clara catre zone interactive avansate. Din punct de vedere de pattern, aplicatia foloseste stari standardizate loading/error/empty, segmentare pe sectiuni functionale si fetch no-store in zonele unde consistenta imediata este mai importanta decat economisirea request-urilor.

### 7.4 Backend/API architecture
Backend-ul operational actual este concentrat in route handlers din web, unde sunt implementate validari de sesiune, verificari de rol, agregari cross-table si raspunsuri compuse pentru dashboard-uri, iar aceasta abordare functioneaza eficient ca BFF intr-o etapa de crestere accelerata. In paralel, existenta proiectelor Nest API si worker pregateste terenul pentru externalizarea treptata a proceselor care devin prea grele sau prea sensibile pentru stratul de route handlers, cum ar fi joburi de procesare batch, websocket management dedicat, pipeline-uri de notificare si servicii analitice autonome.

### 7.5 Authentication si Authorization
Modelul de autentificare este hibrid si orientat pe roluri: elevul foloseste sesiune custom semnata in cookie, profesorul foloseste bearer token din sesiunea Supabase, iar fiecare endpoint aplica verificari explicite inainte de acces la date. Autorizarea nu se bazeaza pe presupuneri de UI, ci pe validare server side a rolului si, unde este cazul, pe verificarea ownership-ului la nivel de resursa, de exemplu curs apartinand profesorului curent. Acest model este completat de RLS in baza de date pentru tabelele critice, oferind un al doilea strat de protectie in cazul in care logica aplicatiei este ocolita.

### 7.6 Data architecture (Supabase/Postgres)
Modelul relational este extins si acopera toate zonele majore ale produsului: identitate, continut educational, evaluare, progres, gamification, suport si social, iar acest lucru permite construirea de agregari bogate fara denormalizare excesiva. Schema de baza include entitati pivot precum users, courses, lessons, enrollments, progress, submissions, notifications si audit_logs, iar extensiile specifice proiectului adauga domain-uri mature pentru instructor management, group-based course systems, ticketing, chat, friend requests si securitate student. Designul foloseste campuri jsonb acolo unde variabilitatea este mare, dar pastreaza coloane relationale pentru zonele unde integritatea trebuie garantata strict.

### 7.7 Data security
Securitatea datelor este construita pe mai multe straturi: service role key folosit exclusiv server side, verificari explicite de sesiune si rol in endpoint-uri, coduri de status clare pentru cazuri de neautorizare, token-uri cu TTL controlat si politici RLS pe tabele cu expunere sensibila. In plus, zonele de suport si administrare sunt proiectate cu componente de audit, astfel incat actiunile importante sa poata fi urmarite ulterior atat pentru troubleshooting, cat si pentru conformitate operationala.

### 7.8 Runtime si deployment
Fluxul de runtime este pregatit pentru dezvoltare multi-serviciu prin scripturi separate pentru web, api si worker, iar build-ul poate fi orchestrat din root, ceea ce simplifica procesele de CI/CD. Deployment-ul recomandat combina web pe Vercel, servicii backend containerizate si Supabase managed pentru baza de date si autentificare, oferind un echilibru bun intre viteza de lansare, cost operational si posibilitate de scalare.

### 7.9 Observabilitate
Observabilitatea trebuie tratata ca o functie de produs, nu ca un detaliu post-lansare, deoarece dashboard-urile si fluxurile academice sunt sensibile la intarzieri, inconsistente de sesiune si erori de agregare. De aceea, este necesara colectarea de logs structurate pe endpoint, monitorizare de erori pe route handlers, telemetrie pentru latenta si throughput, precum si metrici de business care coreleaza comportamentul utilizatorilor cu starea tehnica a platformei, de exemplu enroll success rate, active learners pe zi, rata de completare si timpi de rezolvare in suport.

### 7.10 Scalabilitate
Strategia de scalare recomandata este incrementala: separare treptata a serviciilor cu profil de incarcare diferit, caching selectiv pentru date publice sau semi-statice, cozi pentru operatii costisitoare si pipeline-uri batch pentru recalcul de analitice, astfel incat cresterea traficului sa nu afecteze experienta din dashboard-urile critice. In paralel, trebuie mentinuta disciplina contractelor API si a schemelor de date, pentru ca scalarea tehnica fara standardizare de domeniu produce fragmentare functionala.

---

## 8. API-uri Utilizate in Aplicatie (inventar extins)
Baza: apps/web/app/api

### 8.1 Account
- /api/account/settings
- /api/account/avatar
- /api/account/security
- /api/account/security/totp
- /api/account/security/pin
- /api/account/security/pin/reset

### 8.2 Auth Student
- /api/auth/students/session
- /api/auth/students/signin
- /api/auth/students/signin/confirm-2fa
- /api/auth/students/signout
- /api/auth/students/profile
- /api/auth/students/verification/send
- /api/auth/students/verification/confirm
- /api/auth/students/password-reset/request
- /api/auth/students/password-reset/confirm

### 8.3 Auth Instructor
- /api/auth/instructors/signin/challenge
- /api/auth/instructors/signin/confirm-2fa
- /api/auth/instructors/password-reset/request
- /api/auth/instructors/password-reset/confirm

### 8.4 Courses
- /api/courses/public
- /api/courses/enroll

### 8.5 Dashboard Student
- /api/dashboard/student/overview
- /api/dashboard/student/friends
- /api/dashboard/student/courses/[courseId]/dashboard

### 8.6 Dashboard Instructor
- /api/dashboard/instructor/overview
- /api/dashboard/instructor/network
- /api/dashboard/instructor/course-groups
- /api/dashboard/instructor/course-groups/[groupId]
- /api/dashboard/instructor/courses/[courseId]/management

### 8.7 Support
- /api/support/tickets
- /api/support/tickets/[ticketId]
- /api/support/tickets/[ticketId]/messages
- /api/support/tickets/[ticketId]/chat
- /api/support/chats/[shareToken]

### 8.8 Admin
- /api/admin/overview
- /api/admin/people
- /api/admin/instructors
- /api/admin/instructors/[instructorId]/activity
- /api/admin/friend-reports
- /api/admin/audit-logs
- /api/admin/support
- /api/admin/support/[ticketId]

### 8.9 Observatii API
Inventarul de endpoint-uri trebuie citit ca o harta functionala a produsului, in care fiecare familie de rute corespunde unui subdomeniu operational, iar coeziunea dintre aceste familii arata ca aplicatia este construita pe principii API-first, cu payload-uri orientate pe agregare pentru ecrane de dashboard si cu validari consistente de rol si sesiune pentru zonele sensibile. Endpoint-urile de account si auth gestioneaza identitatea si securitatea, endpoint-urile de courses si dashboard livreaza nucleul educational, endpoint-urile de support si admin sustin operarea platformei la nivel institutional, iar pattern-ul no-store folosit in multe rute critice sustine obiectivul de afisare a datelor cat mai aproape de starea reala din baza de date. In termeni de evolutie, aceasta structura este suficient de stabila pentru a permite adaugarea de capabilitati noi fara ruperea contractelor existente, daca se pastreaza disciplina de versionare si documentare a raspunsurilor.

---

## 9. Baza de Date - model complet si rationale

### 9.1 Enum-uri majore
Setul de enum-uri definit in schema initiala si in migrarile de extensie este esential pentru coerenta domeniului, deoarece transforma conventiile implicite in constrangeri explicite de date, reducand semnificativ riscul de stari invalide aparute din typo-uri sau din logica incompleta in aplicatie. Enum-urile pentru roluri, stari de utilizator, vizibilitate de curs, niveluri, tipuri de lectii, tipuri de blocuri, stari de enroll, tipuri de submission si tipuri de notificari functioneaza ca vocabular oficial al platformei, iar enum-urile din suport, chat, friend si securitate extind acest vocabular pentru operare avansata.

### 9.2 Entitati core education
Nucleul educational este construit in jurul lantului courses -> lessons -> lesson_blocks, completat de enrollments, progress, quizzes si submissions, iar aceasta combinatie permite reprezentarea completa a relatiei dintre continut, consum si evaluare. Practic, courses descriu unitatile academice majore, lessons definesc secventele de invatare, lesson_blocks permit compozitie flexibila de continut, progress masoara avansul granular, iar submissions captureaza performanta evaluabila. Componentele de gamification prin achievements si xp_ledger completeaza modelul cu mecanisme de motivare care pot fi corelate cu retentia si ritmul de invatare.

### 9.3 Entitati identity si roluri
Tabela users este pivotul identitatii la nivel de aplicatie, insa sistemul este extins cu student_accounts si instructor_accounts pentru onboarding specializat pe rol, ceea ce permite mentinerea unor fluxuri separate de verificare, status si operare pentru fiecare categorie de utilizator. instructor_profiles adauga stratul profesional necesar dashboard-urilor profesorilor, iar account_preferences permite personalizare de experienta, aspect relevant pentru adoptie pe termen lung si pentru ergonomia utilizarii zilnice.

### 9.4 Entitati support si comunitate
DevAtlas include un strat de suport formal prin support_tickets, support_messages, support_ticket_events si outbox de email, ceea ce inseamna ca incidentele pot fi urmarite end-to-end cu trasabilitate completa, dar include si un strat conversational prin support_chats si support_chat_messages pentru interactiuni mai rapide. In paralel, layer-ul social construit pe friend_requests, friend_blocks si friend_reports adauga mecanisme de comunitate si moderare, esentiale pentru un produs educational care evolueaza spre colaborare intre utilizatori.

### 9.5 Entitati de extensie pedagogica
Sistemul course_groups, course_group_members si course_assets introduce o dimensiune de orchestrare curriculara care depaseste modelul simplu curs-lectie, permitand organizare pe module, coordonare intre mai multi profesori si management al resurselor pe niveluri diferite de granularitate. Prezenta campurilor metadata si json in mai multe tabele sustine extensii rapide fara migrare destructiva, dar aceasta flexibilitate trebuie echilibrata prin validari de schema la nivel de aplicatie pentru a evita deriva semantica a datelor.

### 9.6 Integritate si performanta
Integritatea modelului este protejata prin chei unice pe relatii critice, constrangeri referentiale, trigger-e pentru actualizarea automata a timestamp-urilor si politici RLS pentru delimitarea accesului pe rol sau pe proprietate. Performanta este sustinuta prin indexare pe chei de cautare frecventa, pe statusuri operationale si pe coloane temporale folosite in dashboard-uri, iar aceasta combinatie permite query-uri agregate rapide chiar si in scenarii cu crestere de volum.

---

## 10. Arhitectura pe fluxuri functionale

### 10.1 Flux student sign-in si session management
Fluxul de autentificare pentru elev este proiectat pentru a combina usurinta de utilizare cu control strict de securitate, astfel incat utilizatorul trece prin challenge si confirmare 2FA, iar endpoint-ul de confirmare emite token-ul de sesiune semnat in cookie cu TTL controlat, dupa care toate rutele dedicate elevului valideaza acel token inainte de orice acces la date academice. Un detaliu critic in acest flux este sincronizarea dintre expirarea token-ului si expirarea cookie-ului, pentru ca desincronizarea produce stari false de autentificare, iar acest comportament afecteaza direct operatii sensibile precum enroll sau acces la dashboard.

### 10.2 Flux enroll
Fluxul de enroll este construit ca un traseu idempotent si tolerant la stari partiale, in care elevul initiaza inscrierea din catalog, clientul trimite cererea cu credentials include, serverul valideaza sesiunea si contul elevului, rezolva maparea catre users, verifica eligibilitatea cursului si executa inserarea doar daca relatia user-curs nu exista deja. Dupa raspuns, frontend-ul revalideaza datele de overview si de catalog, afisand un mesaj explicit pentru succes, deja inscris sau eroare, ceea ce mentine claritatea interactionala si previne duplicate operationale.

### 10.3 Flux dashboard profesor
In fluxul dashboard-ului profesor, clientul extrage access token-ul din sesiunea activa Supabase si il transmite in authorization header catre endpoint-urile de overview si management, iar backend-ul aplica in ordine verificarea identitatii, validarea rolului si validarea ownership-ului acolo unde resursa este privata, apoi agregheaza datele din mai multe tabele pentru a genera payload-uri orientate pe decizie, nu pe CRUD fragmentat. Acest design reduce numarul de request-uri din UI si permite randare rapida a componentelor de tip KPI, grafice, liste de studenti si recomandari.

### 10.4 Flux suport ticketing si chat
Fluxul de suport incepe cu crearea ticket-ului, continua cu generarea automata a identificatorului public, apoi foloseste mesageria asociata pentru actualizarea activitatii si jurnalizarea evenimentelor de status, prioritate si atribuire, astfel incat fiecare caz sa poata fi urmarit complet din perspectiva operationala. Pentru cazurile care necesita interactiune rapida, mecanismul de share token permite conectarea unei sesiuni de chat dedicate, fara a compromite trasabilitatea ticket-ului principal.

---

## 11. Roadmap Tehnic pentru Zonele Incomplet Implementate

### 11.1 Faza 1 - Completare module vizibile in dashboard management
Prima faza trebuie sa livreze functionalitatile deja vizibile in navigatie, astfel incat structura promisa utilizatorului sa devina complet operationala, iar prioritatea este implementarea end-to-end pentru chat de curs, editor modular cu ordonare vizuala, taskuri cu evaluare, calendar academic si catalog de note, toate integrate cu aceleasi modele de autentificare, autorizare si audit deja folosite in zonele mature ale platformei. Obiectivul acestei faze este reducerea decalajului dintre suprafata de produs si adancimea de executie.

### 11.2 Faza 2 - Automatizari pedagogice
A doua faza adauga stratul de inteligenta operationala prin recommendation engine orientat pe performanta, scoruri de risc pentru abandon si alerte automate pe termene limita, astfel incat platforma sa nu mai fie doar reactiva, ci sa devina proactiva in raport cu comportamentul elevului si cu nevoile profesorului. In aceasta etapa este importanta introducerea unor reguli explicabile, pentru ca recomandarea sa fie transparenta si usor de justificat in context educational.

### 11.3 Faza 3 - Realtime si colaborare
A treia faza consolideaza componenta colaborativa prin websocket pentru chat, progres si sesiuni live, prezenta in camera online si mecanisme interne de sincronizare intre panouri, astfel incat modificarile importante sa fie vizibile imediat pentru actorii relevanti. Aceasta faza reduce latenta informationala si imbunatateste semnificativ experienta in scenariile cu interactiune intensa.

### 11.4 Faza 4 - Analytics avansat
A patra faza transforma datele operationale in insight strategic prin analize pe cohorte, funnel-uri complete de invatare, comparatii intre module, cursuri si profesori, plus componente predictive pentru detectia timpurie a riscurilor academice. Scopul este trecerea de la monitorizare descriptiva la management bazat pe predictie si optimizare continua.

---

## 12. Riscuri, controale si recomandari

### 12.1 Riscuri
Principalele riscuri tehnice si operationale apar in zonele unde datele trec prin mai multe mape de identitate, unde dashboard-urile afiseaza agregari sensibile la sincronizare si unde sistemele de evaluare pot fi modificate fara trasabilitate suficienta, iar aceste riscuri pot afecta direct increderea utilizatorilor daca nu sunt tratate preventiv. Divergenta dintre conturile de rol si tabela users, inconsistentele la refresh in pagini cu date volatile, cresterea necontrolata a complexitatii in catalog si note, respectiv configurarea incompleta a politicilor RLS sunt riscuri sistemice care trebuie monitorizate activ, nu doar reactivate dupa incident.

### 12.2 Controale recomandate
Controlul eficient cere combinarea testarii automate cu reguli stricte de validare si audit: teste de contract pentru endpoint-uri agregate, teste end-to-end pe fluxurile critice de enrollment si permisiuni, validari de input cu scheme explicite, jurnalizare obligatorie pentru modificarile academice sensibile si monitorizare a anomaliilor de autorizare, in special varfuri de 401 si 403 pe rute administrative. In plus, este recomandata introducerea de revizuiri periodice ale politicilor RLS si de verificari de consistenta intre schema reala si contractele de aplicatie.

### 12.3 KPI de produs recomandati
KPI-urile trebuie sa acopere simultan performanta educationala si performanta operationala, pentru ca doar combinatia dintre cele doua ofera imaginea reala a sanatatii platformei. Indicatorii de baza includ rata de conversie la enroll, numarul de elevi activi pe zi, media de completare a cursurilor, timpul median pana la prima lectie parcursa, timpul de rezolvare a solicitarilor de suport si viteza de productie de continut a profesorilor, iar interpretarea lor in serie temporala permite detectia timpurie a regresiilor de produs.

---

## 13. Concluzie
Platforma DevAtlas are o fundatie tehnica suficient de matura pentru a sustine tranzitia de la un LMS modern catre un ecosistem complet de management al invatarii, deoarece combina deja dashboard-uri bazate pe date reale, model relational consistent, fluxuri robuste de autentificare si autorizare, plus infrastructura extinsa pentru suport, comunitate si administrare de continut. Diferentiatorul major este faptul ca structura de produs este gandita modular, iar zonele inca nefinalizate sunt deja prefigurate in navigatie, in schema de date si in contractele API, ceea ce reduce riscul de rework major in fazele urmatoare.

Prin extinderea etapizata a sistemelor de catalog, note, chat de curs, taskuri, program si camera online, completata de automatizari pedagogice, realtime colaborativ si analytics avansat, DevAtlas poate evolua intr-un Learning Operating System in care componentele academice, operationale si analitice functioneaza unitar, iar deciziile profesorilor si ale administratorilor sunt sustinute permanent de date, nu doar de intuitie.

---

## 14. Bibliografie Extinsa (minim 50 resurse)
Lista include documentatie oficiala, standarde, ghiduri de arhitectura, securitate, baze de date si bune practici relevante pentru DevAtlas.

1. Next.js Documentation - https://nextjs.org/docs
2. Next.js App Router - https://nextjs.org/docs/app
3. Next.js Route Handlers - https://nextjs.org/docs/app/building-your-application/routing/route-handlers
4. React Documentation - https://react.dev
5. TypeScript Handbook - https://www.typescriptlang.org/docs/
6. Tailwind CSS Documentation - https://tailwindcss.com/docs
7. Supabase Docs - https://supabase.com/docs
8. Supabase Auth - https://supabase.com/docs/guides/auth
9. Supabase Row Level Security - https://supabase.com/docs/guides/auth/row-level-security
10. Supabase Postgres - https://supabase.com/docs/guides/database
11. PostgreSQL Documentation - https://www.postgresql.org/docs/
12. PostgreSQL JSON Types - https://www.postgresql.org/docs/current/datatype-json.html
13. PostgreSQL Indexes - https://www.postgresql.org/docs/current/indexes.html
14. PostgreSQL Triggers - https://www.postgresql.org/docs/current/triggers.html
15. PostgreSQL Constraints - https://www.postgresql.org/docs/current/ddl-constraints.html
16. RFC 7519 (JWT) - https://www.rfc-editor.org/rfc/rfc7519
17. OWASP Top 10 - https://owasp.org/www-project-top-ten/
18. OWASP ASVS - https://owasp.org/www-project-application-security-verification-standard/
19. NIST Digital Identity Guidelines - https://pages.nist.gov/800-63-3/
20. NestJS Documentation - https://docs.nestjs.com
21. NestJS Security - https://docs.nestjs.com/security/authentication
22. NestJS WebSockets - https://docs.nestjs.com/websockets/gateways
23. Node.js Documentation - https://nodejs.org/docs/latest/api/
24. BullMQ Guide - https://docs.bullmq.io/
25. Redis Documentation - https://redis.io/docs/
26. Zod Documentation - https://zod.dev
27. TanStack Query Docs - https://tanstack.com/query/latest
28. Zustand Documentation - https://zustand-demo.pmnd.rs/
29. Monaco Editor Docs - https://microsoft.github.io/monaco-editor/
30. Three.js Documentation - https://threejs.org/docs/
31. Socket.IO Docs - https://socket.io/docs/v4/
32. MDN Fetch API - https://developer.mozilla.org/docs/Web/API/Fetch_API
33. MDN HTTP Status Codes - https://developer.mozilla.org/docs/Web/HTTP/Status
34. Vercel Documentation - https://vercel.com/docs
35. Docker Documentation - https://docs.docker.com/
36. Kubernetes Documentation - https://kubernetes.io/docs/home/
37. OpenTelemetry Docs - https://opentelemetry.io/docs/
38. Prometheus Documentation - https://prometheus.io/docs/
39. Grafana Documentation - https://grafana.com/docs/
40. Sentry Docs - https://docs.sentry.io/
41. Google reCAPTCHA Docs - https://developers.google.com/recaptcha
42. Stripe Security Best Practices - https://stripe.com/docs/security
43. Cloudflare Learning Center - https://www.cloudflare.com/learning/
44. RFC 7231 HTTP/1.1 Semantics - https://www.rfc-editor.org/rfc/rfc7231
45. RFC 9110 HTTP Semantics - https://www.rfc-editor.org/rfc/rfc9110
46. ISO/IEC 25010 Software Quality Model (overview) - https://iso25000.com/index.php/en/iso-25000-standards/iso-25010
47. WCAG Overview (W3C) - https://www.w3.org/WAI/standards-guidelines/wcag/
48. WAI-ARIA Authoring Practices - https://www.w3.org/WAI/ARIA/apg/
49. Prisma Docs - https://www.prisma.io/docs
50. ESLint Docs - https://eslint.org/docs/latest/
51. Prettier Docs - https://prettier.io/docs/en/
52. Conventional Commits - https://www.conventionalcommits.org/
53. Twelve-Factor App - https://12factor.net/
54. Martin Fowler - Microservices - https://martinfowler.com/articles/microservices.html
55. Martin Fowler - Event Sourcing - https://martinfowler.com/eaaDev/EventSourcing.html
56. Microsoft Azure Well-Architected Framework - https://learn.microsoft.com/azure/architecture/framework/
57. AWS Well-Architected Framework - https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html
58. Google Cloud Architecture Framework - https://cloud.google.com/architecture/framework
59. NGINX Documentation - https://nginx.org/en/docs/
60. Caddy Documentation - https://caddyserver.com/docs/

### 14.1 Resurse recomandate direct pentru componenta educationala
61. IMS Global Learning Tools Interoperability (LTI) - https://www.imsglobal.org/activity/learning-tools-interoperability
62. xAPI Specification Overview - https://xapi.com/overview/
63. SCORM Overview - https://scorm.com/scorm-explained/
64. Bloom's Taxonomy (reference) - https://cft.vanderbilt.edu/guides-sub-pages/blooms-taxonomy/
65. Kirkpatrick Model (training evaluation) - https://www.kirkpatrickpartners.com/the-kirkpatrick-model/

### 14.2 Resurse recomandate pentru securitate aplicatii educationale
66. OWASP Cheat Sheet Series - https://cheatsheetseries.owasp.org/
67. Web Security Testing Guide - https://owasp.org/www-project-web-security-testing-guide/
68. CIS Benchmarks - https://www.cisecurity.org/cis-benchmarks
69. MITRE ATT&CK - https://attack.mitre.org/
70. ENISA Threat Landscape - https://www.enisa.europa.eu/topics/threat-risk-management/threats-and-trends

### 14.3 Resurse recomandate pentru data analytics si observabilitate
71. Apache Superset Docs - https://superset.apache.org/docs/intro
72. Metabase Docs - https://www.metabase.com/docs/latest/
73. dbt Documentation - https://docs.getdbt.com/
74. ClickHouse Docs - https://clickhouse.com/docs
75. Apache Airflow Docs - https://airflow.apache.org/docs/

---

## 15. Nota Finala de Implementare
Acest document include:
- analiza pe implementarea curenta reala;
- directii arhitecturale si functionale pentru modulele inca incomplete;
- un cadru complet pentru continuarea proiectului in regim academic, tehnic si operational.

Poate fi folosit direct ca baza pentru capitole de documentatie tehnica, raport de proiect, lucrare de diploma sau handoff pentru echipa de dezvoltare.
