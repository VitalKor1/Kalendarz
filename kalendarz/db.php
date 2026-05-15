<?php

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'terminarz');
define('DB_CHARSET', 'utf8mb4');

function getDB(): mysqli {
    static $db = null;

    if ($db === null) {
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

        $db = new mysqli(
            DB_HOST,
            DB_USER,
            DB_PASS,
            DB_NAME
        );

        $db->set_charset(DB_CHARSET);
    }

    return $db;
}