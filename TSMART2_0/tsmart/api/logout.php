<?php
// =============================================
// T-Smart 2.0 — Çıkış için API, ?
// =============================================

session_start();
session_destroy();

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => true, 'redirect' => 'giris.html']);
?>