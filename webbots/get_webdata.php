<?php
$url = $_GET['url'];
if (strlen($url) == 0) {
  echo "<pre>Error: URL required</pre>";
} else {
  echo file_get_contents($url);
}
