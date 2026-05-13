<?php
// =============================================
// T-Smart 2.0 — Videolar API
// GET              → Tüm videoları listele
// GET ?kusak_id=X  → Kuşağa göre filtrele
// POST             → Yeni video ekle (admin)
// DELETE ?id=X     → Video sil (admin)
// =============================================

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

//  GET: Video listesi 
if ($method === 'GET') {
    $kusak_id = intval($_GET['kusak_id'] ?? 0);

    $sql = "SELECT v.Video_ID, v.Baslik, v.Video_Url, k.Kusak_ID, k.Kusak_Adi
            FROM Videolar v
            JOIN Kusaklar k ON v.Kusak_ID = k.Kusak_ID";

    if ($kusak_id) {
        $sql .= " WHERE v.Kusak_ID = ?";
    }

    $sql .= " ORDER BY k.Kusak_ID, v.Baslik";

    $stmt = $conn->prepare($sql);
    if ($kusak_id) {
        $stmt->bind_param('i', $kusak_id);
    }
    $stmt->execute();
    $videolar = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Kuşak başına video sayısını da döndür (chip filtreleme için)
    $sayac_stmt = $conn->prepare(
        "SELECT k.Kusak_ID, k.Kusak_Adi, COUNT(v.Video_ID) AS video_sayisi
         FROM Kusaklar k
         LEFT JOIN Videolar v ON k.Kusak_ID = v.Kusak_ID
         GROUP BY k.Kusak_ID
         ORDER BY k.Kusak_ID"
    );
    $sayac_stmt->execute();
    $kusak_sayilari = $sayac_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $sayac_stmt->close();

    echo json_encode([
        'success'        => true,
        'data'           => $videolar,
        'kusak_sayilari' => $kusak_sayilari,
        'toplam'         => count($videolar),
    ]);
}

//  POST: Yeni video ekle 
elseif ($method === 'POST') {
    $kusak_id  = intval(trim($_POST['kusak_id']   ?? 0));
    $baslik    = trim($_POST['baslik']   ?? '');
    $video_url = trim($_POST['video_url'] ?? '');

    if (!$kusak_id || !$baslik || !$video_url) {
        echo json_encode(['success' => false, 'message' => 'Tüm alanları doldurun.']);
        exit;
    }

    $stmt = $conn->prepare(
        "INSERT INTO Videolar (Kusak_ID, Baslik, Video_Url) VALUES (?, ?, ?)"
    );
    $stmt->bind_param('iss', $kusak_id, $baslik, $video_url);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Video eklendi.', 'video_id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Video eklenemedi.']);
    }
    $stmt->close();
}


//  PUT: Video güncelle 
elseif ($method === 'PUT') {
    $rawInput = file_get_contents('php://input');
    parse_str($rawInput, $putData);
    // FormData PUT için özel okuma
    $id        = intval($putData['id']        ?? $_POST['id']        ?? 0);
    $baslik    = trim($putData['baslik']       ?? $_POST['baslik']    ?? '');
    $video_url = trim($putData['video_url']    ?? $_POST['video_url'] ?? '');

    // FormData olarak gelirse $_POST'ta olur
    if(!$id) $id = intval($_POST['id'] ?? 0);
    if(!$baslik) $baslik = trim($_POST['baslik'] ?? '');
    if(!$video_url) $video_url = trim($_POST['video_url'] ?? '');

    if (!$id || !$baslik || !$video_url) {
        echo json_encode(['success' => false, 'message' => 'ID, başlık ve URL zorunludur.']);
        exit;
    }

    $stmt = $conn->prepare("UPDATE Videolar SET Baslik = ?, Video_Url = ? WHERE Video_ID = ?");
    $stmt->bind_param('ssi', $baslik, $video_url, $id);

    if ($stmt->execute() && $stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Video güncellendi.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Video güncellenemedi veya değişiklik yok.']);
    }
    $stmt->close();
}

//  DELETE: Video sil 
elseif ($method === 'DELETE') {
    parse_str(file_get_contents('php://input'), $data);
    $video_id = intval($data['id'] ?? 0);

    if (!$video_id) {
        echo json_encode(['success' => false, 'message' => 'Geçersiz video ID.']);
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM Videolar WHERE Video_ID = ?");
    $stmt->bind_param('i', $video_id);

    if ($stmt->execute() && $stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Video silindi.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Video bulunamadı veya silinemedi.']);
    }
    $stmt->close();
}

$conn->close();
?>