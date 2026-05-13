<?php
// =============================================
// T-Smart 2.0 — Giriş API
// POST: { kullanici_adi, sifre, rol }
// =============================================

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

// Sadece POST isteği kabul et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Geçersiz istek.']);
    exit;
}

$kullanici_adi = trim($_POST['kullanici_adi'] ?? '');
$sifre         = trim($_POST['sifre'] ?? '');
$rol           = trim($_POST['rol'] ?? '');


// Boş alan kontrolü, boş alan var ise uyari verir
if (!$kullanici_adi || !$sifre || !$rol) {
    echo json_encode(['success' => false, 'message' => 'Lütfen tüm alanları doldurun.']);
    exit;
}

// Geçerli rol kontrolü
$gecerli_roller = ['admin', 'antrenor', 'sporcu'];
if (!in_array($rol, $gecerli_roller)) {
    echo json_encode(['success' => false, 'message' => 'Geçersiz rol seçimi.']);
    exit;
}

// Kullanıcıyı veritabanında ara
$stmt = $conn->prepare(
    "SELECT Kullanici_ID, Kullanici_Adi, Sifre, Rol FROM Kullanicilar WHERE Kullanici_Adi = ? AND Rol = ?"
);
$stmt->bind_param('ss', $kullanici_adi, $rol);
$stmt->execute();
$result = $stmt->get_result();
$kullanici = $result->fetch_assoc();
$stmt->close();

// Kullanıcı bulunamadı
if (!$kullanici) {
    echo json_encode(['success' => false, 'message' => 'Kullanıcı adı veya şifre hatalı.']);
    exit;
}

// Şifre kontrolü
// NOT: Veritabanında şifreler düz metin olarak saklanıyor .
// Gerçek projede: password_verify($sifre, $kullanici['Sifre'])
if ($sifre !== $kullanici['Sifre']) {
    echo json_encode(['success' => false, 'message' => 'Kullanıcı adı veya şifre hatalı.']);
    exit;
}

// Session bilgilerini kaydet
$_SESSION['kullanici_id']  = $kullanici['Kullanici_ID'];
$_SESSION['kullanici_adi'] = $kullanici['Kullanici_Adi'];
$_SESSION['rol']           = $kullanici['Rol'];

// Eğer sporcu ise, Sporcu tablosundan ek bilgileri al
if ($kullanici['Rol'] === 'sporcu') {
    $stmt2 = $conn->prepare(
        "SELECT s.Sporcu_ID, s.Ad_Soyad, s.Kulup_Adi, k.Kusak_Adi
         FROM Sporcular s
         JOIN Kusaklar k ON s.Kusak_ID = k.Kusak_ID
         WHERE s.Kullanici_ID = ?"
    );
    $stmt2->bind_param('i', $kullanici['Kullanici_ID']);
    $stmt2->execute();
    $sporcu = $stmt2->get_result()->fetch_assoc();
    $stmt2->close();

    if ($sporcu) {
        $_SESSION['sporcu_id']  = $sporcu['Sporcu_ID'];
        $_SESSION['ad_soyad']   = $sporcu['Ad_Soyad'];
        $_SESSION['kulup_adi']  = $sporcu['Kulup_Adi'];
        $_SESSION['kusak_adi']  = $sporcu['Kusak_Adi'];
    }
}

// Rol'e göre yönlendirme sayfasını belirle
$redirect_map = [
    'admin'    => '/tsmart/admin.html',
    'antrenor' => '/tsmart/antrenor.html',
    'sporcu'   => '/tsmart/sporcu.html',
];

echo json_encode([
    'success'  => true,
    'message'  => 'Giriş başarılı. Yönlendiriliyorsunuz...',
    'rol'      => $kullanici['Rol'],
    'redirect' => $redirect_map[$kullanici['Rol']],
    'kullanici'=> [
        'id'   => $kullanici['Kullanici_ID'],
        'adi'  => $kullanici['Kullanici_Adi'],
        'rol'  => $kullanici['Rol'],
    ]
]);

$conn->close();
?>