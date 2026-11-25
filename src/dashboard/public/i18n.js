// ── Dashboard translations ────────────────────────
// English is the source text inside index.html. Elements marked with
// data-i18n="key" (text) or data-i18n-html="key" (HTML) get swapped for the
// chosen language. Missing keys simply stay English, so pages can be
// translated step by step.

const I18N_LANGS = {
  de: { name: 'Deutsch',  flag: '<svg viewBox="0 0 5 3" preserveAspectRatio="none"><rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#DD0000"/><rect y="2" width="5" height="1" fill="#FFCE00"/></svg>' },
  en: { name: 'English',  flag: '<svg viewBox="0 0 19 13" preserveAspectRatio="none"><rect width="19" height="13" fill="#B22234"/><g fill="#fff"><rect y="1" width="19" height="1"/><rect y="3" width="19" height="1"/><rect y="5" width="19" height="1"/><rect y="7" width="19" height="1"/><rect y="9" width="19" height="1"/><rect y="11" width="19" height="1"/></g><rect width="7.6" height="7" fill="#3C3B6E"/><g fill="#fff"><circle cx="1.3" cy="1.2" r=".35"/><circle cx="3.8" cy="1.2" r=".35"/><circle cx="6.3" cy="1.2" r=".35"/><circle cx="2.55" cy="2.9" r=".35"/><circle cx="5.05" cy="2.9" r=".35"/><circle cx="1.3" cy="4.6" r=".35"/><circle cx="3.8" cy="4.6" r=".35"/><circle cx="6.3" cy="4.6" r=".35"/><circle cx="2.55" cy="6.2" r=".35"/><circle cx="5.05" cy="6.2" r=".35"/></g></svg>' },
  fr: { name: 'Français', flag: '<svg viewBox="0 0 3 2" preserveAspectRatio="none"><rect width="1" height="2" fill="#0055A4"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#EF4135"/></svg>' },
  ru: { name: 'Русский',  flag: '<svg viewBox="0 0 3 3" preserveAspectRatio="none"><rect width="3" height="1" fill="#fff"/><rect y="1" width="3" height="1" fill="#0039A6"/><rect y="2" width="3" height="1" fill="#D52B1E"/></svg>' },
  es: { name: 'Español',  flag: '<svg viewBox="0 0 4 4" preserveAspectRatio="none"><rect width="4" height="4" fill="#AA151B"/><rect y="1" width="4" height="2" fill="#F1BF00"/></svg>' },
};
const I18N_ORDER = ['de', 'en', 'fr', 'ru', 'es'];

