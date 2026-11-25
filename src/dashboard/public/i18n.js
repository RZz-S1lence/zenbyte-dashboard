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


// ── Round 2: Overview, Settings, Commands, Premium, Log Channels ──
// Plural keys use Intl.PluralRules forms: key.one / key.few / key.many / key.other.
const I18N_R2 = {
  en: {
    'pr.added': 'Added <strong>{name}</strong> to Premium',
    'cmd.count.one': '{n} command', 'cmd.count.other': '{n} commands',
    'cmd.stats': '{e} enabled · {d} disabled',
    'cr.onlyIn.one': 'Only in {n} channel', 'cr.onlyIn.other': 'Only in {n} channels',
    'cr.blockedIn.one': 'Blocked in {n} channel', 'cr.blockedIn.other': 'Blocked in {n} channels',
    'cmd.choices.one': '{n} choice', 'cmd.choices.other': '{n} choices',
    'pr.slots': 'Slots: <strong>{u} / {t}</strong> used', 'pr.expiry': 'Renews / expires: {d}',
    'pr.applies.one': 'Premium features apply to the servers you activate here, using your {n} slot.',
    'pr.applies.other': 'Premium features apply to the servers you activate here, using your {n} slots.',
  },
  de: {
    'pr.added': '<strong>{name}</strong> wurde zu Premium hinzugefügt',
    'common.selectServer': '← Wähle links in der Sidebar einen Server aus, um loszulegen.',
    'common.loading': 'Lädt…', 'common.saved': 'Gespeichert!', 'common.saveFailed': 'Speichern fehlgeschlagen.',
    'common.save': 'Speichern', 'common.cancel': 'Abbrechen', 'common.remove': 'Entfernen',
    'ov.connecting': 'Verbinde…', 'ov.online': 'Online', 'ov.offline': 'Offline', 'ov.invite': 'Bot einladen', 'ov.support': 'Support',
    'stat.status': 'Status', 'stat.servers': 'Server', 'stat.members': 'Mitglieder', 'stat.commands': 'Befehle', 'stat.ping': 'Ping', 'stat.uptime': 'Laufzeit',
    'ov.quick': 'Schnellzugriff',
    'set.prefixTitle': 'Befehls-Präfix', 'set.prefix': 'Präfix',
    'set.prefixHint': 'Wird für Textbefehle wie <code>?ban</code> genutzt. Slash-Befehle funktionieren immer zusätzlich. 1 bis 5 Zeichen, keine Leerzeichen.',
    'logs.type': 'Log-Typ', 'logs.desc': 'Beschreibung', 'logs.channel': 'Kanal', 'logs.saveAll': 'Alle speichern', 'logs.none': 'Keiner', 'logs.noCategory': 'Keine Kategorie',
    'sub.logs': 'Weise jedem Log-Typ einen Discord-Kanal zu. Stelle <em>Keiner</em> ein, um ihn zu deaktivieren.',
    'logs.g.Voice': 'Sprachkanäle', 'logs.g.Members': 'Mitglieder', 'logs.g.Messages': 'Nachrichten',
    'logs.d.vcjoin': 'Mitglied betritt einen Sprachkanal',
    'logs.d.vcleave': 'Mitglied verlässt einen Sprachkanal',
    'logs.d.vcmove': 'Mitglied wechselt zwischen Sprachkanälen',
    'logs.d.vcdeafen': 'Mitglied wird auf dem Server taubgeschaltet',
    'logs.d.vcundeafen': 'Taubschaltung eines Mitglieds wird aufgehoben',
    'logs.d.vcmute': 'Mitglied wird auf dem Server stummgeschaltet',
    'logs.d.vcunmute': 'Stummschaltung eines Mitglieds wird aufgehoben',
    'logs.d.vcscreenshare': 'Mitglied startet eine Bildschirmübertragung',
    'logs.d.vcscreensharestop': 'Mitglied beendet die Bildschirmübertragung',
    'logs.d.vckick': 'Mitglied wird von einem Mod aus dem Sprachkanal getrennt',
    'logs.d.memberjoin': 'Mitglied tritt dem Server bei',
    'logs.d.memberleave': 'Mitglied verlässt den Server',
    'logs.d.ban': 'Mitglied wird gebannt',
    'logs.d.unban': 'Mitglied wird entbannt',
    'logs.d.kick': 'Mitglied wird gekickt',
    'logs.d.timeout': 'Mitglied bekommt einen Timeout',
    'logs.d.untimeout': 'Timeout eines Mitglieds wird aufgehoben',
    'logs.d.addroles': 'Mitglied bekommt Rollen hinzugefügt',
    'logs.d.removeroles': 'Mitglied werden Rollen entfernt',
    'logs.d.changename': 'Nickname eines Mitglieds ändert sich',
    'logs.d.deletemessage': 'Eine Nachricht wird gelöscht',
    'logs.d.messageedit': 'Eine Nachricht wird bearbeitet',
    'cmd.search': 'Befehle suchen…', 'cmd.loadFailed': 'Befehle konnten nicht geladen werden.', 'cmd.all': 'Alle',
    'cmd.st.all': 'Alle', 'cmd.st.enabled': 'Aktiviert', 'cmd.st.disabled': 'Deaktiviert',
    'cmd.count.one': '{n} Befehl', 'cmd.count.other': '{n} Befehle',
    'cmd.stats': '{e} aktiviert · {d} deaktiviert',
    'cmd.enableShown': 'Alle angezeigten aktivieren', 'cmd.disableShown': 'Alle angezeigten deaktivieren',
    'cmd.hintGuild': 'Schalte einen Befehl um, um ihn auf dem ausgewählten Server zu aktivieren oder zu deaktivieren.',
    'cmd.hintNoGuild': '← Wähle einen Server aus, um Befehle zu aktivieren oder zu deaktivieren.',
    'cmd.catEnable': 'Alle aktivieren', 'cmd.catDisable': 'Alle deaktivieren', 'cmd.noMatch': 'Keine Befehle passen zu deinem Filter.',
    'cmd.enabled': 'Aktiviert', 'cmd.disabled': 'Deaktiviert', 'cmd.auto': 'auto',
    'cmd.choices.one': '{n} Option', 'cmd.choices.other': '{n} Optionen',
    'cr.onlyIn.one': 'Nur in {n} Kanal', 'cr.onlyIn.other': 'Nur in {n} Kanälen',
    'cr.blockedIn.one': 'Gesperrt in {n} Kanal', 'cr.blockedIn.other': 'Gesperrt in {n} Kanälen',
    'cr.any': 'In jedem Kanal nutzbar', 'cr.edit': 'Kanäle bearbeiten', 'cr.limit': 'Kanäle einschränken',
    'cr.helpWhite': 'Der Befehl funktioniert <strong>nur</strong> in den Kanälen, die du auswählst.',
    'cr.helpBlack': 'Der Befehl ist in den Kanälen, die du auswählst, <strong>gesperrt</strong>.',
    'cr.helpOff': 'Keine Kanal-Einschränkung, überall nutzbar.',
    'cr.off': 'Aus', 'cr.white': 'Whitelist', 'cr.black': 'Blacklist',
    'cr.pickOne': 'Wähle mindestens einen Kanal aus oder stelle den Modus auf Aus.', 'cr.saveFailed': 'Speichern fehlgeschlagen: ',
    'b.owner': 'Nur Besitzer', 'b.admin': 'Nur Admins', 'b.mod': 'Mod', 'b.everyone': 'Alle',
    'ot.1': 'Unterbefehl', 'ot.2': 'Gruppe', 'ot.3': 'Text', 'ot.4': 'Ganzzahl', 'ot.5': 'Ja/Nein', 'ot.6': 'Nutzer',
    'ot.7': 'Kanal', 'ot.8': 'Rolle', 'ot.9': 'Erwähnbar', 'ot.10': 'Zahl', 'ot.11': 'Anhang',
    'pr.tier.lifetime': 'Lifetime', 'pr.tier.complimentary': 'Geschenkt', 'pr.tier.free': 'Kostenlos',
    'pr.userId': 'Nutzer-ID', 'pr.plan': 'Plan', 'pr.buy': 'Kaufen',
    'pr.freePlan': 'Du nutzt den <strong>kostenlosen</strong> Plan.',
    'pr.upgrade': 'Upgrade, um die Limits für Umfragen, Reaktionsrollen, Autorollen, Social Alerts, Level-Belohnungen, Mitgliederzähler und Bewerbungen zu erhöhen und auf allen deinen Servern mehr freizuschalten.',
    'pr.perMonth': '/Monat', 'pr.slot1': '1 Server-Slot', 'pr.slot3': '3 Server-Slots', 'pr.slotLife': '1 Slot, für immer',
    'pr.buyHint': 'Nach dem Kauf bekommst du einen Lizenzschlüssel. Aktiviere ihn mit <code>/activate-premium</code> auf dem ZenByte-Server.',
    'pr.store': 'Alle Pläne im Shop ansehen →', 'pr.never': 'Nie (Lifetime)',
    'pr.noServers': 'Noch keine Server aktiviert. Weise unten einen zu.', 'pr.activate': 'Aktivieren',
    'pr.allActivated': 'Alle Server, die du verwaltest, sind schon aktiviert.',
    'pr.slotsFull': 'Alle deine Slots sind belegt. Entferne einen Server, um einen freizumachen.',
    'pr.moreSlots': 'Mehr Slots gebraucht?',
    'pr.extraDesc': 'Füge deinem Lifetime-Plan einen dauerhaften zusätzlichen Server-Slot hinzu. Aktiviere den Schlüssel nach dem Kauf mit <code>/activate-premium</code>.',
    'pr.buySlot': 'Slot kaufen', 'pr.active': 'Aktiv', 'pr.slots': 'Slots: <strong>{u} / {t}</strong> belegt',
    'pr.expiry': 'Verlängert sich / läuft ab: {d}', 'pr.activated': 'Aktivierte Server',
    'pr.applies.one': 'Premium-Funktionen gelten für die Server, die du hier aktivierst, mit deinem {n} Slot.',
    'pr.applies.other': 'Premium-Funktionen gelten für die Server, die du hier aktivierst, mit deinen {n} Slots.',
    'pr.confirmRemove': 'Premium von diesem Server entfernen? Seine Limits fallen dann auf den kostenlosen Plan zurück.',
  },
  fr: {
    'pr.added': '<strong>{name}</strong> a été ajouté à Premium',
    'common.selectServer': '← Sélectionnez un serveur dans la barre latérale pour commencer.',
    'common.loading': 'Chargement…', 'common.saved': 'Enregistré !', 'common.saveFailed': "Échec de l'enregistrement.",
    'common.save': 'Enregistrer', 'common.cancel': 'Annuler', 'common.remove': 'Retirer',
    'ov.connecting': 'Connexion…', 'ov.online': 'En ligne', 'ov.offline': 'Hors ligne', 'ov.invite': 'Inviter le bot', 'ov.support': 'Assistance',
    'stat.status': 'Statut', 'stat.servers': 'Serveurs', 'stat.members': 'Membres', 'stat.commands': 'Commandes', 'stat.ping': 'Ping', 'stat.uptime': 'Temps de fonctionnement',
    'ov.quick': 'Accès rapide',
    'set.prefixTitle': 'Préfixe des commandes', 'set.prefix': 'Préfixe',
    'set.prefixHint': 'Utilisé pour les commandes texte comme <code>?ban</code>. Les commandes slash fonctionnent toujours aussi. 1 à 5 caractères, sans espaces.',
    'logs.type': 'Type de log', 'logs.desc': 'Description', 'logs.channel': 'Salon', 'logs.saveAll': 'Tout enregistrer', 'logs.none': 'Aucun', 'logs.noCategory': 'Sans catégorie',
    'sub.logs': 'Attribuez un salon Discord à chaque type de log. Choisissez <em>Aucun</em> pour le désactiver.',
    'logs.g.Voice': 'Vocal', 'logs.g.Members': 'Membres', 'logs.g.Messages': 'Messages',
    'logs.d.vcjoin': 'Un membre rejoint un salon vocal',
    'logs.d.vcleave': 'Un membre quitte un salon vocal',
    'logs.d.vcmove': "Un membre passe d'un salon vocal à un autre",
    'logs.d.vcdeafen': 'Un membre est mis en sourdine sur le serveur',
    'logs.d.vcundeafen': "La sourdine d'un membre est retirée",
    'logs.d.vcmute': 'Un membre est rendu muet sur le serveur',
    'logs.d.vcunmute': "Un membre n'est plus muet sur le serveur",
    'logs.d.vcscreenshare': "Un membre commence un partage d'écran",
    'logs.d.vcscreensharestop': "Un membre arrête le partage d'écran",
    'logs.d.vckick': 'Un membre est déconnecté du vocal par un modérateur',
    'logs.d.memberjoin': 'Un membre rejoint le serveur',
    'logs.d.memberleave': 'Un membre quitte le serveur',
    'logs.d.ban': 'Un membre est banni',
    'logs.d.unban': 'Un membre est débanni',
    'logs.d.kick': 'Un membre est expulsé',
    'logs.d.timeout': 'Un membre est exclu temporairement',
    'logs.d.untimeout': "L'exclusion temporaire d'un membre est levée",
    'logs.d.addroles': 'Des rôles sont ajoutés à un membre',
    'logs.d.removeroles': 'Des rôles sont retirés à un membre',
    'logs.d.changename': "Le pseudo d'un membre change",
    'logs.d.deletemessage': 'Un message est supprimé',
    'logs.d.messageedit': 'Un message est modifié',
    'cmd.search': 'Rechercher des commandes…', 'cmd.loadFailed': 'Impossible de charger les commandes.', 'cmd.all': 'Toutes',
    'cmd.st.all': 'Toutes', 'cmd.st.enabled': 'Activées', 'cmd.st.disabled': 'Désactivées',
    'cmd.count.one': '{n} commande', 'cmd.count.other': '{n} commandes',
    'cmd.stats': '{e} activées · {d} désactivées',
    'cmd.enableShown': 'Activer toutes celles affichées', 'cmd.disableShown': 'Désactiver toutes celles affichées',
    'cmd.hintGuild': "Utilisez l'interrupteur d'une commande pour l'activer ou la désactiver sur le serveur sélectionné.",
    'cmd.hintNoGuild': '← Sélectionnez un serveur pour activer ou désactiver les commandes.',
    'cmd.catEnable': 'Tout activer', 'cmd.catDisable': 'Tout désactiver', 'cmd.noMatch': 'Aucune commande ne correspond à votre filtre.',
    'cmd.enabled': 'Activée', 'cmd.disabled': 'Désactivée', 'cmd.auto': 'auto',
    'cmd.choices.one': '{n} choix', 'cmd.choices.other': '{n} choix',
    'cr.onlyIn.one': 'Uniquement dans {n} salon', 'cr.onlyIn.other': 'Uniquement dans {n} salons',
    'cr.blockedIn.one': 'Bloquée dans {n} salon', 'cr.blockedIn.other': 'Bloquée dans {n} salons',
    'cr.any': 'Utilisable dans tous les salons', 'cr.edit': 'Modifier les salons', 'cr.limit': 'Limiter les salons',
    'cr.helpWhite': 'La commande fonctionne <strong>uniquement</strong> dans les salons choisis.',
    'cr.helpBlack': 'La commande est <strong>bloquée</strong> dans les salons choisis.',
    'cr.helpOff': 'Aucune restriction de salon, utilisable partout.',
    'cr.off': 'Désactivé', 'cr.white': 'Liste blanche', 'cr.black': 'Liste noire',
    'cr.pickOne': 'Choisissez au moins un salon ou réglez le mode sur Désactivé.', 'cr.saveFailed': "Échec de l'enregistrement : ",
    'b.owner': 'Propriétaire uniquement', 'b.admin': 'Admins uniquement', 'b.mod': 'Mod', 'b.everyone': 'Tout le monde',
    'ot.1': 'Sous-commande', 'ot.2': 'Groupe', 'ot.3': 'Texte', 'ot.4': 'Entier', 'ot.5': 'Booléen', 'ot.6': 'Utilisateur',
    'ot.7': 'Salon', 'ot.8': 'Rôle', 'ot.9': 'Mentionnable', 'ot.10': 'Nombre', 'ot.11': 'Pièce jointe',
    'pr.tier.lifetime': 'À vie', 'pr.tier.complimentary': 'Offert', 'pr.tier.free': 'Gratuit',
    'pr.userId': 'ID utilisateur', 'pr.plan': 'Offre', 'pr.buy': 'Acheter',
    'pr.freePlan': "Vous utilisez l'offre <strong>gratuite</strong>.",
    'pr.upgrade': 'Passez à une offre supérieure pour augmenter les limites des sondages, rôles par réaction, rôles automatiques, alertes sociales, récompenses de niveau, compteurs de membres et candidatures, et débloquer davantage sur tous les serveurs que vous gérez.',
    'pr.perMonth': '/mois', 'pr.slot1': '1 emplacement de serveur', 'pr.slot3': '3 emplacements de serveur', 'pr.slotLife': '1 emplacement, pour toujours',
    'pr.buyHint': "Après l'achat, vous recevrez une clé de licence. Activez-la avec <code>/activate-premium</code> sur le serveur ZenByte.",
    'pr.store': 'Voir toutes les offres sur la boutique →', 'pr.never': 'Jamais (à vie)',
    'pr.noServers': 'Aucun serveur activé pour le moment. Attribuez-en un ci-dessous.', 'pr.activate': 'Activer',
    'pr.allActivated': 'Tous les serveurs que vous gérez sont déjà activés.',
    'pr.slotsFull': 'Tous vos emplacements sont utilisés. Retirez un serveur pour en libérer un.',
    'pr.moreSlots': "Besoin de plus d'emplacements ?",
    'pr.extraDesc': "Ajoutez un emplacement de serveur supplémentaire permanent à votre offre À vie. Après l'achat, activez la clé avec <code>/activate-premium</code>.",
    'pr.buySlot': 'Acheter un emplacement', 'pr.active': 'Actif', 'pr.slots': 'Emplacements : <strong>{u} / {t}</strong> utilisés',
    'pr.expiry': 'Renouvellement / expiration : {d}', 'pr.activated': 'Serveurs activés',
    'pr.applies.one': "Les fonctionnalités Premium s'appliquent aux serveurs que vous activez ici, avec votre {n} emplacement.",
    'pr.applies.other': "Les fonctionnalités Premium s'appliquent aux serveurs que vous activez ici, avec vos {n} emplacements.",
    'pr.confirmRemove': "Retirer Premium de ce serveur ? Ses limites reviendront à celles de l'offre gratuite.",
  },
  ru: {
    'pr.added': 'Сервер <strong>{name}</strong> добавлен в Premium',
    'common.selectServer': '← Выберите сервер на боковой панели, чтобы начать.',
    'common.loading': 'Загрузка…', 'common.saved': 'Сохранено!', 'common.saveFailed': 'Не удалось сохранить.',
    'common.save': 'Сохранить', 'common.cancel': 'Отмена', 'common.remove': 'Убрать',
    'ov.connecting': 'Подключение…', 'ov.online': 'В сети', 'ov.offline': 'Не в сети', 'ov.invite': 'Пригласить бота', 'ov.support': 'Поддержка',
    'stat.status': 'Статус', 'stat.servers': 'Серверы', 'stat.members': 'Участники', 'stat.commands': 'Команды', 'stat.ping': 'Пинг', 'stat.uptime': 'Время работы',
    'ov.quick': 'Быстрые действия',
    'set.prefixTitle': 'Префикс команд', 'set.prefix': 'Префикс',
    'set.prefixHint': 'Используется для текстовых команд, например <code>?ban</code>. Слэш-команды тоже всегда работают. От 1 до 5 символов, без пробелов.',
    'logs.type': 'Тип лога', 'logs.desc': 'Описание', 'logs.channel': 'Канал', 'logs.saveAll': 'Сохранить всё', 'logs.none': 'Нет', 'logs.noCategory': 'Без категории',
    'sub.logs': 'Назначьте канал Discord для каждого типа логов. Выберите <em>Нет</em>, чтобы отключить.',
    'logs.g.Voice': 'Голосовые', 'logs.g.Members': 'Участники', 'logs.g.Messages': 'Сообщения',
    'logs.d.vcjoin': 'Участник заходит в голосовой канал',
    'logs.d.vcleave': 'Участник выходит из голосового канала',
    'logs.d.vcmove': 'Участник переходит между голосовыми каналами',
    'logs.d.vcdeafen': 'Участнику отключают звук на сервере',
    'logs.d.vcundeafen': 'Участнику снова включают звук на сервере',
    'logs.d.vcmute': 'Участнику отключают микрофон на сервере',
    'logs.d.vcunmute': 'Участнику снова включают микрофон на сервере',
    'logs.d.vcscreenshare': 'Участник начинает демонстрацию экрана',
    'logs.d.vcscreensharestop': 'Участник завершает демонстрацию экрана',
    'logs.d.vckick': 'Модератор отключает участника от голосового канала',
    'logs.d.memberjoin': 'Участник заходит на сервер',
    'logs.d.memberleave': 'Участник покидает сервер',
    'logs.d.ban': 'Участника банят',
    'logs.d.unban': 'Участника разбанивают',
    'logs.d.kick': 'Участника кикают',
    'logs.d.timeout': 'Участнику выдают тайм-аут',
    'logs.d.untimeout': 'С участника снимают тайм-аут',
    'logs.d.addroles': 'Участнику выдают роли',
    'logs.d.removeroles': 'У участника забирают роли',
    'logs.d.changename': 'Меняется никнейм участника',
    'logs.d.deletemessage': 'Сообщение удаляется',
    'logs.d.messageedit': 'Сообщение редактируется',
    'cmd.search': 'Поиск команд…', 'cmd.loadFailed': 'Не удалось загрузить команды.', 'cmd.all': 'Все',
    'cmd.st.all': 'Все', 'cmd.st.enabled': 'Включённые', 'cmd.st.disabled': 'Отключённые',
    'cmd.count.one': '{n} команда', 'cmd.count.few': '{n} команды', 'cmd.count.many': '{n} команд', 'cmd.count.other': '{n} команды',
    'cmd.stats': 'Включено: {e} · Отключено: {d}',
    'cmd.enableShown': 'Включить все показанные', 'cmd.disableShown': 'Отключить все показанные',
    'cmd.hintGuild': 'Переключите команду, чтобы включить или отключить её на выбранном сервере.',
    'cmd.hintNoGuild': '← Выберите сервер, чтобы включать и отключать команды.',
    'cmd.catEnable': 'Включить все', 'cmd.catDisable': 'Отключить все', 'cmd.noMatch': 'Нет команд, подходящих под фильтр.',
    'cmd.enabled': 'Включена', 'cmd.disabled': 'Отключена', 'cmd.auto': 'авто',
    'cmd.choices.one': '{n} вариант', 'cmd.choices.few': '{n} варианта', 'cmd.choices.many': '{n} вариантов', 'cmd.choices.other': '{n} варианта',
    'cr.onlyIn.one': 'Только в {n} канале', 'cr.onlyIn.other': 'Только в {n} каналах',
    'cr.blockedIn.one': 'Заблокирована в {n} канале', 'cr.blockedIn.other': 'Заблокирована в {n} каналах',
    'cr.any': 'Доступна в любом канале', 'cr.edit': 'Изменить каналы', 'cr.limit': 'Ограничить каналы',
    'cr.helpWhite': 'Команда работает <strong>только</strong> в выбранных каналах.',
    'cr.helpBlack': 'Команда <strong>заблокирована</strong> в выбранных каналах.',
    'cr.helpOff': 'Без ограничений по каналам, доступна везде.',
    'cr.off': 'Выкл.', 'cr.white': 'Белый список', 'cr.black': 'Чёрный список',
    'cr.pickOne': 'Выберите хотя бы один канал или переключите режим на «Выкл.».', 'cr.saveFailed': 'Не удалось сохранить: ',
    'b.owner': 'Только владелец', 'b.admin': 'Только админы', 'b.mod': 'Мод', 'b.everyone': 'Все',
    'ot.1': 'Подкоманда', 'ot.2': 'Группа', 'ot.3': 'Текст', 'ot.4': 'Целое число', 'ot.5': 'Да/нет', 'ot.6': 'Пользователь',
    'ot.7': 'Канал', 'ot.8': 'Роль', 'ot.9': 'Упоминание', 'ot.10': 'Число', 'ot.11': 'Вложение',
    'pr.tier.lifetime': 'Навсегда', 'pr.tier.complimentary': 'Подарочный', 'pr.tier.free': 'Бесплатный',
    'pr.userId': 'ID пользователя', 'pr.plan': 'Тариф', 'pr.buy': 'Купить',
    'pr.freePlan': 'У вас <strong>бесплатный</strong> тариф.',
    'pr.upgrade': 'Перейдите на платный тариф, чтобы повысить лимиты для опросов, ролей за реакции, авторолей, оповещений из соцсетей, наград за уровни, счётчиков участников и заявок, а также открыть больше возможностей на всех ваших серверах.',
    'pr.perMonth': '/мес.', 'pr.slot1': '1 слот для сервера', 'pr.slot3': '3 слота для серверов', 'pr.slotLife': '1 слот, навсегда',
    'pr.buyHint': 'После покупки вы получите лицензионный ключ. Активируйте его командой <code>/activate-premium</code> на сервере ZenByte.',
    'pr.store': 'Все тарифы в магазине →', 'pr.never': 'Никогда (навсегда)',
    'pr.noServers': 'Пока нет активированных серверов. Назначьте сервер ниже.', 'pr.activate': 'Активировать',
    'pr.allActivated': 'Все ваши серверы уже активированы.',
    'pr.slotsFull': 'Все ваши слоты заняты. Уберите сервер, чтобы освободить слот.',
    'pr.moreSlots': 'Нужно больше слотов?',
    'pr.extraDesc': 'Добавьте постоянный дополнительный слот для сервера к тарифу «Навсегда». После покупки активируйте ключ командой <code>/activate-premium</code>.',
    'pr.buySlot': 'Купить слот', 'pr.active': 'Активен', 'pr.slots': 'Слоты: занято <strong>{u} / {t}</strong>',
    'pr.expiry': 'Продление / окончание: {d}', 'pr.activated': 'Активированные серверы',
    'pr.applies.other': 'Функции Premium действуют на серверах, которые вы здесь активируете. Всего слотов: {n}.',
    'pr.confirmRemove': 'Убрать Premium с этого сервера? Его лимиты вернутся к бесплатному тарифу.',
  },
  es: {
    'pr.added': '<strong>{name}</strong> se añadió a Premium',
    'common.selectServer': '← Selecciona un servidor en la barra lateral para empezar.',
    'common.loading': 'Cargando…', 'common.saved': '¡Guardado!', 'common.saveFailed': 'No se pudo guardar.',
    'common.save': 'Guardar', 'common.cancel': 'Cancelar', 'common.remove': 'Quitar',
    'ov.connecting': 'Conectando…', 'ov.online': 'En línea', 'ov.offline': 'Desconectado', 'ov.invite': 'Invitar bot', 'ov.support': 'Soporte',
    'stat.status': 'Estado', 'stat.servers': 'Servidores', 'stat.members': 'Miembros', 'stat.commands': 'Comandos', 'stat.ping': 'Ping', 'stat.uptime': 'Tiempo activo',
    'ov.quick': 'Accesos rápidos',
    'set.prefixTitle': 'Prefijo de comandos', 'set.prefix': 'Prefijo',
    'set.prefixHint': 'Se usa para comandos de texto como <code>?ban</code>. Los comandos de barra siempre funcionan también. De 1 a 5 caracteres, sin espacios.',
    'logs.type': 'Tipo de registro', 'logs.desc': 'Descripción', 'logs.channel': 'Canal', 'logs.saveAll': 'Guardar todo', 'logs.none': 'Ninguno', 'logs.noCategory': 'Sin categoría',
    'sub.logs': 'Asigna un canal de Discord a cada tipo de registro. Elige <em>Ninguno</em> para desactivarlo.',
    'logs.g.Voice': 'Voz', 'logs.g.Members': 'Miembros', 'logs.g.Messages': 'Mensajes',
    'logs.d.vcjoin': 'Un miembro entra en un canal de voz',
    'logs.d.vcleave': 'Un miembro sale de un canal de voz',
    'logs.d.vcmove': 'Un miembro se mueve entre canales de voz',
    'logs.d.vcdeafen': 'Un miembro es ensordecido en el servidor',
    'logs.d.vcundeafen': 'A un miembro se le quita el ensordecimiento del servidor',
    'logs.d.vcmute': 'Un miembro es silenciado en el servidor',
    'logs.d.vcunmute': 'A un miembro se le quita el silencio del servidor',
    'logs.d.vcscreenshare': 'Un miembro empieza a compartir pantalla',
    'logs.d.vcscreensharestop': 'Un miembro deja de compartir pantalla',
    'logs.d.vckick': 'Un moderador desconecta a un miembro del canal de voz',
    'logs.d.memberjoin': 'Un miembro se une al servidor',
    'logs.d.memberleave': 'Un miembro abandona el servidor',
    'logs.d.ban': 'Un miembro es baneado',
    'logs.d.unban': 'A un miembro se le quita el baneo',
    'logs.d.kick': 'Un miembro es expulsado',
    'logs.d.timeout': 'Un miembro es aislado temporalmente',
    'logs.d.untimeout': 'Se quita el aislamiento temporal de un miembro',
    'logs.d.addroles': 'Se añaden roles a un miembro',
    'logs.d.removeroles': 'Se quitan roles a un miembro',
    'logs.d.changename': 'Cambia el apodo de un miembro',
    'logs.d.deletemessage': 'Se elimina un mensaje',
    'logs.d.messageedit': 'Se edita un mensaje',
    'cmd.search': 'Buscar comandos…', 'cmd.loadFailed': 'No se pudieron cargar los comandos.', 'cmd.all': 'Todos',
    'cmd.st.all': 'Todos', 'cmd.st.enabled': 'Activados', 'cmd.st.disabled': 'Desactivados',
    'cmd.count.one': '{n} comando', 'cmd.count.other': '{n} comandos',
    'cmd.stats': '{e} activados · {d} desactivados',
    'cmd.enableShown': 'Activar todos los mostrados', 'cmd.disableShown': 'Desactivar todos los mostrados',
    'cmd.hintGuild': 'Usa el interruptor de un comando para activarlo o desactivarlo en el servidor seleccionado.',
    'cmd.hintNoGuild': '← Selecciona un servidor para activar o desactivar comandos.',
    'cmd.catEnable': 'Activar todos', 'cmd.catDisable': 'Desactivar todos', 'cmd.noMatch': 'Ningún comando coincide con tu filtro.',
    'cmd.enabled': 'Activado', 'cmd.disabled': 'Desactivado', 'cmd.auto': 'auto',
    'cmd.choices.one': '{n} opción', 'cmd.choices.other': '{n} opciones',
    'cr.onlyIn.one': 'Solo en {n} canal', 'cr.onlyIn.other': 'Solo en {n} canales',
    'cr.blockedIn.one': 'Bloqueado en {n} canal', 'cr.blockedIn.other': 'Bloqueado en {n} canales',
    'cr.any': 'Se puede usar en cualquier canal', 'cr.edit': 'Editar canales', 'cr.limit': 'Limitar canales',
    'cr.helpWhite': 'El comando funciona <strong>solo</strong> en los canales que elijas.',
    'cr.helpBlack': 'El comando está <strong>bloqueado</strong> en los canales que elijas.',
    'cr.helpOff': 'Sin restricción de canales, se puede usar en todas partes.',
    'cr.off': 'Desactivado', 'cr.white': 'Lista blanca', 'cr.black': 'Lista negra',
    'cr.pickOne': 'Elige al menos un canal o pon el modo en Desactivado.', 'cr.saveFailed': 'No se pudo guardar: ',
    'b.owner': 'Solo propietario', 'b.admin': 'Solo admins', 'b.mod': 'Mod', 'b.everyone': 'Todos',
    'ot.1': 'Subcomando', 'ot.2': 'Grupo', 'ot.3': 'Texto', 'ot.4': 'Entero', 'ot.5': 'Booleano', 'ot.6': 'Usuario',
    'ot.7': 'Canal', 'ot.8': 'Rol', 'ot.9': 'Mencionable', 'ot.10': 'Número', 'ot.11': 'Archivo adjunto',
    'pr.tier.lifetime': 'De por vida', 'pr.tier.complimentary': 'Cortesía', 'pr.tier.free': 'Gratis',
    'pr.userId': 'ID de usuario', 'pr.plan': 'Plan', 'pr.buy': 'Comprar',
    'pr.freePlan': 'Estás en el plan <strong>gratuito</strong>.',
    'pr.upgrade': 'Mejora tu plan para aumentar los límites de encuestas, roles por reacción, roles automáticos, alertas sociales, recompensas por nivel, contadores de miembros y solicitudes, y desbloquear más en todos los servidores que gestionas.',
    'pr.perMonth': '/mes', 'pr.slot1': '1 espacio de servidor', 'pr.slot3': '3 espacios de servidor', 'pr.slotLife': '1 espacio, para siempre',
    'pr.buyHint': 'Después de la compra recibirás una clave de licencia. Actívala con <code>/activate-premium</code> en el servidor de ZenByte.',
    'pr.store': 'Ver todos los planes en la tienda →', 'pr.never': 'Nunca (de por vida)',
    'pr.noServers': 'Todavía no hay servidores activados. Asigna uno abajo.', 'pr.activate': 'Activar',
    'pr.allActivated': 'Todos los servidores que gestionas ya están activados.',
    'pr.slotsFull': 'Todos tus espacios están en uso. Quita un servidor para liberar uno.',
    'pr.moreSlots': '¿Necesitas más espacios?',
    'pr.extraDesc': 'Añade un espacio de servidor extra permanente a tu plan De por vida. Después de comprarlo, activa la clave con <code>/activate-premium</code>.',
    'pr.buySlot': 'Comprar espacio', 'pr.active': 'Activo', 'pr.slots': 'Espacios: <strong>{u} / {t}</strong> usados',
    'pr.expiry': 'Renovación / vencimiento: {d}', 'pr.activated': 'Servidores activados',
    'pr.applies.one': 'Las funciones Premium se aplican a los servidores que actives aquí, usando tu {n} espacio.',
    'pr.applies.other': 'Las funciones Premium se aplican a los servidores que actives aquí, usando tus {n} espacios.',
    'pr.confirmRemove': '¿Quitar Premium de este servidor? Sus límites volverán a los del plan gratuito.',
  },
};
I18N.en = {};
for (const [lang, dict] of Object.entries(I18N_R2)) Object.assign(I18N[lang] = I18N[lang] || {}, dict);

