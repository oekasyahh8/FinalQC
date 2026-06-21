/* =============================================
   QCC Chart Config — Shared Chart.js Helpers
   Chart.js CDN pinned: 4.4.7
   ============================================= */

// --- Canvas Background Plugin (for export) ---
const canvasBgPlugin = {
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart, args, options) => {
        const { ctx } = chart;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = options.color || 'transparent';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
    }
};

// --- Custom Data Labels Plugin ---
const QCCDataLabelsPlugin = {
    id: 'qccDataLabels',
    afterDatasetsDraw(chart, args, options) {
        if (!options || !options.enabled) return;

        const { ctx } = chart;
        ctx.save();

        const fontSize = getChartFontSize(10);
        ctx.font = `bold ${fontSize}px 'Poppins', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#e2e8f0' : '#334155';
        const bgColor = isDark ? '#1e293b' : '#ffffff';

        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            
            // Skip helper lines like limits or center lines
            if (dataset.label && (
                dataset.label.includes('Limit') || 
                dataset.label.includes('Line') || 
                dataset.label.includes('Batas') || 
                dataset.label.includes('MEAN') || 
                dataset.label.includes('CL') || 
                dataset.label.includes('Regresi') || 
                dataset.label.includes('Poligon')
            )) {
                return;
            }

            // Draw data labels selectively based on grid density for mobile
            const totalPoints = meta.data.length;
            const screenWidth = window.innerWidth;
            const step = (screenWidth <= 480 && totalPoints > 10) ? 2 : 1;

            meta.data.forEach((element, index) => {
                // Mobile selective rendering
                if (index % step !== 0 && index !== totalPoints - 1 && index !== 0) return;

                const dataPoint = dataset.data[index];
                if (dataPoint === null || dataPoint === undefined) return;

                let val = '';
                let xPos = element.x;
                let yPos = element.y;

                if (typeof dataPoint === 'object') {
                    if (chart.config.type === 'scatter') {
                        val = `(${formatTickLabel(dataPoint.x)}, ${formatTickLabel(dataPoint.y)})`;
                        yPos -= 14;
                    } else {
                        val = formatTickLabel(dataPoint.y || 0);
                        yPos -= 12;
                    }
                } else {
                    val = formatTickLabel(dataPoint);
                    if (chart.config.type === 'bar') {
                        // Place slightly above the bar
                        yPos -= 12;
                    } else {
                        // Place slightly above the point
                        yPos -= 12;
                    }
                }

                // Prevent rendering if label is drawn out of chartArea boundaries
                if (xPos < chart.chartArea.left || xPos > chart.chartArea.right || yPos < chart.chartArea.top || yPos > chart.chartArea.bottom) {
                    return;
                }

                // Draw solid background box for perfect text contrast
                ctx.fillStyle = bgColor;
                const textWidth = ctx.measureText(val).width;
                ctx.fillRect(xPos - textWidth / 2 - 3, yPos - fontSize / 2 - 2, textWidth + 6, fontSize + 4);

                // Draw thin border for aesthetic card effect
                ctx.strokeStyle = isDark ? '#334155' : 'rgba(200,200,200,0.5)';
                ctx.lineWidth = 0.8;
                ctx.strokeRect(xPos - textWidth / 2 - 3, yPos - fontSize / 2 - 2, textWidth + 6, fontSize + 4);

                // Draw actual data label value
                ctx.fillStyle = textColor;
                ctx.fillText(val, xPos, yPos);
            });
        });
        ctx.restore();
    }
};

// Register custom data labels plugin globally
if (typeof Chart !== 'undefined') {
    Chart.register(QCCDataLabelsPlugin);
}

// --- Responsive helpers ---
function getChartFontSize(base) {
    const w = window.innerWidth;
    if (w <= 360) return Math.max(9, base - 3);
    if (w <= 430) return Math.max(10, base - 2);
    if (w <= 576) return Math.max(10, base - 1);
    if (w <= 768) return Math.max(11, base - 1);
    return base;
}

function getMaxTicksLimit() {
    const w = window.innerWidth;
    if (w <= 360) return 5;
    if (w <= 430) return 6;
    if (w <= 576) return 7;
    if (w <= 768) return 8;
    if (w <= 992) return 10;
    return 14;
}

function getChartPadding() {
    const w = window.innerWidth;
    if (w <= 430) return { top: 12, bottom: 8, left: 4, right: 15 };
    if (w <= 576) return { top: 14, bottom: 10, left: 8, right: 15 };
    if (w <= 768) return { top: 18, bottom: 12, left: 10, right: 10 };
    return { top: 22, bottom: 15, left: 15, right: 15 };
}

/**
 * Format angka menjadi label yang ringkas.
 * Jika angka bulat, tampilkan tanpa desimal.
 * Jika punya desimal, batasi ke 1 digit (kecuali kalau range sangat kecil).
 */
function formatTickLabel(value, range) {
    if (value === null || value === undefined) return '';
    const decimals = (range !== undefined && range < 5) ? 2 : (Number.isInteger(value) ? 0 : 1);
    return Number(value).toFixed(decimals);
}

// --- Default Chart Options ---
function getDefaultChartOptions(isMobile) {
    const fontSize = getChartFontSize(12);
    const tickFontSize = getChartFontSize(11);
    const padding = getChartPadding();
    const maxTicks = getMaxTicksLimit();

    return {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: Math.min(window.devicePixelRatio, 2),
        layout: {
            padding: padding
        },
        events: isMobile
            ? ['click', 'touchstart']
            : ['mousemove', 'mouseout', 'click', 'touchstart'],
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#111827',
                    usePointStyle: true,
                    boxWidth: 8,
                    font: { family: "'Poppins', sans-serif", size: fontSize }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.85)',
                padding: 10,
                cornerRadius: 8,
                titleFont: { family: "'Poppins', sans-serif", size: fontSize },
                bodyFont: { family: "'Poppins', sans-serif", size: fontSize }
            },
            customCanvasBackgroundColor: { color: 'transparent' },
            qccDataLabels: { enabled: false } // Default disabled
        },
        scales: {
            y: {
                grid: { color: 'rgba(0,0,0,0.05)' },
                border: { dash: [4, 4] },
                ticks: { 
                    color: '#111827', 
                    font: { family: "'Poppins', sans-serif", size: tickFontSize },
                    maxTicksLimit: maxTicks
                }
            },
            x: {
                grid: { display: false },
                ticks: { 
                    color: '#111827', 
                    font: { family: "'Poppins', sans-serif", size: tickFontSize },
                    maxTicksLimit: maxTicks,
                    autoSkip: true
                }
            }
        }
    };
}

// --- Disable default animations globally ---
if (typeof Chart !== 'undefined') {
    Chart.defaults.animation = false;
    Chart.defaults.font.family = "'Poppins', system-ui, sans-serif";
}