const I18N = {
  de: {
    'lang.label': 'Sprache',
    'nav.general': 'Allgemein', 'nav.account': 'Konto', 'nav.engagement': 'Interaktion',
    'nav.applications': 'Bewerbungen', 'nav.server': 'Server', 'nav.roles': 'Rollen',
    'nav.modsafety': 'Moderation & Sicherheit', 'nav.tickets': 'Tickets', 'nav.logs': 'Logs',
    'page.overview': 'Übersicht', 'page.settings': 'Einstellungen', 'page.commands': 'Befehle',
    'page.premium': 'Premium', 'page.leveling': 'Leveling', 'page.activity': 'Aktivität',
    'page.polls': 'Umfragen', 'page.autoresponses': 'Automatische Antworten',
    'page.applications': 'Bewerbungen', 'page.greetings': 'Willkommen & Abschied',
    'page.membercounters': 'Mitgliederzähler', 'page.autorole': 'Autorollen',
    'page.reactionroles': 'Reaktionsrollen', 'page.moderators': 'Moderatoren',
    'page.security': 'Anti-Nuke', 'page.verification': 'Verifizierung',
    'page.tickets': 'Tickets', 'page.transcripts': 'Transkripte',
    'page.logs': 'Log-Kanäle', 'page.botlogs': 'Bot-Logs',
    'footer.support': 'Support-Server', 'footer.logout': 'Abmelden', 'guild.select': 'Server auswählen',
    'save.changes': 'Änderungen speichern', 'save.discard': 'Verwerfen',
    'save.warn': 'Du hast ungespeicherte Änderungen. Speichere oder verwirf sie zuerst.',
    'h.settings': 'Server-Einstellungen', 'h.tickets': 'Ticket-System', 'h.security': 'Anti-Nuke & Sicherheit',
    'sub.overview': 'Dein All-in-One-Dashboard für Moderation, Leveling, Tickets und mehr.',
    'sub.premium': 'Verwalte dein ZenByte-Premium-Abo und wähle aus, welche Server deine Slots nutzen.',
    'sub.commands': 'Alle Befehle, die der Bot geladen hat, live erzeugt und nichts fest einprogrammiert.',
    'sub.applications': 'Erstelle Bewerbungsformulare, prüfe Einsendungen und lege fest, wo alles gepostet wird.',
    'sub.membercounters': 'Zeige Live-Serverstatistiken als automatisch aktualisierte Kanalnamen. Discord begrenzt Umbenennungen, deshalb werden die Zähler alle paar Minuten aktualisiert.',
    'sub.settings': 'Allgemeine Optionen dafür, wie sich der Bot auf diesem Server verhält.',
    'sub.logs': 'Weise jedem Log-Typ einen Discord-Kanal zu. Stelle <em>None</em> ein, um ihn zu deaktivieren.',
    'sub.tickets': 'Richte das Ticket-Panel, die Kanäle und die verfügbaren Ticket-Typen ein.',
    'sub.leveling': 'XP, Level-Belohnungen, Multiplikatoren, Bestenlisten und Rangkarten, alles komplett anpassbar.',
    'sub.activity': 'Erfasse die Aktivität der Mitglieder (Nachrichten, Sprachzeit und Reaktionen) mit einem gewichteten Aktivitätswert.',
    'sub.trust': 'Ein einheitlicher Wert von 0 bis 100 pro Mitglied, zusammengesetzt aus Kontoalter, Zeit auf dem Server, Aktivität, Level, Verifizierung und Verwarnungen.',
    'sub.moderators': 'Rollen und Mitglieder hier können Mod-Befehle (Verwarnen, Timeout, Ticket-Tools) nutzen, ohne volle Administratorrechte zu haben.',
    'sub.security': 'Erkennt massenhaft zerstörerische Admin-Aktionen und bestraft sie automatisch. Standardmäßig deaktiviert. Prüfe die Limits, bevor du es aktivierst.',
    'sub.greetings': 'Begrüße neue Mitglieder und poste eine Nachricht, wenn jemand den Server verlässt. Wähle den Kanal und gestalte die Nachricht als einfachen Text oder als komplettes Embed.',
    'sub.verification': 'Neue Mitglieder müssen ein Captcha lösen, bevor sie Zugriff bekommen.',
    'sub.autorole': 'Rollen, die automatisch vergeben werden, sobald jemand dem Server beitritt.',
    'sub.reactionroles': 'Lass Mitglieder sich selbst Rollen geben, indem sie auf eine Nachricht reagieren. Der Bot kann die Nachricht für dich posten, oder du gibst eine bestehende an.',
    'sub.autoresponses': 'Antworte automatisch, wenn eine Nachricht zu einem Auslöser passt. Wähle aus, wie der Auslöser geprüft wird, und antworte dann mit einfachem Text oder einem Embed, das du direkt hier baust.',
    'sub.social': 'Poste eine Nachricht auf deinem Server, wenn ein Creator live geht oder etwas hochlädt. YouTube, Reddit und Kick funktionieren ohne Einrichtung, Twitch braucht kostenlose API-Schlüssel in der .env-Datei des Bots.',
    'sub.polls': 'Erstelle Umfragen, poste sie direkt in einen Kanal und verfolge die Ergebnisse. Mitglieder stimmen über ein Menü in der Umfrage ab, und du kannst Umfragen hier jederzeit beenden, abbrechen oder ansehen.',
    'sub.altdetect': 'Bewertet neue Mitglieder anhand typischer Merkmale von Wegwerf-Accounts, markiert wahrscheinliche Zweitaccounts zur Prüfung durch Moderatoren und kann optional automatisch handeln. Keine Methode ist sicher, also stelle die Empfindlichkeit so ein, dass Treffer und Fehlalarme im Gleichgewicht sind.',
    'sub.transcripts': 'Durchsuche und lies vergangene Ticket-Gespräche, Bilder werden direkt angezeigt.',
    'sub.botlogs': 'Neueste Einträge aus den PM2-Logdateien.',
  },
  fr: {
    'lang.label': 'Langue',
    'nav.general': 'Général', 'nav.account': 'Compte', 'nav.engagement': 'Engagement',
    'nav.applications': 'Candidatures', 'nav.server': 'Serveur', 'nav.roles': 'Rôles',
    'nav.modsafety': 'Modération et sécurité', 'nav.tickets': 'Tickets', 'nav.logs': 'Logs',
    'page.overview': "Vue d'ensemble", 'page.settings': 'Paramètres', 'page.commands': 'Commandes',
    'page.premium': 'Premium', 'page.leveling': 'Niveaux', 'page.activity': 'Activité',
    'page.polls': 'Sondages', 'page.autoresponses': 'Réponses automatiques',
    'page.applications': 'Candidatures', 'page.greetings': 'Bienvenue et départ',
    'page.membercounters': 'Compteurs de membres', 'page.autorole': 'Rôles automatiques',
    'page.reactionroles': 'Rôles par réaction', 'page.moderators': 'Modérateurs',
    'page.security': 'Anti-Nuke', 'page.verification': 'Vérification',
    'page.tickets': 'Tickets', 'page.transcripts': 'Transcriptions',
    'page.logs': 'Salons de logs', 'page.botlogs': 'Logs du bot',
    'footer.support': "Serveur d'assistance", 'footer.logout': 'Déconnexion', 'guild.select': 'Choisir un serveur',
    'save.changes': 'Enregistrer les modifications', 'save.discard': 'Annuler',
    'save.warn': "Vous avez des modifications non enregistrées. Enregistrez-les ou annulez-les d'abord.",
    'h.settings': 'Paramètres du serveur', 'h.tickets': 'Système de tickets', 'h.security': 'Anti-Nuke et sécurité',
    'sub.overview': 'Votre tableau de bord tout-en-un pour la modération, les niveaux, les tickets et plus encore.',
    'sub.premium': 'Gérez votre abonnement ZenByte Premium et choisissez les serveurs qui utilisent vos emplacements.',
    'sub.commands': 'Toutes les commandes chargées par le bot, générées en direct, sans rien de codé en dur.',
    'sub.applications': 'Créez des formulaires de candidature, examinez les réponses et choisissez où tout est publié.',
    'sub.membercounters': 'Affichez les statistiques du serveur en direct dans des noms de salons mis à jour automatiquement. Discord limite les renommages, les compteurs sont donc actualisés toutes les quelques minutes.',
    'sub.settings': 'Options générales du comportement du bot sur ce serveur.',
    'sub.logs': 'Attribuez un salon Discord à chaque type de log. Choisissez <em>None</em> pour le désactiver.',
    'sub.tickets': 'Configurez le panneau de tickets, les salons et les types disponibles.',
    'sub.leveling': 'XP, récompenses de niveau, multiplicateurs, classements et cartes de rang, entièrement configurables.',
    'sub.activity': "Suivez l'engagement des membres (messages, temps en vocal et réactions) grâce à un score d'activité pondéré.",
    'sub.trust': "Un score unique de 0 à 100 par membre, combinant l'âge du compte, l'ancienneté sur le serveur, l'activité, le niveau, la vérification et les avertissements.",
    'sub.moderators': 'Les rôles et membres ajoutés ici peuvent utiliser les commandes de modération (avertissement, exclusion temporaire, outils de tickets) sans être administrateurs.',
    'sub.security': "Détecte et sanctionne automatiquement les actions d'administration destructrices en masse. Désactivé par défaut. Vérifiez les limites avant de l'activer.",
    'sub.greetings': "Accueillez les nouveaux membres et publiez un message lorsque quelqu'un part. Choisissez le salon et rédigez le message en texte simple ou sous forme d'embed complet.",
    'sub.verification': "Exigez des nouveaux membres qu'ils résolvent un captcha avant d'obtenir l'accès.",
    'sub.autorole': "Rôles attribués automatiquement dès qu'une personne rejoint le serveur.",
    'sub.reactionroles': "Permettez aux membres de s'attribuer des rôles en réagissant à un message. Le bot peut publier le message pour vous, ou vous pouvez indiquer un message existant.",
    'sub.autoresponses': "Répondez automatiquement lorsqu'un message correspond à un déclencheur. Choisissez comment le déclencheur est détecté, puis répondez en texte simple ou avec un embed créé directement ici.",
    'sub.social': "Publiez un message sur votre serveur lorsqu'un créateur lance un live ou publie du contenu. YouTube, Reddit et Kick fonctionnent sans configuration ; Twitch nécessite des clés API gratuites dans le fichier .env du bot.",
    'sub.polls': 'Créez des sondages, publiez-les directement dans un salon et suivez les résultats. Les membres votent via un menu sur le message du sondage ; vous pouvez terminer, annuler ou consulter les sondages ici à tout moment.',
    'sub.altdetect': "Évalue les nouveaux membres selon des critères typiques des comptes jetables, signale les comptes secondaires probables aux modérateurs et peut agir automatiquement si vous le souhaitez. Aucune méthode n'est infaillible : ajustez la sensibilité pour équilibrer détections et faux positifs.",
    'sub.transcripts': 'Parcourez et lisez les anciennes conversations de tickets, avec les images affichées directement.',
    'sub.botlogs': 'Entrées récentes des fichiers de logs PM2.',
  },
  ru: {
    'lang.label': 'Язык',
    'nav.general': 'Общее', 'nav.account': 'Аккаунт', 'nav.engagement': 'Вовлечённость',
    'nav.applications': 'Заявки', 'nav.server': 'Сервер', 'nav.roles': 'Роли',
    'nav.modsafety': 'Модерация и безопасность', 'nav.tickets': 'Тикеты', 'nav.logs': 'Логи',
    'page.overview': 'Обзор', 'page.settings': 'Настройки', 'page.commands': 'Команды',
    'page.premium': 'Premium', 'page.leveling': 'Уровни', 'page.activity': 'Активность',
    'page.polls': 'Опросы', 'page.autoresponses': 'Автоответы',
    'page.applications': 'Заявки', 'page.greetings': 'Приветствие и прощание',
    'page.membercounters': 'Счётчики участников', 'page.autorole': 'Автороли',
    'page.reactionroles': 'Роли за реакции', 'page.moderators': 'Модераторы',
    'page.security': 'Anti-Nuke', 'page.verification': 'Верификация',
    'page.tickets': 'Тикеты',
    'page.logs': 'Каналы логов', 'page.botlogs': 'Логи бота',
    'footer.support': 'Сервер поддержки', 'footer.logout': 'Выйти', 'guild.select': 'Выберите сервер',
    'save.changes': 'Сохранить изменения', 'save.discard': 'Отменить',
    'save.warn': 'У вас есть несохранённые изменения. Сначала сохраните или отмените их.',
    'h.settings': 'Настройки сервера', 'h.tickets': 'Система тикетов', 'h.security': 'Anti-Nuke и безопасность',
    'sub.overview': 'Ваша универсальная панель для модерации, уровней, тикетов и многого другого.',
    'sub.premium': 'Управляйте подпиской ZenByte Premium и выбирайте, какие серверы используют ваши слоты.',
    'sub.commands': 'Все команды, загруженные ботом, формируются в реальном времени, без жёстко заданных значений.',
    'sub.applications': 'Создавайте формы заявок, просматривайте ответы и выбирайте, куда всё будет публиковаться.',
    'sub.membercounters': 'Показывайте статистику сервера в реальном времени в названиях каналов, которые обновляются автоматически. Discord ограничивает переименования, поэтому счётчики обновляются раз в несколько минут.',
    'sub.settings': 'Общие настройки поведения бота на этом сервере.',
    'sub.logs': 'Назначьте канал Discord для каждого типа логов. Выберите <em>None</em>, чтобы отключить.',
    'sub.tickets': 'Настройте панель тикетов, каналы и доступные типы.',
    'sub.leveling': 'Опыт, награды за уровни, множители, таблицы лидеров и карточки ранга, всё полностью настраивается.',
    'sub.activity': 'Отслеживайте активность участников (сообщения, время в голосовых каналах и реакции) с помощью взвешенного показателя активности.',
    'sub.trust': 'Единый показатель от 0 до 100 для каждого участника, учитывающий возраст аккаунта, стаж на сервере, активность, уровень, верификацию и предупреждения.',
    'sub.moderators': 'Роли и участники из этого списка могут использовать команды модерации (предупреждения, тайм-аут, инструменты тикетов) без полных прав администратора.',
    'sub.security': 'Обнаруживает массовые разрушительные действия администраторов и автоматически наказывает за них. По умолчанию отключено. Проверьте лимиты перед включением.',
    'sub.greetings': 'Приветствуйте новых участников и публикуйте сообщение, когда кто-то уходит. Выберите канал и оформите сообщение обычным текстом или полноценным эмбедом.',
    'sub.verification': 'Новые участники должны пройти капчу, прежде чем получат доступ.',
    'sub.autorole': 'Роли, которые выдаются автоматически, как только кто-то заходит на сервер.',
    'sub.reactionroles': 'Позвольте участникам самим получать роли, ставя реакции на сообщение. Бот может опубликовать сообщение за вас, или вы можете указать уже существующее.',
    'sub.autoresponses': 'Автоматически отвечайте, когда сообщение совпадает с триггером. Выберите способ сравнения с триггером, а затем ответьте обычным текстом или эмбедом, созданным прямо здесь.',
    'sub.social': 'Публикуйте сообщение на сервере, когда автор начинает стрим или выкладывает что-то новое. YouTube, Reddit и Kick работают без настройки, а для Twitch нужны бесплатные API-ключи в файле .env бота.',
    'sub.polls': 'Создавайте опросы, публикуйте их сразу в канал и следите за результатами. Участники голосуют через меню в сообщении с опросом, а вы можете в любой момент завершить, отменить или просмотреть опросы здесь.',
    'sub.altdetect': 'Оценивает новых участников по признакам одноразовых аккаунтов, отмечает вероятные твинки для проверки модераторами и при желании действует автоматически. Ни один метод не даёт полной уверенности, поэтому настройте чувствительность так, чтобы сбалансировать обнаружения и ложные срабатывания.',
    'sub.transcripts': 'Просматривайте и читайте прошлые переписки в тикетах, изображения отображаются прямо в тексте.',
    'sub.botlogs': 'Последние записи из лог-файлов PM2.',
  },
  es: {
    'lang.label': 'Idioma',
    'nav.general': 'General', 'nav.account': 'Cuenta', 'nav.engagement': 'Participación',
    'nav.applications': 'Solicitudes', 'nav.server': 'Servidor', 'nav.roles': 'Roles',
    'nav.modsafety': 'Moderación y seguridad', 'nav.tickets': 'Tickets', 'nav.logs': 'Registros',
    'page.overview': 'Resumen', 'page.settings': 'Configuración', 'page.commands': 'Comandos',
    'page.premium': 'Premium', 'page.leveling': 'Niveles', 'page.activity': 'Actividad',
    'page.polls': 'Encuestas', 'page.autoresponses': 'Respuestas automáticas',
    'page.applications': 'Solicitudes', 'page.greetings': 'Bienvenida y despedida',
    'page.membercounters': 'Contadores de miembros', 'page.autorole': 'Roles automáticos',
    'page.reactionroles': 'Roles por reacción', 'page.moderators': 'Moderadores',
    'page.security': 'Anti-Nuke', 'page.verification': 'Verificación',
    'page.tickets': 'Tickets', 'page.transcripts': 'Transcripciones',
    'page.logs': 'Canales de registro', 'page.botlogs': 'Registros del bot',
    'footer.support': 'Servidor de soporte', 'footer.logout': 'Cerrar sesión', 'guild.select': 'Selecciona un servidor',
    'save.changes': 'Guardar cambios', 'save.discard': 'Descartar',
    'save.warn': 'Tienes cambios sin guardar. Guárdalos o descártalos primero.',
    'h.settings': 'Configuración del servidor', 'h.tickets': 'Sistema de tickets', 'h.security': 'Anti-Nuke y seguridad',
    'sub.overview': 'Tu panel todo en uno para moderación, niveles, tickets y mucho más.',
    'sub.premium': 'Gestiona tu suscripción a ZenByte Premium y elige qué servidores usan tus espacios.',
    'sub.commands': 'Todos los comandos que ha cargado el bot, generados en tiempo real, sin nada predefinido.',
    'sub.applications': 'Crea formularios de solicitud, revisa los envíos y elige dónde se publica todo.',
    'sub.membercounters': 'Muestra estadísticas del servidor en tiempo real como nombres de canales que se actualizan solos. Discord limita los cambios de nombre, así que los contadores se actualizan cada pocos minutos.',
    'sub.settings': 'Opciones generales sobre cómo se comporta el bot en este servidor.',
    'sub.logs': 'Asigna un canal de Discord a cada tipo de registro. Elige <em>None</em> para desactivarlo.',
    'sub.tickets': 'Configura el panel de tickets, los canales y los tipos disponibles.',
    'sub.leveling': 'XP, recompensas por nivel, multiplicadores, clasificaciones y tarjetas de rango, todo totalmente configurable.',
    'sub.activity': 'Sigue la participación de los miembros (mensajes, tiempo en voz y reacciones) con una puntuación de actividad ponderada.',
    'sub.trust': 'Una puntuación única de 0 a 100 por miembro que combina la antigüedad de la cuenta, el tiempo en el servidor, la actividad, el nivel, la verificación y las advertencias.',
    'sub.moderators': 'Los roles y miembros añadidos aquí pueden usar comandos de moderación (advertencias, aislamiento temporal, herramientas de tickets) sin ser administradores.',
    'sub.security': 'Detecta y castiga automáticamente las acciones de administración destructivas en masa. Desactivado por defecto. Revisa los límites antes de activarlo.',
    'sub.greetings': 'Da la bienvenida a los nuevos miembros y publica un mensaje cuando alguien se va. Elige el canal y diseña el mensaje como texto simple o como un embed completo.',
    'sub.verification': 'Exige a los nuevos miembros resolver un captcha antes de obtener acceso.',
    'sub.autorole': 'Roles que se asignan automáticamente en cuanto alguien se une al servidor.',
    'sub.reactionroles': 'Deja que los miembros se asignen roles reaccionando a un mensaje. El bot puede publicar el mensaje por ti, o puedes indicar uno ya existente.',
    'sub.autoresponses': 'Responde automáticamente cuando un mensaje coincide con un disparador. Elige cómo se compara el disparador y luego responde con texto simple o con un embed creado aquí mismo.',
    'sub.social': 'Publica un mensaje en tu servidor cuando un creador empieza un directo o sube contenido. YouTube, Reddit y Kick funcionan sin configuración; Twitch necesita claves de API gratuitas en el archivo .env del bot.',
    'sub.polls': 'Crea encuestas, publícalas directamente en un canal y sigue los resultados. Los miembros votan con un menú en el mensaje de la encuesta; puedes finalizar, cancelar o revisar las encuestas aquí en cualquier momento.',
    'sub.altdetect': 'Evalúa a los nuevos miembros según rasgos típicos de cuentas desechables, marca las posibles cuentas alternativas para que los moderadores las revisen y, si quieres, actúa automáticamente. Ningún método es infalible, así que ajusta la sensibilidad para equilibrar detecciones y falsos positivos.',
    'sub.transcripts': 'Explora y lee conversaciones de tickets anteriores, con las imágenes mostradas directamente.',
    'sub.botlogs': 'Entradas recientes de los archivos de registro de PM2.',
  },
};

