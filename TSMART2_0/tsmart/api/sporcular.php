<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

function has_col($conn, $table, $col) {
    $table = $conn->real_escape_string($table);
    $col = $conn->real_escape_string($col);
    $res = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$col'");
    return $res && $res->num_rows > 0;
}
function postv($key, $default='') { return trim($_POST[$key] ?? $default); }

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $id = intval($_GET['id'] ?? 0);
    $kusak_filtre = trim($_GET['kusak'] ?? '');

    $hasAntrenor = has_col($conn,'Sporcular','Antrenor_ID');

    $extra = [];
    $extra[] = $hasAntrenor ? "s.Antrenor_ID" : "NULL AS Antrenor_ID";
    $extra[] = $hasAntrenor ? "COALESCE(a.Kullanici_Adi, NULL) AS Antrenor_Adi" : "NULL AS Antrenor_Adi";

    $sql = "SELECT
                s.Sporcu_ID,
                s.Kullanici_ID,
                s.Ad_Soyad,
                s.Kulup_Adi,
                k.Kusak_Adi,
                k.Kusak_ID,
                u.Kullanici_Adi,
                " . implode(",\n                ", $extra) . ",
                COUNT(DISTINCT m.Mac_ID) AS toplam_mac,
                COALESCE(SUM(
                    CASE
                        WHEN CAST(SUBSTRING_INDEX(m.Skor, '-', 1) AS UNSIGNED)
                           > CAST(SUBSTRING_INDEX(m.Skor, '-', -1) AS UNSIGNED)
                        THEN 1 ELSE 0
                    END
                ),0) AS galibiyet
            FROM Sporcular s
            JOIN Kullanicilar u ON s.Kullanici_ID = u.Kullanici_ID
            JOIN Kusaklar k ON s.Kusak_ID = k.Kusak_ID
            " . ($hasAntrenor ? "LEFT JOIN Kullanicilar a ON s.Antrenor_ID = a.Kullanici_ID" : "") . "
            LEFT JOIN Maclar m ON s.Sporcu_ID = m.Sporcu_ID";

    $where = [];
    $types = '';
    $params = [];
    if ($id) { $where[] = "s.Sporcu_ID = ?"; $types .= 'i'; $params[] = $id; }
    if ($kusak_filtre) { $where[] = "k.Kusak_Adi = ?"; $types .= 's'; $params[] = $kusak_filtre; }
    if ($where) $sql .= " WHERE " . implode(" AND ", $where);
    $sql .= " GROUP BY s.Sporcu_ID ORDER BY s.Ad_Soyad";

    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $sporcular = [];
    while ($row = $result->fetch_assoc()) {
        $hstmt = $conn->prepare(
            "SELECT h.Hata_Tipi, SUM(h.Frekans) AS toplam
             FROM Hatalar h
             JOIN Maclar m ON h.Mac_ID = m.Mac_ID
             WHERE m.Sporcu_ID = ?
             GROUP BY h.Hata_Tipi
             ORDER BY toplam DESC
             LIMIT 1"
        );
        $hstmt->bind_param('i', $row['Sporcu_ID']);
        $hstmt->execute();
        $hata = $hstmt->get_result()->fetch_assoc();
        $hstmt->close();
        $row['en_sik_hata'] = $hata['Hata_Tipi'] ?? '-';
        $sporcular[] = $row;
    }
    $stmt->close();

    echo json_encode(['success' => true, 'data' => $id ? ($sporcular[0] ?? null) : $sporcular]);
    $conn->close();
    exit;
}

