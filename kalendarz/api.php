<?php

require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function sendJson(array $data, int $code = 200): void
{
    http_response_code($code);

    echo json_encode($data, JSON_UNESCAPED_UNICODE);

    exit;
}

function sanitize(string $value): string
{
    return trim($value);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {

    $db = getDB();

    if ($method === 'GET') {

        if ($action === 'miesiac') {

            $rok = filter_input(INPUT_GET, 'rok', FILTER_VALIDATE_INT);
            $miesiac = filter_input(INPUT_GET, 'miesiac', FILTER_VALIDATE_INT);

            if (
                !$rok ||
                !$miesiac ||
                $miesiac < 1 ||
                $miesiac > 12
            ) {
                sendJson([
                    'error' => 'Nieprawidłowe parametry daty'
                ], 400);
            }

            $poczatek = sprintf(
                '%04d-%02d-01 00:00:00',
                $rok,
                $miesiac
            );

            $koniec = date(
                'Y-m-t 23:59:59',
                mktime(0, 0, 0, $miesiac, 1, $rok)
            );

            $stmt = $db->prepare(
                'SELECT id, typ, tytul, data_czas, opis
                 FROM zdarzenia
                 WHERE data_czas BETWEEN ? AND ?
                 ORDER BY data_czas ASC'
            );

            $stmt->bind_param('ss', $poczatek, $koniec);

            $stmt->execute();

            $result = $stmt->get_result();

            $rows = $result->fetch_all(MYSQLI_ASSOC);

            $grouped = [];

            foreach ($rows as $row) {

                $day = substr($row['data_czas'], 0, 10);

                $grouped[$day][] = $row;
            }

            sendJson([
                'dane' => $grouped
            ]);
        }

        if ($action === 'dzien') {

            $data = filter_input(
                INPUT_GET,
                'data',
                FILTER_SANITIZE_SPECIAL_CHARS
            );

            if (
                !$data ||
                !preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)
            ) {
                sendJson([
                    'error' => 'Nieprawidłowy format daty'
                ], 400);
            }

            $stmt = $db->prepare(
                'SELECT id, typ, tytul, data_czas, opis
                 FROM zdarzenia
                 WHERE DATE(data_czas) = ?
                 ORDER BY data_czas ASC'
            );

            $stmt->bind_param('s', $data);

            $stmt->execute();

            $result = $stmt->get_result();

            sendJson([
                'zdarzenia' => $result->fetch_all(MYSQLI_ASSOC)
            ]);
        }

        sendJson([
            'error' => 'Nieznana akcja'
        ], 400);
    }

    if ($method === 'POST') {

        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        if (!is_array($input)) {
            sendJson([
                'error' => 'Nieprawidłowe dane wejściowe'
            ], 400);
        }

        $typ = sanitize($input['typ'] ?? '');
        $tytul = sanitize($input['tytul'] ?? '');
        $dataCzas = sanitize($input['data_czas'] ?? '');
        $opis = sanitize($input['opis'] ?? '');

        $errors = [];

        if (!in_array($typ, ['zadanie', 'spotkanie'], true)) {
            $errors[] = 'Nieprawidłowy typ zdarzenia.';
        }

        if ($tytul === '') {
            $errors[] = 'Tytuł jest wymagany.';
        }

        if (mb_strlen($tytul) > 255) {
            $errors[] = 'Tytuł nie może przekraczać 255 znaków.';
        }

        if (
            $dataCzas === '' ||
            !preg_match(
                '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/',
                $dataCzas
            )
        ) {
            $errors[] = 'Data i godzina są wymagane.';
        }

        if ($errors) {
            sendJson([
                'error' => implode(' ', $errors)
            ], 422);
        }

        $mysqlDate = str_replace(
            'T',
            ' ',
            $dataCzas
        ) . ':00';

        $stmt = $db->prepare(
            'INSERT INTO zdarzenia
             (typ, tytul, data_czas, opis)
             VALUES (?, ?, ?, ?)'
        );

        $opisValue = $opis !== ''
            ? $opis
            : null;

        $stmt->bind_param(
            'ssss',
            $typ,
            $tytul,
            $mysqlDate,
            $opisValue
        );

        $stmt->execute();

        sendJson([
            'sukces' => true,
            'id' => $db->insert_id
        ], 201);
    }

    if ($method === 'DELETE') {

        $id = filter_input(
            INPUT_GET,
            'id',
            FILTER_VALIDATE_INT
        );

        if (!$id) {
            sendJson([
                'error' => 'Nieprawidłowe ID'
            ], 400);
        }

        $stmt = $db->prepare(
            'DELETE FROM zdarzenia WHERE id = ?'
        );

        $stmt->bind_param('i', $id);

        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            sendJson([
                'error' => 'Zdarzenie nie istnieje'
            ], 404);
        }

        sendJson([
            'sukces' => true
        ]);
    }

    sendJson([
        'error' => 'Metoda niedozwolona'
    ], 405);

} catch (mysqli_sql_exception $e) {

    sendJson([
        'error' => 'Błąd bazy danych: ' . $e->getMessage()
    ], 500);

} catch (Throwable $e) {

    sendJson([
        'error' => 'Błąd serwera'
    ], 500);
}