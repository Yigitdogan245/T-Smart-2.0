<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$sporcu_id = intval($_GET['sporcu_id'] ?? 0);
$kusak     = trim($_GET['kusak'] ?? '');
$tip       = trim($_GET['tip'] ?? '');
$donem     = trim($_GET['donem'] ?? '');

function addDonem(&$sql, &$types, &$params, $donem){
    if ($donem === '1ay') {
        $sql .= " AND m.Tarih >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)";
    } elseif ($donem === '3ay' || $donem === '') {
        $sql .= " AND m.Tarih >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
    } elseif ($donem === 'buay') {
        $sql .= " AND MONTH(m.Tarih)=MONTH(CURDATE()) AND YEAR(m.Tarih)=YEAR(CURDATE())";
    } elseif ($donem === 'buyil') {
        $sql .= " AND YEAR(m.Tarih)=YEAR(CURDATE())";
    }
}

function canonicalCase(){
    return "CASE
      WHEN k.Kusak_Adi LIKE '%Kırmızı%' AND k.Kusak_Adi LIKE '%Siyah%' THEN 'Kırmızı-Siyah'
      WHEN k.Kusak_Adi LIKE '%Siyah%' AND k.Kusak_Adi LIKE '%Kırmızı%' THEN 'Kırmızı-Siyah'
      WHEN k.Kusak_Adi LIKE '%Mavi%' AND k.Kusak_Adi LIKE '%Kırmızı%' THEN 'Mavi-Kırmızı'
      WHEN k.Kusak_Adi LIKE '%Kırmızı%' AND k.Kusak_Adi LIKE '%Mavi%' THEN 'Mavi-Kırmızı'
      WHEN k.Kusak_Adi LIKE '%Yeşil%' AND k.Kusak_Adi LIKE '%Mavi%' THEN 'Yeşil-Mavi'
      WHEN k.Kusak_Adi LIKE '%Mavi%' AND k.Kusak_Adi LIKE '%Yeşil%' THEN 'Yeşil-Mavi'
      WHEN k.Kusak_Adi LIKE '%Sarı%' AND k.Kusak_Adi LIKE '%Yeşil%' THEN 'Sarı-Yeşil'
      WHEN k.Kusak_Adi LIKE '%Yeşil%' AND k.Kusak_Adi LIKE '%Sarı%' THEN 'Sarı-Yeşil'
      WHEN k.Kusak_Adi LIKE '%Beyaz%' THEN 'Beyaz'
      WHEN k.Kusak_Adi LIKE '%Sarı%' THEN 'Sarı'
      WHEN k.Kusak_Adi LIKE '%Yeşil%' THEN 'Yeşil'
      WHEN k.Kusak_Adi LIKE '%Kırmızı%' THEN 'Kırmızı'
      WHEN k.Kusak_Adi LIKE '%Siyah%' THEN 'Siyah'
      ELSE k.Kusak_Adi END";
}

if ($tip === 'gelisim' && $sporcu_id) {
    $limit = 6;
    $dateSql = '';
    if ($donem === '3ay') $dateSql = " AND m.Tarih >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
    elseif ($donem === '1ay') $dateSql = " AND m.Tarih >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)";
    elseif ($donem === 'tum') $limit = 999;

    $sql = "SELECT m.Mac_ID, m.Tarih, m.Skor, COALESCE(SUM(h.Frekans),0) AS toplam_hata
            FROM Maclar m
            LEFT JOIN Hatalar h ON m.Mac_ID = h.Mac_ID
            WHERE m.Sporcu_ID = ? $dateSql
            GROUP BY m.Mac_ID, m.Tarih, m.Skor
            ORDER BY m.Tarih ASC
            LIMIT $limit";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $sporcu_id);
    $stmt->execute();
    $maclar = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $detaySql = "SELECT h.Hata_Tipi, SUM(h.Frekans) AS toplam_frekans
                 FROM Hatalar h
                 JOIN Maclar m ON h.Mac_ID = m.Mac_ID
                 WHERE m.Sporcu_ID = ? $dateSql
                 GROUP BY h.Hata_Tipi
                 ORDER BY toplam_frekans DESC";
    $stmt = $conn->prepare($detaySql);
    $stmt->bind_param('i', $sporcu_id);
    $stmt->execute();
    $detaylar = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    echo json_encode(['success'=>true,'maclar'=>$maclar,'detaylar'=>$detaylar]);
    $conn->close();
    exit;
}

$canon = canonicalCase();
$sql = "SELECT h.Hata_Tipi, SUM(h.Frekans) AS toplam_frekans, COUNT(DISTINCT m.Mac_ID) AS mac_sayisi
        FROM Hatalar h
        JOIN Maclar m ON h.Mac_ID = m.Mac_ID
        JOIN Sporcular s ON m.Sporcu_ID = s.Sporcu_ID
        JOIN Kusaklar k ON s.Kusak_ID = k.Kusak_ID
        WHERE 1=1";
