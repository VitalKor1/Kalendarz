<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terminarz spotkań i zadań</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>

<header class="app-header">
    <h1 class="app-header__title">Kalendarz</h1>

</header>

<nav class="nav-bar" aria-label="Nawigacja">
    <button id="btnPrev" class="nav-bar__action" aria-label="Poprzedni">&#8592;</button>
    <span id="monthLabel" class="nav-bar__current"></span>
    <button id="btnNext" class="nav-bar__action" aria-label="Następny">&#8594;</button>
</nav>

<main class="calendar-wrapper">
    <div id="calGrid" class="grid-container" role="grid"></div>
</main>

<div id="overlay" class="modal-screen" role="dialog" aria-modal="true">
    <div class="modal-window">
        <div class="modal-window__header">
            <span id="popupTitle" class="modal-window__title"></span>
            <button id="popupClose" class="modal-window__close" aria-label="Zamknij">&#10005;</button>
        </div>
        <div id="popupBody" class="modal-window__content"></div>
    </div>
</div>

<div id="toast" class="notification-bubble" role="status"></div>

<script src="code.js"></script>
</body>
</html>