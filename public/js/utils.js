/* =============================================
   QCC Utils — Helper Functions
   ============================================= */

// --- Deteksi Mobile (Reactive) ---
const QCC = window.QCC || {};
QCC.isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);

// Update on resize
window.matchMedia("(max-width: 768px)").addEventListener('change', (e) => {
    QCC.isMobile = e.matches || ('ontouchstart' in window);
});

// --- Live Time ---
QCC._clockInterval = null;

function updateLiveTime(elementId) {
    const el = document.getElementById(elementId || 'live-time-text');
    if (!el) return;

    const now = new Date();
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][now.getMonth()];
    const tanggal = now.getDate();
    const tahun = now.getFullYear();
    const jam = String(now.getHours()).padStart(2, '0');
    const menit = String(now.getMinutes()).padStart(2, '0');
    const detik = String(now.getSeconds()).padStart(2, '0');

    el.innerText = `${hari}, ${tanggal} ${bulan} ${tahun} | ${jam}:${menit}:${detik}`;
}

function startLiveClock(elementId) {
    updateLiveTime(elementId);
    if (QCC._clockInterval) clearInterval(QCC._clockInterval);
    QCC._clockInterval = setInterval(() => updateLiveTime(elementId), 1000);
}

// --- Hex to RGBA ---
function hexToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- Safe Number Parsing ---
function safeParseNumber(val) {
    const n = parseFloat(val);
    if (isNaN(n) || !isFinite(n)) return null;
    return n;
}

function formatNumber(val, decimals) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return Number(val).toFixed(decimals || 2);
}

// --- Clamp ---
function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

// --- Safe Min/Max (no stack overflow for large arrays) ---
function safeMin(arr) {
    if (!arr || arr.length === 0) return Infinity;
    let min = Infinity;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== null && arr[i] !== undefined && arr[i] < min) min = arr[i];
    }
    return min;
}

function safeMax(arr) {
    if (!arr || arr.length === 0) return -Infinity;
    let max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== null && arr[i] !== undefined && arr[i] > max) max = arr[i];
    }
    return max;
}

// --- Debounce ---
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// --- Input Validation ---
function showWarning(el, msg) {
    if (!el) return;
    let w = el.parentNode.querySelector('.input-warning');
    if (!w) {
        w = document.createElement('div');
        w.className = 'input-warning';
        el.parentNode.appendChild(w);
    }
    w.textContent = '⚠️ ' + msg;
    w.style.display = 'block';
    el.style.borderColor = 'var(--danger)';
}

function clearWarning(el) {
    if (!el) return;
    const w = el.parentNode.querySelector('.input-warning');
    if (w) w.style.display = 'none';
    el.style.borderColor = '';
}

function clearAllWarnings() {
    document.querySelectorAll('.input-warning').forEach(w => w.style.display = 'none');
    document.querySelectorAll('.data-input').forEach(i => i.style.borderColor = '');
}

// --- localStorage Persistence ---
function saveToStorage(key, data) {
    try {
        localStorage.setItem('qcc_' + key, JSON.stringify(data));
    } catch (e) { /* quota exceeded or private mode */ }
}

function loadFromStorage(key) {
    try {
        const raw = localStorage.getItem('qcc_' + key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function clearStorage(key) {
    try {
        localStorage.removeItem('qcc_' + key);
    } catch (e) { /* ignore */ }
}

// --- Visibility API Helper ---
QCC._visibilityCallbacks = { pause: [], resume: [] };

function onVisibilityChange(pauseFn, resumeFn) {
    QCC._visibilityCallbacks.pause.push(pauseFn);
    QCC._visibilityCallbacks.resume.push(resumeFn);
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause clock
        if (QCC._clockInterval) {
            clearInterval(QCC._clockInterval);
            QCC._clockInterval = null;
        }
        QCC._visibilityCallbacks.pause.forEach(fn => fn());
    } else {
        // Resume clock
        startLiveClock();
        QCC._visibilityCallbacks.resume.forEach(fn => fn());
    }
});

// --- Global Theme System ---
QCC.activeChart = null;
QCC.pageThemeCallback = null;

QCC.setTheme = function(theme) {
    const isDark = (theme === 'dark');
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    // Reset background color override from previous color picker
    document.body.style.backgroundColor = '';

    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        themeBtn.innerHTML = isDark ? "☀️" : "🌙";
    }

    if (QCC.activeChart) {
        applyDarkModeToChart(QCC.activeChart, isDark);
    }

    if (typeof QCC.pageThemeCallback === 'function') {
        QCC.pageThemeCallback(isDark);
    }

    // Run callback to apply theme changes to page specific boxes (like conclusion boxes)
    if (typeof applyCurrentThemeToConclusion === 'function') {
        applyCurrentThemeToConclusion();
    }

    localStorage.setItem('theme', theme);
};

