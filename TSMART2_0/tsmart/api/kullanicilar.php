<?php
// =============================================
// T-Smart 2.0 — Kullanıcılar API
// GET  → Tüm kullanıcıları listele
// POST → Yeni kullanıcı ekle
// DELETE ?id=X → Kullanıcı sil
// =============================================

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

//  GET: Kullanıcı listesi 
if ($method === 'GET') {
    // İstatistikler
    $ist = $conn->query("
        SELECT
            COUNT(*) AS toplam,
            SUM(Rol='antrenor') AS antrenor,
            SUM(Rol='sporcu')   AS sporcu,
            SUM(Rol='admin')    AS admin
        FROM Kullanicilar
    ")->fetch_assoc();

    // Liste
    $result = $conn->query("
        SELECT Kullanici_ID, Kullanici_Adi, Rol
        FROM Kullanicilar
        ORDER BY Rol, Kullanici_Adi
    ");
    $kullanicilar = $result->fetch_all(MYSQLI_ASSOC);

    echo json_encode([
        'success'      => true,
        'data'         => $kullanicilar,
        'istatistik'   => $ist,
    ]);
}

//  POST: Yeni kullanıcı ekle 
elseif ($method === 'POST') {
    $kullanici_adi = trim($_POST['kullanici_adi'] ?? '');
    $sifre         = trim($_POST['sifre']         ?? '');
    $rol           = strtolower(trim($_POST['rol'] ?? 'sporcu'));

    if (!$kullanici_adi || !$sifre) {
        echo json_encode(['success' => false, 'message' => 'Kullanıcı adı ve şifre zorunludur.']);
        exit;
    }

    $stmt = $conn->prepare(
        "INSERT INTO Kullanicilar (Kullanici_Adi, Sifre, Rol) VALUES (?, ?, ?)"
    );
    $stmt->bind_param('sss', $kullanici_adi, $sifre, $rol);

    if ($stmt->execute()) {
        $yeni_kullanici_id = $conn->insert_id;

        // Eğer sporcu ise, Sporcular tablosuna da ekle (varsayılan Beyaz Kuşak)
        if ($rol === 'sporcu') {
            // Beyaz Kuşak ID'sini bul
            $kstmt = $conn->prepare("SELECT Kusak_ID FROM Kusaklar WHERE Kusak_Adi LIKE '%Beyaz%' LIMIT 1");
            $kstmt->execute();
            $kusak = $kstmt->get_result()->fetch_assoc();
            $kstmt->close();
            $kusak_id = $kusak['Kusak_ID'] ?? 1;

            $ad_soyad  = trim($_POST['ad_soyad'] ?? $kullanici_adi);
            $kulup_adi = trim($_POST['kulup_adi'] ?? 'Belirtilmedi');

            $sstmt = $conn->prepare(
                "INSERT INTO Sporcular (Kullanici_ID, Kusak_ID, Ad_Soyad, Kulup_Adi) VALUES (?, ?, ?, ?)"
            );
            $sstmt->bind_param('iiss', $yeni_kullanici_id, $kusak_id, $ad_soyad, $kulup_adi);
            $sstmt->execute();
            $sstmt->close();
        }

        echo json_encode(['success' => true, 'message' => 'Kullanıcı eklendi.', 'id' => $yeni_kullanici_id]);
    } else {
        $err = $conn->error;
        $msg = str_contains($err, 'Duplicate') ? 'Bu kullanıcı adı zaten alınmış.' : 'Kullanıcı eklenemedi.';
        echo json_encode(['success' => false, 'message' => $msg]);
    }
    $stmt->close();
}


//  PUT: Kullanıcı güncelle 
elseif ($method === 'PUT') {
    $rawInput = file_get_contents('php://input');
    parse_str($rawInput, $putData);

    $id            = intval($putData['id']            ?? 0);
    $kullanici_adi = trim($putData['kullanici_adi']   ?? '');
    $rol           = strtolower(trim($putData['rol']  ?? ''));
    $sifre         = trim($putData['sifre']           ?? '');

    if (!$id || !$kullanici_adi) {
        echo json_encode(['success' => false, 'message' => 'ID ve kullanıcı adı zorunludur.']);
        exit;
    }

    if ($sifre) {
        $stmt = $conn->prepare("UPDATE Kullanicilar SET Kullanici_Adi=?, Rol=?, Sifre=? WHERE Kullanici_ID=?");
        $stmt->bind_param('sssi', $kullanici_adi, $rol, $sifre, $id);
    } else {
        $stmt = $conn->prepare("UPDATE Kullanicilar SET Kullanici_Adi=?, Rol=? WHERE Kullanici_ID=?");
        $stmt->bind_param('ssi', $kullanici_adi, $rol, $id);
    }

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Kullanıcı güncellendi.']);
    } else {
        $err = $conn->error;
        $msg = str_contains($err, 'Duplicate') ? 'Bu kullanıcı adı zaten alınmış.' : 'Güncellenemedi.';
        echo json_encode(['success' => false, 'message' => $msg]);
    }
    $stmt->close();
}

//  DELETE: Kullanıcı sil 
elseif ($method === 'DELETE') {
    parse_str(file_get_contents('php://input'), $data);
    $id = intval($data['id'] ?? 0);

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Geçersiz ID.']);
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM Kullanicilar WHERE Kullanici_ID = ?");
    $stmt->bind_param('i', $id);

    if ($stmt->execute() && $stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Kullanıcı silindi.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Kullanıcı bulunamadı.']);
    }
    $stmt->close();
}

$conn->close();
?>