if ($method === 'POST') {
    $sporcu_id = intval($_POST['sporcu_id'] ?? 0);
    $ad_soyad = postv('ad_soyad');
    $kulup_adi = postv('kulup_adi', 'Belirtilmedi');
    $kusak_id = intval($_POST['kusak_id'] ?? 0);
    $kullanici_id = intval($_POST['kullanici_id'] ?? 0);
    $kullanici_adi = postv('kullanici_adi');
    $sifre = postv('sifre');

    if (!$ad_soyad || !$kusak_id || !$kullanici_adi) {
        echo json_encode(['success' => false, 'message' => 'Ad soyad, kullanıcı adı ve kuşak zorunludur.']);
        exit;
    }

    if ($sporcu_id && !$kullanici_id) {
        $r = $conn->prepare("SELECT Kullanici_ID FROM Sporcular WHERE Sporcu_ID = ?");
        $r->bind_param('i', $sporcu_id);
        $r->execute();
        $row = $r->get_result()->fetch_assoc();
        $r->close();
        $kullanici_id = intval($row['Kullanici_ID'] ?? 0);
    }

    if (!$kullanici_id) {
        if (!$sifre) {
            echo json_encode(['success' => false, 'message' => 'Yeni sporcu için şifre zorunludur.']);
            exit;
        }
        $rol = 'sporcu';
        $stmt = $conn->prepare("INSERT INTO Kullanicilar (Kullanici_Adi, Sifre, Rol) VALUES (?, ?, ?)");
        $stmt->bind_param('sss', $kullanici_adi, $sifre, $rol);
        if (!$stmt->execute()) {
            echo json_encode(['success'=>false,'message'=>'Kullanıcı oluşturulamadı. Kullanıcı adı alınmış olabilir.']);
            exit;
        }
        $kullanici_id = $conn->insert_id;
        $stmt->close();
    } else {
        if ($sifre) {
            $stmt = $conn->prepare("UPDATE Kullanicilar SET Kullanici_Adi=?, Sifre=? WHERE Kullanici_ID=?");
            $stmt->bind_param('ssi', $kullanici_adi, $sifre, $kullanici_id);
        } else {
            $stmt = $conn->prepare("UPDATE Kullanicilar SET Kullanici_Adi=? WHERE Kullanici_ID=?");
            $stmt->bind_param('si', $kullanici_adi, $kullanici_id);
        }
        $stmt->execute();
        $stmt->close();
    }

    $optional = [
        'Antrenor_ID' => (isset($_POST['antrenor_id']) && intval($_POST['antrenor_id']) > 0) ? intval($_POST['antrenor_id']) : null
    ];

    if ($sporcu_id) {
        $sets = ['Kullanici_ID=?','Kusak_ID=?','Ad_Soyad=?','Kulup_Adi=?'];
        $types = 'iiss';
        $params = [$kullanici_id, $kusak_id, $ad_soyad, $kulup_adi];
        foreach ($optional as $col=>$val) {
            if (has_col($conn,'Sporcular',$col)) {
                $sets[] = "$col=?";
                if ($col === 'Antrenor_ID') { $types .= 'i'; $params[] = intval($val ?? 0); }
                else { $types .= 's'; $params[] = $val; }
            }
        }
        $types .= 'i'; $params[] = $sporcu_id;
        $sql = "UPDATE Sporcular SET " . implode(',', $sets) . " WHERE Sporcu_ID=?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $ok = $stmt->execute();
        $stmt->close();
        echo json_encode(['success'=>$ok,'message'=>$ok?'Sporcu güncellendi.':'Sporcu güncellenemedi.','sporcu_id'=>$sporcu_id]);
        $conn->close();
        exit;
    }

    $cols = ['Kullanici_ID','Kusak_ID','Ad_Soyad','Kulup_Adi'];
    $place = ['?','?','?','?'];
    $types = 'iiss';
    $params = [$kullanici_id, $kusak_id, $ad_soyad, $kulup_adi];
    foreach ($optional as $col=>$val) {
        if (has_col($conn,'Sporcular',$col)) {
            $cols[] = $col; $place[] = '?';
            if ($col === 'Antrenor_ID') { $types .= 'i'; $params[] = intval($val ?? 0); }
            else { $types .= 's'; $params[] = $val; }
        }
    }
    $sql = "INSERT INTO Sporcular (" . implode(',', $cols) . ") VALUES (" . implode(',', $place) . ")";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    if ($stmt->execute()) {
        echo json_encode(['success'=>true,'message'=>'Sporcu eklendi.','sporcu_id'=>$conn->insert_id]);
    } else {
        echo json_encode(['success'=>false,'message'=>'Sporcu eklenirken hata oluştu.']);
    }
    $stmt->close();
    $conn->close();
    exit;
}

$conn->close();
echo json_encode(['success'=>false,'message'=>'Geçersiz istek.']);
?>