let currentLang = 'en';
try { const s = localStorage.getItem('zb-lang'); if (s && I18N_LANGS[s]) currentLang = s; } catch {}

// Remember each element's English original so switching back works without a reload.
const _i18nEn = new WeakMap();

function _fill(str, vars) {
  return vars ? String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : str;
}
// t('key', 'English fallback', {n: 3}) → text in the current language.
function t(key, fallback, vars) {
  const s = (I18N[currentLang] && I18N[currentLang][key]) || (I18N.en && I18N.en[key]) || fallback || key;
  return _fill(s, vars);
}
// Plural-aware: tn('cmd.count', 5) picks cmd.count.one / few / many / other for the current language.
function tn(key, n, vars) {
  let form = 'other';
  try { form = new Intl.PluralRules(currentLang).select(n); } catch {}
  const pick = d => d && (d[`${key}.${form}`] || d[`${key}.other`]);
  let enForm = 'other';
  try { enForm = new Intl.PluralRules('en').select(n); } catch {}
  const s = pick(I18N[currentLang]) || (I18N.en && (I18N.en[`${key}.${enForm}`] || I18N.en[`${key}.other`])) || key;
  return _fill(s, { n, ...(vars || {}) });
}
// Static text inside HTML that app.js builds: stays switchable without re-rendering.
function tt(key, en) {
  const a = String(en).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<span data-i18n="${key}" data-en="${a}">${t(key, en)}</span>`;
}

const _i18nLast = new WeakMap();
function i18nApply(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    if (!_i18nEn.has(el)) _i18nEn.set(el, el.textContent);
    // If app.js replaced the text (e.g. the selected server name), leave it alone.
    if (_i18nLast.has(el) && el.textContent !== _i18nLast.get(el)) return;
    el.textContent = t(el.dataset.i18n, el.dataset.en ?? _i18nEn.get(el));
    _i18nLast.set(el, el.textContent);
  });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => {
    if (!el.dataset.phEn) el.dataset.phEn = el.placeholder;
    el.placeholder = t(el.dataset.i18nPh, el.dataset.phEn);
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
  if (typeof onLangChanged === 'function') { try { onLangChanged(); } catch (e) { console.error(e); } }
}

function renderLangSwitch() {
  const btn = document.getElementById('lang-btn');
  const menu = document.getElementById('lang-menu');
  if (!btn || !menu) return;
  const cur = I18N_LANGS[currentLang];
  btn.innerHTML = `<span class="lang-flag">${cur.flag}</span><span class="lang-chevron">▾</span>`;
  btn.title = `${t('lang.label', 'Language')}: ${cur.name}`;
  btn.setAttribute('aria-label', btn.title);
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
