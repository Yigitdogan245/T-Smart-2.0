<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$sql = "SELECT * FROM Kusaklar ORDER BY Kusak_ID";
$res = $conn->query($sql);
$kusaklar = [];
while ($row = $res->fetch_assoc()) {
    $kusaklar[] = $row;
}

echo json_encode(['success'=>true,'data'=>$kusaklar]);
$conn->close();
?>