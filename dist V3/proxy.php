<?php
/* ============================================================
   Kiosco TV - proxy CORS ligero (Smart TV, WebKit antiguo)
   El navegador de la TV descarga por el MISMO host (sin CORS)
   y este script obtiene los datos en el servidor.
   Uso: proxy.php?url=<url-encoded>
   ============================================================ */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

function resp($code, $msg) {
    http_response_code($code);
    die($msg);
}

$url = '';
$qs = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
$pos = strpos($qs, 'url=');
if ($pos !== false) $url = urldecode(substr($qs, $pos + 4));
if ($url === '') $url = isset($_GET['url']) ? trim($_GET['url']) : '';
if ($url === '') resp(400, 'Falta parametro url');

$parts = @parse_url($url);
if (!$parts || !isset($parts['scheme']) || !isset($parts['host'])) resp(400, 'URL invalida');
if (strtolower($parts['scheme']) !== 'https' && strtolower($parts['scheme']) !== 'http') resp(400, 'Solo http/https');

$host = strtolower($parts['host']);
$allowed = array(
    'docs.google.com', 'sheets.googleusercontent.com',
    'drive.google.com', 'images.weserv.nl',
    'api.open-meteo.com', 'api.rss2json.com'
);
$ok = false;
foreach ($allowed as $a) {
    if ($host === $a || substr($host, -strlen($a) - 1) === '.' . $a) { $ok = true; break; }
}
if (!$ok) resp(403, 'Dominio no permitido');

$ct = 'text/csv; charset=utf-8';
$body = false;
$code = 0;

if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 6);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
    curl_setopt($ch, CURLOPT_TIMEOUT, 25);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (KioscoTV)');
    $body = curl_exec($ch);
    $info = curl_getinfo($ch);
    $code = (int) (isset($info['http_code']) ? $info['http_code'] : 0);
    if (isset($info['content_type']) && $info['content_type'] !== '') $ct = $info['content_type'];
    curl_close($ch);
} else {
    $ctx = stream_context_create(array('http' => array(
        'timeout' => 25,
        'ignore_errors' => true,
        'user_agent' => 'Mozilla/5.0 (KioscoTV)',
        'follow_location' => 1,
        'max_redirects' => 6
    )));
    $body = @file_get_contents($url, false, $ctx);
    $code = 200;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $line) {
            if (stripos($line, 'HTTP/') === 0) {
                $sp = explode(' ', $line);
                $code = (int) (isset($sp[1]) ? $sp[1] : 200);
            } elseif (stripos($line, 'Content-Type:') === 0) {
                $ct = trim(substr($line, 13));
            }
        }
    }
}

if ($body === false) resp(502, 'Error al obtener datos');
if ($code >= 400) resp($code, 'Error HTTP ' . $code);
header('Content-Type: ' . $ct);
echo $body;