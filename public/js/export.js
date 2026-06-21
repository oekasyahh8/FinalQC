/* =============================================
   QCC Export — Lazy-load html2canvas & Export
   ============================================= */

const HTML2CANVAS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

// --- Lazy Load html2canvas ---
let _html2canvasLoading = null;

async function lazyLoadHtml2Canvas() {
    if (typeof html2canvas !== 'undefined') return;

    if (_html2canvasLoading) return _html2canvasLoading;

    _html2canvasLoading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = HTML2CANVAS_URL;
        script.onload = () => {
            _html2canvasLoading = null;
            resolve();
        };
        script.onerror = () => {
            _html2canvasLoading = null;
            reject(new Error('Gagal memuat library export. Periksa koneksi internet Anda.'));
        };
        document.head.appendChild(script);
    });

    return _html2canvasLoading;
}

// --- Universal Export Function ---
async function exportPageAsPNG(options) {
    const {
        exportBtnId = 'exportBtn',
        fileName = 'Laporan-QCC.png',
        chartInstance = null,
        floatInterval = null,
        onBeforeExport = null,
        onAfterExport = null
    } = options || {};

    const exportBtn = document.getElementById(exportBtnId);
    if (!exportBtn) return;

    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '📸 Memproses...';
    exportBtn.disabled = true;

    // Create a style block for the spinner animation if not present
    if (!document.getElementById('qcc-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'qcc-spinner-style';
        style.innerHTML = `
            @keyframes qcc-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // Prepare variables for chart canvas migration
    let chartPlaceholder = null;
    let originalParent = null;
    let canvasId = '';
    let exportContainer = null;

    try {
        // Load html2canvas
        await lazyLoadHtml2Canvas();

        if (typeof onBeforeExport === 'function') {
            onBeforeExport();
        }

        // Detect page type from chart canvas
        let isHistogram = false;
        let isScatter = false;
        let isPareto = false;
        let isControlChart = false;

        if (chartInstance && chartInstance.canvas) {
            canvasId = chartInstance.canvas.id;
            if (canvasId === 'histogram') isHistogram = true;
            else if (canvasId === 'scatterChart') isScatter = true;
            else if (canvasId === 'paretoChart') isPareto = true;
            else if (canvasId === 'controlChart') isControlChart = true;
        }

        // Get header title
        let pageTitle = "Laporan Analisis QCC";
        const headerTitleEl = document.querySelector(".header-title");
        if (headerTitleEl) {
            pageTitle = headerTitleEl.innerText.trim();
        }

        // Stop floating animation if any
        if (floatInterval && floatInterval.id) {
            clearInterval(floatInterval.id);
        }

        // Extract raw data inputs
        let leftPanelHTML = '';
        if (isHistogram) {
            const values = Array.from(document.querySelectorAll("#inputs input"))
                .map(i => i.value.trim())
                .filter(v => v !== "");
            const lsl = document.getElementById("lslInput") ? document.getElementById("lslInput").value.trim() : "";
            const usl = document.getElementById("uslInput") ? document.getElementById("uslInput").value.trim() : "";

            leftPanelHTML = `<div class="export-card-title">📝 Data Observasi (${values.length})</div>`;
            if (values.length === 0) {
                leftPanelHTML += `<div style="text-align:center; margin-top:100px; color:var(--text-muted); font-size:15px;">Tidak ada data observasi</div>`;
            } else {
                leftPanelHTML += `<div class="export-table-wrapper">`;
                if (values.length <= 15) {
                    leftPanelHTML += `
                    <table class="export-table">
                        <thead>
                            <tr><th style="width: 40px;">No</th><th>Nilai (mm)</th></tr>
                        </thead>
                        <tbody>
                            ${values.map((v, idx) => `<tr><td>${idx + 1}</td><td>${v}</td></tr>`).join("")}
                        </tbody>
                    </table>`;
                } else {
                    const mid = Math.ceil(values.length / 2);
                    const col1 = values.slice(0, mid);
                    const col2 = values.slice(mid);
                    leftPanelHTML += `
                    <div class="multi-table-container">
                        <table class="export-table">
                            <thead>
                                <tr><th style="width: 40px;">No</th><th>Nilai</th></tr>
                            </thead>
                            <tbody>
                                ${col1.map((v, idx) => `<tr><td>${idx + 1}</td><td>${v}</td></tr>`).join("")}
                            </tbody>
                        </table>
                        <table class="export-table">
                            <thead>
                                <tr><th style="width: 40px;">No</th><th>Nilai</th></tr>
                            </thead>
                            <tbody>
                                ${col2.map((v, idx) => `<tr><td>${idx + mid + 1}</td><td>${v}</td></tr>`).join("")}
                            </tbody>
                        </table>
                    </div>`;
                }
                leftPanelHTML += `</div>`;
            }
            if (lsl !== "" || usl !== "") {
                leftPanelHTML += `
                <div class="export-spec-box">
                    Batas Spesifikasi Produk:<br>
                    LSL (Bawah): <b>${lsl || "-"}</b> &nbsp;&nbsp;|&nbsp;&nbsp; USL (Atas): <b>${usl || "-"}</b>
                </div>`;
            }
        }
        else if (isControlChart) {
            const values = Array.from(document.querySelectorAll("#inputContainer input"))
                .map(i => i.value.trim())
                .filter(v => v !== "");

            const uclVal = document.getElementById("val-ucl") ? document.getElementById("val-ucl").innerText.trim() : "";
            const clVal = document.getElementById("val-cl") ? document.getElementById("val-cl").innerText.trim() : "";
            const lclVal = document.getElementById("val-lcl") ? document.getElementById("val-lcl").innerText.trim() : "";

            leftPanelHTML = `<div class="export-card-title">📝 Data Observasi (${values.length})</div>`;
            if (values.length === 0) {
                leftPanelHTML += `<div style="text-align:center; margin-top:100px; color:var(--text-muted); font-size:15px;">Tidak ada data observasi</div>`;
            } else {
                leftPanelHTML += `<div class="export-table-wrapper">`;
                if (values.length <= 12) {
                    leftPanelHTML += `
                    <table class="export-table">
                        <thead>
                            <tr><th style="width: 40px;">No</th><th>Nilai (Part)</th></tr>
                        </thead>
                        <tbody>
                            ${values.map((v, idx) => `<tr><td>${idx + 1}</td><td>${v}</td></tr>`).join("")}
                        </tbody>
                    </table>`;
                } else {
                    const mid = Math.ceil(values.length / 2);
                    const col1 = values.slice(0, mid);
                    const col2 = values.slice(mid);
                    leftPanelHTML += `
                    <div class="multi-table-container">
                        <table class="export-table">
                            <thead>
                                <tr><th style="width: 40px;">No</th><th>Nilai</th></tr>
                            </thead>
                            <tbody>
                                ${col1.map((v, idx) => `<tr><td>${idx + 1}</td><td>${v}</td></tr>`).join("")}
                            </tbody>
                        </table>
                        <table class="export-table">
                            <thead>
                                <tr><th style="width: 40px;">No</th><th>Nilai</th></tr>
                            </thead>
                            <tbody>
                                ${col2.map((v, idx) => `<tr><td>${idx + mid + 1}</td><td>${v}</td></tr>`).join("")}
                            </tbody>
                        </table>
                    </div>`;
                }
                leftPanelHTML += `</div>`;
            }
            if (uclVal !== "" || clVal !== "" || lclVal !== "") {
                leftPanelHTML += `
                <div class="export-spec-box">
                    Batas Kontrol Aktif:<br>
                    UCL: <b>${uclVal}</b> &nbsp;|&nbsp; CL: <b>${clVal}</b> &nbsp;|&nbsp; LCL: <b>${lclVal}</b>
                </div>`;
            }
        }
        else if (isScatter) {
            const xInputs = Array.from(document.querySelectorAll("#xInputs input"));
            const yInputs = Array.from(document.querySelectorAll("#yInputs input"));
            const xTitle = document.getElementById("xTitleInput") ? document.getElementById("xTitleInput").value.trim() : "Variabel X";
            const yTitle = document.getElementById("yTitleInput") ? document.getElementById("yTitleInput").value.trim() : "Variabel Y";

            const pairs = [];
            for (let i = 0; i < xInputs.length; i++) {
                const xv = xInputs[i].value.trim();
                const yv = yInputs[i] ? yInputs[i].value.trim() : "";
                if (xv !== "" && yv !== "") {
                    pairs.push({ x: xv, y: yv });
                }
            }

            leftPanelHTML = `<div class="export-card-title">📝 Pasangan Data (${pairs.length})</div>`;
            leftPanelHTML += `
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4; border-bottom: 1px dashed var(--glass-border); padding-bottom: 5px;">
                <b>X (Bebas):</b> ${xTitle}<br>
                <b>Y (Terikat):</b> ${yTitle}
            </div>`;

            if (pairs.length === 0) {
                leftPanelHTML += `<div style="text-align:center; margin-top:100px; color:var(--text-muted); font-size:15px;">Tidak ada pasangan data</div>`;
            } else {
                leftPanelHTML += `<div class="export-table-wrapper">`;
                if (pairs.length <= 15) {
                    leftPanelHTML += `
                    <table class="export-table">
                        <thead>
                            <tr><th style="width: 40px;">No</th><th>X</th><th>Y</th></tr>
                        </thead>
                        <tbody>
                            ${pairs.map((p, idx) => `<tr><td>${idx + 1}</td><td>${p.x}</td><td>${p.y}</td></tr>`).join("")}
                        </tbody>
                    </table>`;
                } else {
                    const mid = Math.ceil(pairs.length / 2);
                    const col1 = pairs.slice(0, mid);
                    const col2 = pairs.slice(mid);
                    leftPanelHTML += `
                    <div class="multi-table-container">
                        <table class="export-table">
                            <thead>
                                <tr><th style="width: 40px;">No</th><th>X</th><th>Y</th></tr>
                            </thead>
                            <tbody>
                                ${col1.map((p, idx) => `<tr><td>${idx + 1}</td><td>${p.x}</td><td>${p.y}</td></tr>`).join("")}
                            </tbody>
                        </table>
                        <table class="export-table">
                            <thead>
                                <tr><th style="width: 40px;">No</th><th>X</th><th>Y</th></tr>
                            </thead>
                            <tbody>
                                ${col2.map((p, idx) => `<tr><td>${idx + mid + 1}</td><td>${p.x}</td><td>${p.y}</td></tr>`).join("")}
                            </tbody>
                        </table>
                    </div>`;
                }
                leftPanelHTML += `</div>`;
            }
        }
        else if (isPareto) {
            const rows = Array.from(document.querySelectorAll(".input-row"));
            const paretoData = [];
            rows.forEach((row) => {
                const catInput = row.children[0];
                const freqInput = row.children[1];
                if (catInput && freqInput) {
                    const cat = catInput.value.trim();
                    const freq = freqInput.value.trim();
                    if (cat !== "" && freq !== "") {
                        paretoData.push({ label: cat, freq: parseInt(freq, 10) });
                    }
                }
            });

            leftPanelHTML = `<div class="export-card-title">📝 Data Kategori Defect (${paretoData.length})</div>`;
            if (paretoData.length === 0) {
                leftPanelHTML += `<div style="text-align:center; margin-top:100px; color:var(--text-muted); font-size:15px;">Tidak ada data cacat</div>`;
            } else {
                leftPanelHTML += `
                <div class="export-table-wrapper">
                    <table class="export-table">
                        <thead>
                            <tr><th style="width: 40px;">No</th><th>Kategori / Jenis NG</th><th style="width: 90px; text-align: right;">Frekuensi</th></tr>
                        </thead>
                        <tbody>
                            ${paretoData.map((d, idx) => `<tr><td>${idx + 1}</td><td>${d.label}</td><td style="text-align: right; font-weight: 700; color: var(--primary);">${d.freq}</td></tr>`).join("")}
                        </tbody>
                    </table>
                </div>`;
            }
        }

        // Extract conclusion header and content
        const conclusionIconEl = document.getElementById("conclusionIcon") || document.querySelector(".conclusion-icon");
        const conclusionTextEl = document.getElementById("conclusionText") || document.querySelector(".conclusion-text");

        let conclusionTitle = "💡 Kesimpulan Analisis";
        if (conclusionIconEl) {
            conclusionTitle = conclusionIconEl.innerText || conclusionIconEl.textContent;
        }

        let conclusionBody = `<p style="color: var(--text-muted);">Tidak ada hasil kesimpulan analisis.</p>`;
        if (conclusionTextEl) {
            // Clone conclusion HTML to safely modify it (e.g. force open details tags)
            const conclusionClone = conclusionTextEl.cloneNode(true);

            // Expand details elements inside the conclusion clone
            const detailsElements = conclusionClone.querySelectorAll("details");
            detailsElements.forEach(d => d.setAttribute("open", "true"));

            // Hide interactive elements
            const elementsToHide = conclusionClone.querySelectorAll(".btn-focus-trigger, .chevron, .toggle-icon, button");
            elementsToHide.forEach(el => el.style.display = 'none');

            conclusionBody = conclusionClone.innerHTML;
        }

        // Extract basic statistics/parameters to show below the conclusion
        const statBoxes = Array.from(document.querySelectorAll(".stats-grid-2 .stat-box, .stats-grid-3 .stat-box, .stats-grid-4 .stat-box, .stats-grid-5 .stat-box, #statOutput .stat-box"));
        const statsList = statBoxes.map(box => {
            const titleEl = box.querySelector(".stat-title") || box.querySelector("span");
            let title = "";
            if (titleEl) {
                const titleClone = titleEl.cloneNode(true);
                const tooltip = titleClone.querySelector(".tooltip-container");
                if (tooltip) tooltip.remove();
                title = titleClone.textContent.replace(/\s+/g, ' ').trim();
            }

            const valueEl = box.querySelector(".stat-value") || box.querySelector("strong");
            const value = valueEl ? valueEl.textContent.replace(/\s+/g, ' ').trim() : "";

            return { title, value };
        }).filter(item => item.title !== "" && item.value !== "" && item.value !== "-");

        let statsHTML = "";
        if (statsList.length > 0) {
            let statsSectionTitle = "📊 Ringkasan Statistik";
            if (isHistogram) statsSectionTitle = "📊 Statistik Deskriptif";
            else if (isControlChart) statsSectionTitle = "📊 Parameter Batas Kontrol";
            else if (isPareto) statsSectionTitle = "📊 Ringkasan Pareto";
            else if (isScatter) statsSectionTitle = "📊 Ringkasan Statistik Regresi";

            statsHTML = `
            <div class="export-stats-section">
                <div class="export-stats-title">${statsSectionTitle}</div>
                <div class="export-stats-grid">
                    ${statsList.map(item => `
                        <div class="export-stat-box">
                            <span>${item.title}</span>
                            <strong>${item.value}</strong>
                        </div>
                    `).join("")}
                </div>
            </div>`;
        }

        // Create temporary 16:9 export container
        exportContainer = document.createElement('div');
        exportContainer.id = 'qcc-export-container';

        // Match user's active body background color exactly (including custom theme pickers)
        const activeBgColor = window.getComputedStyle(document.body).backgroundColor;
        exportContainer.style.backgroundColor = activeBgColor;

        // CSS rules specifically for this container
        const customStyle = `
            #qcc-export-container {
                position: fixed;
                left: -9999px;
                top: -9999px;
                width: 1600px;
                height: 900px;
                background-color: var(--bg);
                color: var(--text);
                padding: 40px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                z-index: -9999;
                font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            #qcc-export-container .export-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 3px solid var(--primary);
                padding-bottom: 15px;
                margin-bottom: 25px;
                height: 60px;
                box-sizing: border-box;
            }
            #qcc-export-container .export-header .export-title {
                font-size: 26px;
                font-weight: 800;
                color: var(--primary);
                margin: 0;
            }
            #qcc-export-container .export-header .export-meta {
                font-size: 14px;
                color: var(--text-muted);
                font-weight: 500;
            }
            #qcc-export-container .export-content {
                display: flex;
                flex: 1;
                gap: 25px;
                height: calc(100% - 85px);
                box-sizing: border-box;
            }
            #qcc-export-container .export-col {
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                height: 100%;
            }
            #qcc-export-container .col-left {
                width: 360px;
            }
            #qcc-export-container .col-middle {
                width: 750px;
            }
            #qcc-export-container .col-right {
                width: 385px;
            }
            #qcc-export-container .export-card {
                background: var(--card-bg);
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                padding: 20px;
                box-sizing: border-box;
                height: 100%;
                display: flex;
                flex-direction: column;
                box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            }
            #qcc-export-container .export-card-title {
                font-size: 18px;
                font-weight: 700;
                color: var(--primary);
                margin-top: 0;
                margin-bottom: 12px;
                border-bottom: 1px solid var(--glass-border);
                padding-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #qcc-export-container .export-table-wrapper {
                flex: 1;
                overflow: hidden;
            }
            #qcc-export-container .export-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }
            #qcc-export-container .export-table th {
                background: var(--theme-tint);
                color: var(--primary);
                text-align: left;
                padding: 6px 10px;
                font-weight: 600;
                border-bottom: 1.5px solid var(--glass-border);
            }
            #qcc-export-container .export-table td {
                padding: 6px 10px;
                border-bottom: 1px solid var(--glass-border);
                color: var(--text);
            }
            #qcc-export-container .export-table th:first-child {
                text-align: center;
                font-weight: 800;
            }
            #qcc-export-container .export-table td:first-child {
                font-weight: bold;
                text-align: center;
                color: var(--primary);
                background: rgba(37, 127, 168, 0.05); /* subtle highlight to differentiate index column */
            }
            #qcc-export-container .multi-table-container {
                display: flex;
                gap: 15px;
                height: 100%;
            }
            #qcc-export-container .multi-table-container table {
                flex: 1;
            }
            #qcc-export-container .export-chart-container {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                width: 100%;
                height: 100%;
            }
            #qcc-export-container .export-chart-container canvas {
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                max-height: 100% !important;
            }
            #qcc-export-container .export-conclusion-container {
                flex: 1;
                font-size: 14px;
                line-height: 1.6;
                color: var(--text);
                overflow-y: auto;
            }
            #qcc-export-container .export-conclusion-container b {
                color: var(--primary);
                font-weight: 700;
            }
            #qcc-export-container .export-conclusion-container ul {
                margin: 8px 0;
                padding-left: 20px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            #qcc-export-container .export-conclusion-container li {
                margin-bottom: 4px;
            }
            #qcc-export-container .export-conclusion-container p {
                margin: 0 0 10px 0;
            }
            #qcc-export-container .export-conclusion-container .highlight {
                background: var(--theme-tint);
                color: var(--primary);
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 600;
            }
            #qcc-export-container .export-spec-box {
                margin-top: 15px;
                background: var(--theme-tint);
                border-left: 4px solid var(--primary);
                padding: 10px 15px;
                border-radius: 0 8px 8px 0;
                font-size: 13px;
                font-weight: 600;
                line-height: 1.5;
            }
            #qcc-export-container .export-stats-section {
                margin-top: 15px;
                border-top: 2px dashed var(--glass-border);
                padding-top: 15px;
                box-sizing: border-box;
            }
            #qcc-export-container .export-stats-title {
                font-size: 15px;
                font-weight: 700;
                color: var(--primary);
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            #qcc-export-container .export-stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                box-sizing: border-box;
            }
            #qcc-export-container .export-stat-box {
                background: var(--theme-tint);
                border: 1px solid var(--glass-border);
                border-radius: 8px;
                padding: 6px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                box-sizing: border-box;
                height: 36px;
            }
            #qcc-export-container .export-stat-box span {
                color: var(--text-muted);
                font-weight: 600;
            }
            #qcc-export-container .export-stat-box strong {
                color: var(--primary);
                font-weight: 700;
                font-size: 13px;
            }
        `;

        exportContainer.innerHTML = `
            <style>${customStyle}</style>
            <div class="export-header">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 28px;">📊</span>
                    <div>
                        <div class="export-title">${pageTitle}</div>
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">TR Production - QCC Report</div>
                    </div>
                </div>
                <div class="export-meta">
                    <div style="text-align: right; font-weight: 700; color: var(--primary);">WAKTU EKSPOR</div>
                    <div style="font-size: 13px;">${new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
            </div>
            <div class="export-content">
                <div class="export-col col-left">
                    <div class="export-card">${leftPanelHTML}</div>
                </div>
                <div class="export-col col-middle">
                    <div class="export-card" style="padding: 15px;">
                        <div class="export-card-title">📈 Visualisasi Grafik QCC</div>
                        <div class="export-chart-container" id="exportChartPlaceholder"></div>
                    </div>
                </div>
                <div class="export-col col-right">
                    <div class="export-card" style="border-left: 4px solid var(--primary);">
                        <div class="export-card-title" style="border-bottom-style: dashed;">${conclusionTitle}</div>
                        <div class="export-conclusion-container">${conclusionBody}</div>
                        ${statsHTML}
                    </div>
                </div>
            </div>
        `;

        // Append to body to inherit theme and fonts
        document.body.appendChild(exportContainer);

        // --- Handle Chart Canvas Migration ---
        if (chartInstance && chartInstance.canvas) {
            const chartCanvas = chartInstance.canvas;
            originalParent = chartCanvas.parentNode;

            // Create nextSibling tracker or placeholder to put it back exactly in place
            chartPlaceholder = document.createElement('div');
            chartPlaceholder.className = 'chart-placeholder-loading';
            chartPlaceholder.style.width = originalParent.offsetWidth + 'px';
            chartPlaceholder.style.height = originalParent.offsetHeight + 'px';
            chartPlaceholder.style.display = 'flex';
            chartPlaceholder.style.flexDirection = 'column';
            chartPlaceholder.style.alignItems = 'center';
            chartPlaceholder.style.justifyContent = 'center';
            chartPlaceholder.style.background = 'var(--card-bg)';
            chartPlaceholder.style.borderRadius = '12px';
            chartPlaceholder.style.border = '1px dashed var(--glass-border)';
            chartPlaceholder.innerHTML = `
                <div style="border: 4px solid var(--theme-tint); border-top: 4px solid var(--primary); border-radius: 50%; width: 32px; height: 32px; animation: qcc-spin 1s linear infinite; margin-bottom: 12px;"></div>
                <div style="font-size: 13px; color: var(--text-muted); font-weight: 500;">Sedang mengekspor grafik...</div>
            `;

            // Insert placeholder in DOM
            originalParent.insertBefore(chartPlaceholder, chartCanvas);

            // Move canvas to export container
            const destContainer = exportContainer.querySelector('#exportChartPlaceholder');
            destContainer.appendChild(chartCanvas);

            // Save original Chart properties
            const originalMaintainAspectRatio = chartInstance.options.maintainAspectRatio;
            const originalResponsive = chartInstance.options.responsive;

            // Save original responsive function overrides
            const originalGetChartFontSize = window.getChartFontSize;
            const originalGetMaxTicksLimit = window.getMaxTicksLimit;
            const originalGetChartPadding = window.getChartPadding;

            // Force override font sizing helpers so Chart.js renders a crisp desktop size
            window.getChartFontSize = (base) => base;
            window.getMaxTicksLimit = () => 14;
            window.getChartPadding = () => ({ top: 22, bottom: 15, left: 15, right: 15 });

            // Apply desktop options
            chartInstance.options.maintainAspectRatio = false;
            chartInstance.options.responsive = true;

            // Resize and redraw chart inside the export container
            chartInstance.resize();
            chartInstance.update('none');

            // Wait for DOM to adjust and chart to complete redrawing
            await new Promise(r => setTimeout(r, 400));

            // Run html2canvas screenshot on the export container
            const captureCanvas = await html2canvas(exportContainer, {
                scale: 2, // 2x density for crisp quality
                useCORS: true,
                width: 1600,
                height: 900,
                windowWidth: 1600,
                windowHeight: 900,
                backgroundColor: window.getComputedStyle(document.body).backgroundColor,
                logging: false
            });

            // Restore original sizing helpers
            window.getChartFontSize = originalGetChartFontSize;
            window.getMaxTicksLimit = originalGetMaxTicksLimit;
            window.getChartPadding = originalGetChartPadding;

            // Restore original chart settings
            chartInstance.options.maintainAspectRatio = originalMaintainAspectRatio;
            chartInstance.options.responsive = originalResponsive;

            // Move canvas back to its original location
            originalParent.insertBefore(chartCanvas, chartPlaceholder);

            // Cleanup placeholder
            if (chartPlaceholder) {
                chartPlaceholder.remove();
            }

            // Resize and redraw chart back in its original parent
            chartInstance.resize();
            chartInstance.update('none');

            // Download image
            const link = document.createElement('a');
            link.download = fileName;
            link.href = captureCanvas.toDataURL('image/png', 1.0);
            link.click();
        } else {
            // Fallback if no chart is passed (just take normal snapshot of document body)
            const canvas = await html2canvas(document.body, {
                scale: 2,
                useCORS: true,
                backgroundColor: window.getComputedStyle(document.body).backgroundColor
            });
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        }

    } catch (err) {
        console.error('Export error:', err);
        // Safely restore canvas if error occurred during middle of process
        if (chartInstance && chartInstance.canvas && originalParent && chartPlaceholder) {
            const chartCanvas = chartInstance.canvas;
            if (chartCanvas.parentNode !== originalParent) {
                originalParent.insertBefore(chartCanvas, chartPlaceholder);
            }
            chartPlaceholder.remove();
            chartInstance.resize();
            chartInstance.update('none');
        }
        alert('Gagal mengekspor gambar. ' + (err.message || 'Periksa koneksi internet.'));
    } finally {
        // Remove temporary export container
        if (exportContainer) {
            exportContainer.remove();
        }

        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;

        if (typeof onAfterExport === 'function') {
            onAfterExport();
        }
    }
}