QCC.toggleTheme = function() {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    QCC.setTheme(newTheme);
};

QCC.initGlobalTheme = function(pageThemeCallback) {
    if (typeof pageThemeCallback === 'function') {
        QCC.pageThemeCallback = pageThemeCallback;
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    QCC.setTheme(savedTheme);

    // Sync across open pages/tabs in real-time
    window.addEventListener('storage', (e) => {
        if (e.key === 'theme') {
            QCC.setTheme(e.newValue || 'light');
        }
    });
};

// Backward-compatibility wrapper for any legacy calls
QCC.changeBgColor = function(colorHex, chartInstance, storageKey) {
    if (chartInstance) {
        QCC.activeChart = chartInstance;
    }
    const isDark = (colorHex === '#2b2d42' || colorHex === '#7b2cbf');
    QCC.setTheme(isDark ? 'dark' : 'light');
};

// --- Scroll to Input Global Helper ---
function scrollToInput() {
    const leftPanel = document.querySelector('.left-panel');
    if (leftPanel) {
        leftPanel.scrollIntoView({ behavior: 'smooth' });
    }
}

QCC.scrollToElement = function (selector) {
    const el = document.querySelector(selector);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    }
};

// --- Apply Dark Mode to Chart ---
function applyDarkModeToChart(chart, isDark) {
    if (!chart || !chart.options) return;
    const fontColor = isDark ? '#f8fafc' : '#111827';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)';

    if (chart.options.scales) {
        Object.values(chart.options.scales).forEach(scale => {
            if (scale.ticks) {
                scale.ticks.color = fontColor;
            }
            if (scale.grid) {
                scale.grid.color = gridColor;
            }
            if (scale.title) {
                scale.title.color = isDark ? '#cbd5e1' : '#4b5563';
            }
        });
    }
    if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
        chart.options.plugins.legend.labels.color = fontColor;
    }
    chart.update('none');
}

// --- Excel Paste Parser Helpers ---
QCC.handleExcelPaste = function (e, inputContainerQuery, callback) {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const values = pasteData.split(/[\n\t,]+/).map(item => item.trim()).filter(item => item !== "");
    const container = document.querySelector(inputContainerQuery);
    if (!container) return;
    const inputs = container.querySelectorAll("input.data-input");
    let currentIndex = Array.from(inputs).indexOf(e.target);
    if (currentIndex === -1) currentIndex = 0;
    
    let valIndex = 0;
    const MAX_ITERATIONS = inputs.length * 3;
    let iterCount = 0;
    while (currentIndex < inputs.length && valIndex < values.length) {
        if (iterCount++ > MAX_ITERATIONS) break;
        let parsedVal = parseFloat(values[valIndex].replace(',', '.'));
        if (!isNaN(parsedVal)) {
            inputs[currentIndex].value = parsedVal;
            currentIndex++;
        }
        valIndex++;
    }
    if (typeof callback === 'function') callback();
};

