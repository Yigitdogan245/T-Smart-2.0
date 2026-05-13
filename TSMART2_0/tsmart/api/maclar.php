<?php
// =============================================
// T-Smart 2.0 — Maçlar API
// GET  → Maç listesi (sporcu_id, sonuc, donem filtresi)
// POST → Yeni maç + hata kaydı ekle
// =============================================

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

//  GET: Maç listesini getir 
if ($method === 'GET') {
    $sporcu_id = intval($_GET['sporcu_id'] ?? 0);
    $sonuc     = $_GET['sonuc']  ?? '';
    $donem     = $_GET['donem']  ?? '';

    $sql = "SELECT
                m.Mac_ID,
                m.Rakip_Adi,
                m.Tarih,
                m.Skor,
                s.Ad_Soyad,
                s.Sporcu_ID,
                s.Kulup_Adi AS Organizasyon_Adi,
                s.Kulup_Adi AS Rakip_Kulup,
                k.Kusak_Adi
            FROM Maclar m
            JOIN Sporcular s ON m.Sporcu_ID = s.Sporcu_ID
            JOIN Kusaklar k  ON s.Kusak_ID  = k.Kusak_ID
            WHERE 1=1";

    $params = [];
    $types  = '';

    if ($sporcu_id) {
        $sql .= " AND m.Sporcu_ID = ?";
        $types .= 'i';
        $params[] = $sporcu_id;
    }

    // Dönem filtresi
    if ($donem === 'buay') {
        $sql .= " AND MONTH(m.Tarih) = MONTH(CURDATE()) AND YEAR(m.Tarih) = YEAR(CURDATE())";
    } elseif ($donem === 'buyil') {
        $sql .= " AND YEAR(m.Tarih) = YEAR(CURDATE())";
    }

    $sql .= " ORDER BY m.Tarih DESC";

    $stmt = $conn->prepare($sql);
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $maclar = [];
    while ($row = $result->fetch_assoc()) {
        // Maça ait hataları da çek
        $hstmt = $conn->prepare(
            "SELECT Hata_Tipi, Frekans FROM Hatalar WHERE Mac_ID = ? ORDER BY Frekans DESC"
        );
        $hstmt->bind_param('i', $row['Mac_ID']);
        $hstmt->execute();
        $hatalar = $hstmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $hstmt->close();

        // Skoru parse ederek sonucu hesapla
        $skorParts = explode('-', $row['Skor']);
        $spuan = intval($skorParts[0] ?? 0);
        $rpuan = intval($skorParts[1] ?? 0);
        if ($spuan > $rpuan)      $row['sonuc'] = 'Galibiyet';
        elseif ($spuan < $rpuan)  $row['sonuc'] = 'Mağlubiyet';
        else                      $row['sonuc'] = 'Beraberlik';

        // Filtreye uymuyorsa atla
        if ($sonuc && $row['sonuc'] !== $sonuc) continue;

        $row['hatalar'] = $hatalar;
        $maclar[] = $row;
    }
    $stmt->close();

    // İstatistikler
    $toplam   = count($maclar);
    $galibiyet = count(array_filter($maclar, fn($m) => $m['sonuc'] === 'Galibiyet'));
    $maglubiyet = $toplam - $galibiyet;
    $oran = $toplam > 0 ? round($galibiyet / $toplam * 100) : 0;

    echo json_encode([
        'success' => true,
        'data'    => $maclar,
        'istatistik' => [
            'toplam'    => $toplam,
            'galibiyet' => $galibiyet,
            'maglubiyet'=> $maglubiyet,
            'oran'      => $oran,
        ]
    ]);
}

//  POST: Yeni maç + hatalar kaydet 
elseif ($method === 'POST') {
    $sporcu_id = intval($_POST['sporcu_id'] ?? 0);
    $rakip_adi = trim($_POST['rakip_adi']  ?? '');
    $tarih     = trim($_POST['tarih']      ?? date('Y-m-d'));
    $skor      = trim($_POST['skor']       ?? '0-0');
    $hatalar   = $_POST['hatalar']         ?? []; // dizi olarak gelecek

    if (!$sporcu_id || !$rakip_adi) {
        echo json_encode(['success' => false, 'message' => 'Sporcu ve rakip bilgisi zorunludur.']);
        exit;
    }

    // Maçı ekle
    $stmt = $conn->prepare(
        "INSERT INTO Maclar (Sporcu_ID, Rakip_Adi, Tarih, Skor) VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param('isss', $sporcu_id, $rakip_adi, $tarih, $skor);

    if (!$stmt->execute()) {
        echo json_encode(['success' => false, 'message' => 'Maç kaydedilemedi.']);
        $stmt->close();
        exit;
    }

    $mac_id = $conn->insert_id;
    $stmt->close();

    // Hataları ekle
    if (!empty($hatalar)) {
        $hstmt = $conn->prepare(
            "INSERT INTO Hatalar (Mac_ID, Hata_Tipi, Frekans) VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE Frekans = Frekans + 1"
        );
        foreach ($hatalar as $hata_tipi) {
            $hata_tipi = trim($hata_tipi);
            if ($hata_tipi) {
                $hstmt->bind_param('is', $mac_id, $hata_tipi);
                $hstmt->execute();
            }
        }
        $hstmt->close();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Maç ve hatalar başarıyla kaydedildi.',
        'mac_id'  => $mac_id
    ]);
}

$conn->close();
?>