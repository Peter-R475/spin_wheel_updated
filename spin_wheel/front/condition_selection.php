<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prize Configuration</title>
    <link rel="stylesheet" href="style/condi_s.css">
</head>

<body>

    <div class="table-container">
        <h2>Prize Nationality Configuration</h2>

        <table id="prizeTable" border="1"
            style="width:100%; text-align:left; border-collapse:collapse; margin-bottom:15px;">
            <thead>
                <tr>
                    <th>Nationality</th>
                    <th>Chances</th>
                </tr>
            </thead>
            <tbody id="prizeTableBody">
            </tbody>
        </table>


        <div class="form-group">
            <button id="submitBtn" class="btn-submit">Continue</button>
        </div>

        <!-- Container to render selected_wheel_data in table form -->
        <div id="selectedWheelContainer"
            style="margin-top: 25px; padding: 15px; border: 1px solid #ccc; display: none;">
            <h3>Configured Prize Selection</h3>

            <table id="selectedWheelTable" border="1"
                style="width:100%; text-align:left; border-collapse:collapse; margin-bottom:15px;">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nationality</th>
                        <th>Number of Prize</th>
                    </tr>
                </thead>
                <tbody id="selectedWheelTableBody">
                </tbody>
            </table>
        </div>

        <script src="../back/seperate_na.js"></script>
</body>

<script>
    if (!sessionStorage.getItem('wheel_data')) {
        window.location.href = 'index.php';
    }
    if (sessionStorage.getItem('data_ForWheel')) {
        window.location.href = 'spin_wheel.php';
    }


    console.log(sessionStorage.getItem('data_ForWheel'));
</script>

</html>