QCC.handleParetoExcelPaste = function (e, inputContainerQuery, callback) {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const rows = pasteData.split(/[\n]+/).map(row => row.trim()).filter(row => row !== "");
    const container = document.querySelector(inputContainerQuery);
    if (!container) return;
    const inputRows = container.querySelectorAll(".input-row");
    
    const targetRow = e.target.closest('.input-row');
    let startIndex = Array.from(inputRows).indexOf(targetRow);
    if (startIndex === -1) startIndex = 0;

    let rIndex = 0;
    const MAX_ITERATIONS = inputRows.length * 3;
    let iterCount = 0;
    while (startIndex < inputRows.length && rIndex < rows.length) {
        if (iterCount++ > MAX_ITERATIONS) break;
        const cols = rows[rIndex].split(/[\t,]+/).map(col => col.trim());
        const inputs = inputRows[startIndex].querySelectorAll('input');
        
        if (cols[0]) inputs[0].value = cols[0];
        if (cols[1] && !isNaN(parseFloat(cols[1]))) inputs[1].value = parseFloat(cols[1]);
        
        startIndex++;
        rIndex++;
    }
    if (typeof callback === 'function') callback();
};

QCC.handleScatterExcelPaste = function (e, xContainerQuery, yContainerQuery, callback) {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const rows = pasteData.split(/[\n]+/).map(row => row.trim()).filter(row => row !== "");
    const xContainer = document.querySelector(xContainerQuery);
    const yContainer = document.querySelector(yContainerQuery);
    if (!xContainer || !yContainer) return;
    
    const xInputs = xContainer.querySelectorAll("input.data-input");
    const yInputs = yContainer.querySelectorAll("input.data-input");
    
    const targetInput = e.target;
    let startIndex = Array.from(xInputs).indexOf(targetInput);
    let isY = false;
    if (startIndex === -1) {
        startIndex = Array.from(yInputs).indexOf(targetInput);
        isY = true;
    }
    if (startIndex === -1) startIndex = 0;
    
    let rIndex = 0;
    const MAX_ITERATIONS = xInputs.length * 3;
    let iterCount = 0;
    while (startIndex < xInputs.length && rIndex < rows.length) {
        if (iterCount++ > MAX_ITERATIONS) break;
        const cols = rows[rIndex].split(/[\t,]+/).map(col => col.trim());
        if (cols.length >= 2) {
            const parsedX = parseFloat(cols[0].replace(',', '.'));
            const parsedY = parseFloat(cols[1].replace(',', '.'));
            if (!isNaN(parsedX)) xInputs[startIndex].value = parsedX;
            if (!isNaN(parsedY)) yInputs[startIndex].value = parsedY;
        } else if (cols.length === 1) {
            const parsedVal = parseFloat(cols[0].replace(',', '.'));
            if (!isNaN(parsedVal)) {
                if (isY) {
                    yInputs[startIndex].value = parsedVal;
                } else {
                    xInputs[startIndex].value = parsedVal;
                }
            }
        }
        startIndex++;
        rIndex++;
    }
    if (typeof callback === 'function') callback();
};

// --- Bottom Navigation Active State ---
function initBottomNav() {
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    document.querySelectorAll('.bnav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (href && href.toLowerCase() === currentPage) {
            item.classList.add('active');
        }
    });
}

// Auto-init bottom nav
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBottomNav);
} else {
    initBottomNav();
}