$params = [];
$types = '';
if ($sporcu_id) { $sql .= " AND s.Sporcu_ID = ?"; $types.='i'; $params[]=$sporcu_id; }
if ($kusak) { $sql .= " AND ($canon) = ?"; $types.='s'; $params[]=$kusak; }
addDonem($sql,$types,$params,$donem);
$sql .= " GROUP BY h.Hata_Tipi ORDER BY toplam_frekans DESC";
$stmt = $conn->prepare($sql);
if ($types) $stmt->bind_param($types, ...$params);
$stmt->execute();
$hatalar = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$toplam_hata = array_sum(array_map(fn($x)=>intval($x['toplam_frekans']), $hatalar));
$kritik_hata = !empty($hatalar) ? $hatalar[0]['Hata_Tipi'] : '-';

$macSql = "SELECT COUNT(DISTINCT m.Mac_ID) AS mac_sayisi
           FROM Maclar m
           JOIN Sporcular s ON m.Sporcu_ID=s.Sporcu_ID
           JOIN Kusaklar k ON s.Kusak_ID=k.Kusak_ID
           WHERE 1=1";
$p2=[]; $t2='';
if ($sporcu_id) { $macSql .= " AND s.Sporcu_ID=?"; $t2.='i'; $p2[]=$sporcu_id; }
if ($kusak) { $macSql .= " AND ($canon)=?"; $t2.='s'; $p2[]=$kusak; }
addDonem($macSql,$t2,$p2,$donem);
$stmt = $conn->prepare($macSql);
if ($t2) $stmt->bind_param($t2, ...$p2);
$stmt->execute();
$mac_sayisi = intval($stmt->get_result()->fetch_assoc()['mac_sayisi'] ?? 0);
$stmt->close();
$ortalama = $mac_sayisi > 0 ? round($toplam_hata / $mac_sayisi, 1) : 0;

$topSql = "SELECT s.Ad_Soyad, s.Kulup_Adi, k.Kusak_Adi,
                  SUM(h.Frekans) AS toplam_hata,
                  COUNT(DISTINCT m.Mac_ID) AS mac_sayisi,
                  (SELECT h2.Hata_Tipi FROM Hatalar h2 JOIN Maclar m2 ON h2.Mac_ID=m2.Mac_ID WHERE m2.Sporcu_ID=s.Sporcu_ID GROUP BY h2.Hata_Tipi ORDER BY SUM(h2.Frekans) DESC LIMIT 1) AS en_sik_hata
           FROM Sporcular s
           JOIN Kusaklar k ON s.Kusak_ID=k.Kusak_ID
           JOIN Maclar m ON s.Sporcu_ID=m.Sporcu_ID
           JOIN Hatalar h ON m.Mac_ID=h.Mac_ID
           WHERE 1=1";
$p3=[]; $t3='';
if ($kusak) { $topSql .= " AND ($canon)=?"; $t3.='s'; $p3[]=$kusak; }
addDonem($topSql,$t3,$p3,$donem);
$topSql .= " GROUP BY s.Sporcu_ID ORDER BY toplam_hata DESC LIMIT 5";
$stmt = $conn->prepare($topSql);
if ($t3) $stmt->bind_param($t3, ...$p3);
$stmt->execute();
$top5 = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();
foreach ($top5 as &$r) $r['ortalama'] = intval($r['mac_sayisi']) ? round(intval($r['toplam_hata'])/intval($r['mac_sayisi']),1) : 0;

$avgSql = "SELECT ($canon) AS kusak, COALESCE(SUM(h.Frekans),0) AS toplam_hata, COUNT(DISTINCT m.Mac_ID) AS mac_sayisi
           FROM Kusaklar k
           LEFT JOIN Sporcular s ON s.Kusak_ID=k.Kusak_ID
           LEFT JOIN Maclar m ON m.Sporcu_ID=s.Sporcu_ID
           LEFT JOIN Hatalar h ON h.Mac_ID=m.Mac_ID
           GROUP BY kusak";
$res = $conn->query($avgSql);
$kusak_ortalama = [];
while($row = $res->fetch_assoc()){
    $ms = intval($row['mac_sayisi']);
    $kusak_ortalama[] = ['kusak'=>$row['kusak'], 'ortalama'=>$ms ? round(intval($row['toplam_hata'])/$ms,1) : 0];
}


echo json_encode(['success'=>true,'data'=>$hatalar,'toplam_hata'=>$toplam_hata,'kritik_hata'=>$kritik_hata,'mac_sayisi'=>$mac_sayisi,'ortalama'=>$ortalama,'top5'=>$top5,'kusak_ortalama'=>$kusak_ortalama]);
$conn->close();
?>