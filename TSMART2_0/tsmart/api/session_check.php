<?php

// =============================================
// T-Smart 2.0 — Oturum Kontrol API
// GET: Oturum açık mı? Kullanıcı bilgilerini döner.
// Kullanıcının oturum bilgisini kontrol edip, kullanıcı giriş yaptıysa session’daki bilgileri JSON formatında frontend’e gönderiyor
// =============================================

session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['kullanici_id'])) {
    echo json_encode(['giris_yapildi' => false]);
    exit;
}

echo json_encode([
    'giris_yapildi' => true,
    'kullanici_id'  => $_SESSION['kullanici_id'],
    'kullanici_adi' => $_SESSION['kullanici_adi'],
    'rol'           => $_SESSION['rol'],
    'sporcu_id'     => $_SESSION['sporcu_id']  ?? null,
    'ad_soyad'      => $_SESSION['ad_soyad']   ?? null,
    'kulup_adi'     => $_SESSION['kulup_adi']  ?? null,
    'kusak_adi'     => $_SESSION['kusak_adi']  ?? null,
]);
?>