// --- GLOBAL FORMULA TOOLTIP SYSTEM ---
document.addEventListener('DOMContentLoaded', () => {
    // Create tooltip container if it doesn't exist
    let tooltipEl = document.getElementById('formula-tooltip-box');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'formula-tooltip-box';
        tooltipEl.className = 'formula-tooltip-box-el';
        document.body.appendChild(tooltipEl);
    }

    let activeTerm = null;

    const showTooltip = (termEl) => {
        const text = termEl.getAttribute('data-tooltip');
        if (!text) return;

        tooltipEl.innerHTML = text;
        tooltipEl.classList.add('visible');
        activeTerm = termEl;

        // Position the tooltip
        const rect = termEl.getBoundingClientRect();
        
        // Horizontal centering
        let left = window.scrollX + rect.left + (rect.width / 2) - 120; // 120 is half of 240px width
        // Vertical placement above the element
        let top = window.scrollY + rect.top - 10; // Temp placement to read tooltipEl height

        // Constraints checking (stay inside viewport)
        const margin = 10;
        const viewportWidth = window.innerWidth;
        
        if (left < margin) {
            left = margin;
        } else if (left + 240 > viewportWidth - margin) {
            left = viewportWidth - 240 - margin;
        }

        // Apply temporary left positioning to let browser lay out the height
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;

        const tooltipRect = tooltipEl.getBoundingClientRect();
        top = window.scrollY + rect.top - tooltipRect.height - 10;

        if (rect.top - tooltipRect.height - 10 < margin) {
            // If it goes off the top, place it below the element instead
            top = window.scrollY + rect.bottom + 10;
            tooltipEl.classList.add('position-below');
        } else {
            tooltipEl.classList.remove('position-below');
        }

        tooltipEl.style.top = `${top}px`;
    };

    const hideTooltip = () => {
        if (tooltipEl) {
            tooltipEl.classList.remove('visible');
        }
        activeTerm = null;
    };

    // Attach event listeners for hover (desktop)
    document.body.addEventListener('mouseover', (e) => {
        const term = e.target.closest('.formula-term');
        if (term) {
            showTooltip(term);
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        const term = e.target.closest('.formula-term');
        if (term) {
            // Only hide if we are not on a touch device
            if (!('ontouchstart' in window)) {
                hideTooltip();
            }
        }
    });

    // Attach event listeners for tap (mobile/desktop click)
    document.body.addEventListener('click', (e) => {
        const term = e.target.closest('.formula-term');
        if (term) {
            e.stopPropagation();
            if (activeTerm === term) {
                hideTooltip();
            } else {
                showTooltip(term);
            }
        } else {
            // Clicked outside, hide active tooltip
            hideTooltip();
        }
    });

    // Handle scroll or resize (re-position or hide)
    window.addEventListener('resize', hideTooltip);
    window.addEventListener('scroll', hideTooltip);
});

