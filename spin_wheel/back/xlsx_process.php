<?php
function readXlsxDirectly($filePath)
{
    $zip = new ZipArchive();
    if ($zip->open($filePath) !== TRUE) {
        return false;
    }

    // 1. Read Shared Strings (Handles plain <t> and rich text <r><t>)
    $sharedStrings = [];
    if (($index = $zip->locateName('xl/sharedStrings.xml')) !== false) {
        $xml = simplexml_load_string($zip->getFromIndex($index));
        foreach ($xml->si as $val) {
            if (isset($val->t)) {
                $sharedStrings[] = (string) $val->t;
            } else {
                $text = '';
                foreach ($val->r as $run) {
                    $text .= (string) $run->t;
                }
                $sharedStrings[] = $text;
            }
        }
    }

    // 2. Read Worksheet XML safely
    $sheetXmlContent = $zip->getFromName('xl/worksheets/sheet1.xml');
    $zip->close();

    if ($sheetXmlContent === false) {
        return false;
    }

    $sheetXml = simplexml_load_string($sheetXmlContent);
    if ($sheetXml === false) {
        return false;
    }

    $rows = [];
    foreach ($sheetXml->sheetData->row as $row) {
        $rowData = [];
        $fallbackIndex = 0;

        foreach ($row->c as $cell) {
            // Case normalization & fallback index for missing 'r' attributes
            $cellRef = strtolower((string) ($cell['r'] ?? ''));

            if ($cellRef !== '' && preg_match('/[a-z]+/', $cellRef, $matches)) {
                $colLetter = $matches[0];
                $colIndex = 0;
                for ($i = 0; $i < strlen($colLetter); $i++) {
                    $colIndex = $colIndex * 26 + (ord($colLetter[$i]) - 96);
                }
                $colIndex -= 1;
                $fallbackIndex = $colIndex + 1;
            } else {
                $colIndex = $fallbackIndex++;
            }

            // Read value based on cell type ('s' = shared string, 'inlineStr' = inline string)
            $type = (string) ($cell['t'] ?? '');
            if ($type === 's') {
                $value = $sharedStrings[(int) $cell->v] ?? '';
            } elseif ($type === 'inlineStr') {
                $value = (string) ($cell->is->t ?? '');
            } else {
                $value = (string) ($cell->v ?? '');
            }

            $rowData[$colIndex] = $value;
        }
        $rows[] = $rowData;
    }

    if (empty($rows)) {
        return [];
    }

    $headers = array_shift($rows);
    $finalData = [];

    foreach ($rows as $row) {
        $item = [];
        $hasData = false;

        foreach ($headers as $index => $key) {
            // Convert header key to lowercase and trim surrounding whitespace
            $key = strtolower(trim((string) $key));
            if ($key === '') {
                continue; // Skip columns without a valid header name
            }

            $val = $row[$index] ?? null;
            $item[$key] = $val;

            if ($val !== null && trim((string) $val) !== '') {
                $hasData = true;
            }
        }

        if ($hasData) {
            $finalData[] = $item;
        }
    }

    return $finalData;
}

// 1. Check if a file was uploaded via POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['xlsxFile'])) {

    // Read directly from PHP's temporary file location in RAM
    $tmpFilePath = $_FILES['xlsxFile']['tmp_name'];
    $parsedData = readXlsxDirectly($tmpFilePath);

    if ($parsedData === false) {
        die("Error reading XLSX file.");
    }

    // 2. Output HTML & JS to store data in the browser, then redirect
    ?>
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <title>Processing...</title>
    </head>

    <body>
        <p>Processing data, please wait...</p>
        <script>
            // Transfer parsed PHP array to JavaScript
            const excelData = <?php echo json_encode($parsedData); ?>;

            // Save inside client-side sessionStorage
            sessionStorage.setItem('wheel_data', JSON.stringify(excelData));
            console.log(sessionStorage.getItem('wheel_data'));

            // Redirect to target page
            window.location.href = '/spin_wheel/front/condition_selection.php';
        </script>
    </body>

    </html>
    <?php
    exit();
}