let currentLang = 'en';
try { const s = localStorage.getItem('zb-lang'); if (s && I18N_LANGS[s]) currentLang = s; } catch {}

// Remember each element's English original so switching back works without a reload.
const _i18nEn = new WeakMap();

function t(key, fallback) {
  return (I18N[currentLang] && I18N[currentLang][key]) || fallback || key;
}

const _i18nLast = new WeakMap();
function i18nApply(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    if (!_i18nEn.has(el)) _i18nEn.set(el, el.textContent);
    // If app.js replaced the text (e.g. the selected server name), leave it alone.
    if (_i18nLast.has(el) && el.textContent !== _i18nLast.get(el)) return;
    el.textContent = t(el.dataset.i18n, _i18nEn.get(el));
    _i18nLast.set(el, el.textContent);
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    if (!_i18nEn.has(el)) _i18nEn.set(el, el.innerHTML);
    el.innerHTML = t(el.dataset.i18nHtml, _i18nEn.get(el));
  });
}

function setLang(code) {
  if (!I18N_LANGS[code]) return;
  currentLang = code;
  try { localStorage.setItem('zb-lang', code); } catch {}
  document.documentElement.lang = code;
  i18nApply();
  renderLangSwitch();
  closeLangMenu();
}

function renderLangSwitch() {
  const btn = document.getElementById('lang-btn');
  const menu = document.getElementById('lang-menu');
  if (!btn || !menu) return;
  const cur = I18N_LANGS[currentLang];
  btn.innerHTML = `<span class="lang-flag">${cur.flag}</span><span>${cur.name}</span><span class="lang-chevron">▴</span>`;
  btn.title = t('lang.label', 'Language');
  menu.innerHTML = I18N_ORDER.map(c => `
    <button class="lang-option${c === currentLang ? ' active' : ''}" onclick="setLang('${c}')">
      <span class="lang-flag">${I18N_LANGS[c].flag}</span><span>${I18N_LANGS[c].name}</span>
    </button>`).join('');
}

function toggleLangMenu(e) {
  if (e) e.stopPropagation();
  document.getElementById('lang-menu')?.classList.toggle('hidden');
}
function closeLangMenu() { document.getElementById('lang-menu')?.classList.add('hidden'); }

document.addEventListener('click', e => { if (!e.target.closest('.lang-switch')) closeLangMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLangMenu(); });
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = currentLang;
  i18nApply();
  renderLangSwitch();
});