// --- DYNAMIC FOCUS MODE MODAL SYSTEM ---
QCC.openFocusModal = function(toolTitle) {
    // 1. Get conclusion element
    const conclusionBoxEl = document.getElementById("conclusionBox") || document.getElementById("kesimpulanBox");
    let conclusionNode = null;
    if (conclusionBoxEl) {
        // Clone the element to avoid modifying the original page content
        const clone = conclusionBoxEl.cloneNode(true);
        
        // Suffix IDs in the cloned tree to avoid duplicate IDs in the DOM
        if (clone.id) {
            clone.id = clone.id + "-modal";
        }
        clone.querySelectorAll("[id]").forEach(el => {
            el.id = el.id + "-modal";
        });
        
        // Remove the details / formulas section from Histogram conclusion box clone if present
        const detailsEl = clone.querySelector("details");
        if (detailsEl) {
            detailsEl.remove();
        }
        
        // Remove focus trigger buttons from the cloned HTML to avoid duplicate buttons inside modal
        clone.querySelectorAll(".btn-focus-trigger").forEach(btn => btn.remove());
        
        conclusionNode = clone;
    }

    // 2. Get formula element
    const formulaContainerEl = document.getElementById("formulaContainer");
    let formulaNode = null;
    if (formulaContainerEl) {
        const clone = formulaContainerEl.cloneNode(true);
        
        // Suffix IDs in the cloned tree to avoid duplicate IDs
        if (clone.id) {
            clone.id = clone.id + "-modal";
        }
        clone.querySelectorAll("[id]").forEach(el => {
            el.id = el.id + "-modal";
        });
        
        // Remove focus trigger buttons from the cloned HTML if any
        clone.querySelectorAll(".btn-focus-trigger").forEach(btn => btn.remove());
        
        formulaNode = clone;
    }

    // 3. Lazily create modal elements
    let overlay = document.getElementById("qcc-focus-modal-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "qcc-focus-modal-overlay";
        overlay.className = "qcc-modal-overlay";
        overlay.innerHTML = `
            <div class="qcc-modal-wrapper">
                <div class="qcc-modal-header">
                    <h3 class="qcc-modal-title">🔍 Mode Fokus: <span id="qcc-modal-tool-name">Tool</span></h3>
                    <button class="qcc-modal-close-btn" aria-label="Tutup">&times;</button>
                </div>
                <div class="qcc-modal-tabs">
                    <button class="qcc-modal-tab-btn active" data-tab-target="tab-conclusion">📝 Kesimpulan Analisis</button>
                    <button class="qcc-modal-tab-btn" data-tab-target="tab-formula">🧮 Rumus Perhitungan</button>
                </div>
                <div class="qcc-modal-body scroll-thin">
                    <div id="tab-conclusion" class="qcc-modal-tab-content"></div>
                    <div id="tab-formula" class="qcc-modal-tab-content" style="display: none;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Bind events: Close button
        const closeBtn = overlay.querySelector(".qcc-modal-close-btn");
        closeBtn.addEventListener("click", QCC.closeFocusModal);
        
        // Close on clicking outside
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                QCC.closeFocusModal();
            }
        });

        // Tab switches
        const tabBtns = overlay.querySelectorAll(".qcc-modal-tab-btn");
        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                tabBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                const targetId = btn.getAttribute("data-tab-target");
                overlay.querySelectorAll(".qcc-modal-tab-content").forEach(content => {
                    if (content.id === targetId) {
                        content.style.display = "block";
                    } else {
                        content.style.display = "none";
                    }
                });
            });
        });
    }

    // Update dynamic contents
    const toolName = toolTitle || document.title.replace("QCC - ", "").trim();
    const modalToolNameEl = document.getElementById("qcc-modal-tool-name");
    if (modalToolNameEl) {
        modalToolNameEl.textContent = toolName;
    }
    
    const tabConclusionEl = document.getElementById("tab-conclusion");
    if (tabConclusionEl) {
        tabConclusionEl.innerHTML = "";
        if (conclusionNode) {
            tabConclusionEl.appendChild(conclusionNode);
        } else {
            tabConclusionEl.innerHTML = "<p style='color: var(--text-muted); text-align: center; margin-top: 20px;'>💡 Kesimpulan Analisis belum tersedia. Silakan masukkan data terlebih dahulu.</p>";
        }
    }
    
    const tabFormulaEl = document.getElementById("tab-formula");
    if (tabFormulaEl) {
        tabFormulaEl.innerHTML = "";
        if (formulaNode) {
            tabFormulaEl.appendChild(formulaNode);
        } else {
            tabFormulaEl.innerHTML = "<p style='color: var(--text-muted); text-align: center; margin-top: 20px;'>🧮 Rumus Perhitungan tidak ditemukan.</p>";
        }
    }

    // Reset default active tab (always open on Conclusion first)
    const firstTabBtn = overlay.querySelector('.qcc-modal-tab-btn[data-tab-target="tab-conclusion"]');
    if (firstTabBtn) {
        firstTabBtn.click();
    }

    // Toggle active classes
    overlay.classList.add("active");
    document.body.classList.add("modal-active");

    // ESC key binder
    const escHandler = (e) => {
        if (e.key === "Escape") {
            QCC.closeFocusModal();
        }
    };
    document.addEventListener("keydown", escHandler);
    overlay._escHandler = escHandler;
};

QCC.closeFocusModal = function() {
    const overlay = document.getElementById("qcc-focus-modal-overlay");
    if (overlay) {
        overlay.classList.remove("active");
        document.body.classList.remove("modal-active");
        if (overlay._escHandler) {
            document.removeEventListener("keydown", overlay._escHandler);
            overlay._escHandler = null;
        }
    }
};

// --- Click/Tap Accordion Toggle for Mobile ---
QCC.toggleCard = function(headerEl) {
    if (window.innerWidth > 992) return; // Do not toggle on desktop
    const card = headerEl.closest('.collapsible-card');
    if (card) {
        card.classList.toggle('collapsed');
    }
};


