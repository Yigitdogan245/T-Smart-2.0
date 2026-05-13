<?php
// =============================================
// T-Smart 2.0 — Veritabanı Bağlantısı
// =============================================
// Bu bilgileri kendi XAMPP/MySQL ayarlarınıza öre güncelle...
// =============================================

define('DB_HOST', 'localhost');
define('DB_USER', 'root');       // XAMPP varsayılanı
define('DB_PASS', 'root');           // XAMPP varsayılanı (şifre yoksa boş bırakk)
define('DB_NAME', 'tsmart2');     // Oluşturduğun veritabanının adı

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Bağlantı hatası kontrolu
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Veritabanı bağlantısı kurulamadı: ' . $conn->connect_error
    ]);
    exit;
}

// Turkce karakter destegi icin
$conn->set_charset('utf8mb4');
?>