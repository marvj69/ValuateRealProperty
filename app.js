(() => {
    const DEFAULT_REPORT_COUNT = 16;
    const POLL_INTERVAL_MS = 3500;
    const ACTIVE_REPORT_STORAGE_KEY = 'valuate:activeReportId';
    const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
    const MAX_TOTAL_ATTACHMENT_BYTES = 3 * 1024 * 1024;
    const PDF_BRAND_ASSETS = Object.freeze({
        realEstateGroup: 'photo assets/906-Real-Estate-Group_Logo-2024_Black.png',
        coldwellBanker: 'photo assets/CBlobo.png'
    });
    const PDF_BRAND_THEME = Object.freeze({
        navy: '#002068',
        lake: '#6888a0',
        ink: '#050505',
        paper: '#ffffff',
        mist: '#eef4f7',
        line: '#d8e2e8',
        muted: '#526371'
    });

    const form = document.getElementById('reportForm');
    const generateBtn = document.getElementById('generateBtn');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressTitle = document.getElementById('progressTitle');
    const reportStatusList = document.getElementById('reportStatusList');
    const finalReportSection = document.getElementById('finalReportSection');
    const finalReportStatus = document.getElementById('finalReportStatus');
    const finalReportContent = document.getElementById('finalReportContent');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const reportsContainer = document.getElementById('reportsContainer');
    const pdfUploadStatus = document.getElementById('pdfUploadStatus');
    const pdfUploadPill = document.getElementById('pdfUploadPill');
    const pdfUploadName = document.getElementById('pdfUploadName');
    const pdfUploadPreviews = document.getElementById('pdfUploadPreviews');
    const propertyPdfInput = document.getElementById('propertyPdf');
    const specialInstructions = document.getElementById('specialInstructions');
    const visibleInstructions = document.getElementById('visibleInstructions');
    const historyToggle = document.getElementById('historyToggle');
    const historyDrawer = document.getElementById('historyDrawer');
    const historyOverlay = document.getElementById('historyOverlay');
    const historyClose = document.getElementById('historyClose');
    const historyList = document.getElementById('historyList');
    const historyEmpty = document.getElementById('historyEmpty');
    const historyRefresh = document.getElementById('historyRefresh');
    const historyClear = document.getElementById('historyClear');
    const historyCountBadge = document.getElementById('historyCountBadge');
    const newValuationBtn = document.getElementById('newValuationBtn');
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsModal = document.getElementById('settingsModal');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const settingsClose = document.getElementById('settingsClose');
    const authStatusBtn = document.getElementById('authStatusBtn');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authLoginBtn = document.getElementById('authLoginBtn');
    const authSignupBtn = document.getElementById('authSignupBtn');
    const authLogoutBtn = document.getElementById('authLogoutBtn');
    const authStatusText = document.getElementById('authStatusText');

    const attachmentState = {
        files: []
    };

    const appState = {
        activeReportId: safeStorageGet(ACTIVE_REPORT_STORAGE_KEY),
        currentReport: null,
        history: [],
        pollTimer: null,
        renderedReportIndices: new Set(),
        user: null
    };

    const requestState = {
        propertyAddress: '',
        inferredAddress: '',
        finalValueRange: null
    };

    function safeStorageGet(key) {
        try {
            return window.localStorage?.getItem(key) || null;
        } catch (error) {
            return null;
        }
    }

    function safeStorageSet(key, value) {
        try {
            window.localStorage?.setItem(key, value);
        } catch (error) {
            // Storage can fail in private browsing; the app can still run.
        }
    }

    function safeStorageRemove(key) {
        try {
            window.localStorage?.removeItem(key);
        } catch (error) {
            // Ignore storage failures.
        }
    }

    class ApiError extends Error {
        constructor(message, status, body = null) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.body = body;
        }
    }

    async function apiRequest(path, options = {}) {
        const headers = {
            ...(options.headers || {})
        };
        let body = options.body;
        if (body && !(body instanceof FormData) && typeof body !== 'string') {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(body);
        }

        const response = await fetch(path, {
            ...options,
            headers,
            body,
            credentials: 'include'
        });

        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
            ? await response.json().catch(() => null)
            : await response.text().catch(() => '');

        if (!response.ok) {
            const message = payload?.error?.message
                || (typeof payload?.error === 'string' ? payload.error : null)
                || payload?.message
                || (typeof payload === 'string' ? payload : null)
                || `Request failed (${response.status})`;
            if (response.status === 401) {
                appState.user = null;
                updateAuthUi();
            }
            throw new ApiError(message, response.status, payload);
        }

        return payload;
    }

    function normalizeReport(rawReport) {
        if (!rawReport) return null;
        const report = rawReport.report || rawReport;
        const inputs = report.inputs || report.input || report.payload || {};
        const output = report.output || {};
        const metadata = report.metadata || {};
        const error = normalizeError(report.error);
        const finalReport = output.finalReport || report.finalReport || null;
        const individualReports = output.individualReports || output.reports || report.reports || [];
        const progress = metadata.progress || report.progress || {};
        const reportCount = metadata.reportCount || inputs.reportCount || progress.total || DEFAULT_REPORT_COUNT;

        return {
            ...report,
            inputs,
            output,
            metadata,
            error,
            finalReport,
            individualReports: Array.isArray(individualReports) ? individualReports : [],
            progress: {
                total: reportCount,
                completed: Number.isFinite(progress.completed) ? progress.completed : countFinishedReports(individualReports)
            },
            status: report.status || 'queued'
        };
    }

    function normalizeError(error) {
        if (!error) return null;
        if (typeof error === 'string') return { message: error };
        return {
            ...error,
            message: error.message || error.error || 'Report processing failed.'
        };
    }

    function countFinishedReports(items) {
        if (!Array.isArray(items)) return 0;
        return items.filter((item) => item && (item.success || item.error || item.status === 'completed' || item.status === 'failed')).length;
    }

    function isTerminalStatus(status) {
        return status === 'completed' || status === 'failed';
    }

    function isActiveStatus(status) {
        return status === 'queued' || status === 'processing';
    }

    function setNewValuationVisibility(shouldShow) {
        if (!newValuationBtn) return;
        newValuationBtn.classList.toggle('hidden', !shouldShow);
    }

    function getSelectedReportsModel() {
        const modelSelect = document.getElementById('modelSelect');
        return modelSelect?.value?.trim() || 'gemini-3-flash-preview';
    }

    function updateDownloadButtonState(enabled) {
        if (!downloadPdfBtn) return;
        downloadPdfBtn.disabled = !enabled;
    }

    function setGenerateBusy(isBusy, label = 'Generate Analysis') {
        if (!generateBtn) return;
        generateBtn.disabled = isBusy;
        generateBtn.innerHTML = isBusy
            ? '<i class="fas fa-spinner fa-spin"></i><span>Starting...</span>'
            : `<i class="fas fa-bolt"></i><span>${label}</span>`;
    }

    function updateAuthUi() {
        const signedIn = Boolean(appState.user);
        const label = signedIn ? appState.user.email : 'Sign in';

        if (authStatusBtn) {
            authStatusBtn.textContent = label;
        }
        if (authEmail && appState.user?.email) {
            authEmail.value = appState.user.email;
        }
        if (authStatusText) {
            authStatusText.textContent = signedIn
                ? `Signed in as ${appState.user.email}. Reports are saved to your account.`
                : 'Sign in or create an account to save reports across devices.';
            authStatusText.classList.toggle('text-emerald-700', signedIn);
            authStatusText.classList.toggle('text-slate-500', !signedIn);
        }
        if (authLoginBtn) {
            authLoginBtn.classList.toggle('hidden', signedIn);
        }
        if (authSignupBtn) {
            authSignupBtn.classList.toggle('hidden', signedIn);
        }
        if (authLogoutBtn) {
            authLogoutBtn.classList.toggle('hidden', !signedIn);
        }
        if (historyToggle) {
            historyToggle.disabled = !signedIn;
            historyToggle.classList.toggle('opacity-50', !signedIn);
        }
    }

    async function loadCurrentUser() {
        try {
            const data = await apiRequest('/api/auth/me');
            appState.user = data.user || null;
        } catch (error) {
            appState.user = null;
        }
        updateAuthUi();
        return appState.user;
    }

    function getAuthCredentials(actionLabel) {
        const email = authEmail?.value?.trim();
        const password = authPassword?.value || '';
        if (!email || !password) {
            alert(`Enter your email and password to ${actionLabel}.`);
            return null;
        }
        return { email, password };
    }

    function setAuthBusy(isBusy, action = 'login') {
        if (authLoginBtn) {
            authLoginBtn.disabled = isBusy;
            authLoginBtn.innerHTML = isBusy && action === 'login'
                ? '<i class="fas fa-spinner fa-spin"></i> Signing in'
                : '<i class="fas fa-right-to-bracket"></i> Sign in';
        }
        if (authSignupBtn) {
            authSignupBtn.disabled = isBusy;
            authSignupBtn.innerHTML = isBusy && action === 'signup'
                ? '<i class="fas fa-spinner fa-spin"></i> Creating'
                : '<i class="fas fa-user-plus"></i> Create account';
        }
    }

    async function login() {
        const credentials = getAuthCredentials('sign in');
        if (!credentials) return;

        setAuthBusy(true, 'login');

        try {
            const data = await apiRequest('/api/auth/login', {
                method: 'POST',
                body: credentials
            });
            appState.user = data.user || null;
            if (authPassword) authPassword.value = '';
            updateAuthUi();
            await refreshHistoryList();
        } catch (error) {
            alert(error.message || 'Sign in failed.');
        } finally {
            setAuthBusy(false);
        }
    }

    async function signup() {
        const credentials = getAuthCredentials('create an account');
        if (!credentials) return;
        if (credentials.password.length < 8) {
            alert('Use a password that is at least 8 characters.');
            return;
        }

        setAuthBusy(true, 'signup');

        try {
            const data = await apiRequest('/api/auth/signup', {
                method: 'POST',
                body: credentials
            });
            appState.user = data.user || null;
            if (authPassword) authPassword.value = '';
            updateAuthUi();
            await refreshHistoryList();
        } catch (error) {
            alert(error.message || 'Account creation failed.');
        } finally {
            setAuthBusy(false);
        }
    }

    async function logout() {
        try {
            await apiRequest('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            // Clearing local UI state is still correct if the session is already gone.
        }
        appState.user = null;
        appState.history = [];
        appState.activeReportId = null;
        safeStorageRemove(ACTIVE_REPORT_STORAGE_KEY);
        stopPolling();
        updateAuthUi();
        renderHistoryList([]);
        updateHistoryBadge(0);
        resetValuationForm();
    }

    function requireSignedIn() {
        if (appState.user) return true;
        openSettingsModal();
        alert('Please sign in before starting or viewing reports.');
        return false;
    }

    function isSupportedAttachment(file) {
        return Boolean(file) && (file.type === 'application/pdf' || file.type.startsWith('image/'));
    }

    function updatePdfUploadIndicator(files) {
        if (!pdfUploadPill || !pdfUploadName) return;
        if (!files || files.length === 0) {
            pdfUploadPill.classList.remove('is-ready');
            pdfUploadPill.textContent = 'No file';
            pdfUploadName.textContent = 'Upload optional supporting docs.';
            return;
        }

        const validFiles = Array.from(files).filter(isSupportedAttachment);
        const invalidFiles = Array.from(files).filter((file) => !isSupportedAttachment(file));
        if (invalidFiles.length > 0) {
            pdfUploadPill.classList.remove('is-ready');
            pdfUploadPill.textContent = 'Invalid';
            pdfUploadName.textContent = 'Unsupported file type selected.';
            return;
        }

        const displayNames = validFiles.slice(0, 2).map((file) => file.name).filter(Boolean);
        const remainingCount = validFiles.length - displayNames.length;
        pdfUploadPill.classList.add('is-ready');
        pdfUploadPill.textContent = validFiles.length === 1 ? 'File ready' : 'Files ready';
        pdfUploadName.textContent = `${displayNames.join(', ')}${remainingCount > 0 ? ` +${remainingCount} more` : ''}`;
    }

    function revokeAttachmentPreviews(files) {
        files.forEach((file) => {
            if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
        });
    }

    function setAttachmentFiles(files) {
        revokeAttachmentPreviews(attachmentState.files);
        attachmentState.files = files.map((file) => ({
            file,
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        }));
        syncAttachmentInput();
        updatePdfUploadIndicator(files);
        renderAttachmentPreviews();
    }

    function removeAttachmentAt(index) {
        const removed = attachmentState.files.splice(index, 1);
        revokeAttachmentPreviews(removed);
        syncAttachmentInput();
        updatePdfUploadIndicator(attachmentState.files.map((entry) => entry.file));
        renderAttachmentPreviews();
    }

    function syncAttachmentInput() {
        if (!propertyPdfInput || typeof DataTransfer === 'undefined') return;
        const dataTransfer = new DataTransfer();
        attachmentState.files.forEach((entry) => dataTransfer.items.add(entry.file));
        propertyPdfInput.files = dataTransfer.files;
    }

    function renderAttachmentPreviews() {
        if (!pdfUploadPreviews) return;
        pdfUploadPreviews.innerHTML = '';
        const files = attachmentState.files;
        if (!files.length) {
            pdfUploadPreviews.classList.add('hidden');
            return;
        }

        pdfUploadPreviews.classList.remove('hidden');
        files.forEach((entry, index) => {
            const card = document.createElement('div');
            card.className = 'upload-preview-card';

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'upload-remove';
            removeButton.innerHTML = '<i class="fas fa-times"></i>';
            removeButton.setAttribute('aria-label', `Remove ${entry.file.name}`);
            removeButton.addEventListener('click', () => removeAttachmentAt(index));

            if (entry.previewUrl) {
                const img = document.createElement('img');
                img.src = entry.previewUrl;
                img.alt = entry.file.name || 'Image attachment';
                img.className = 'upload-preview-thumb';
                card.appendChild(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'upload-preview-thumb flex items-center justify-center text-slate-400 text-2xl';
                placeholder.innerHTML = '<i class="fas fa-file-pdf"></i>';
                card.appendChild(placeholder);
            }

            const meta = document.createElement('div');
            meta.className = 'upload-preview-meta';
            meta.innerHTML = `<i class="fas fa-paperclip"></i><span class="truncate">${escapeHtml(entry.file.name || 'Attachment')}</span>`;

            card.appendChild(removeButton);
            card.appendChild(meta);
            pdfUploadPreviews.appendChild(card);
        });
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Unable to read file.'));
            reader.onload = () => {
                const bytes = new Uint8Array(reader.result);
                let binary = '';
                const chunkSize = 0x8000;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
                }
                resolve({
                    name: file.name || 'attachment',
                    mimeType: file.type || 'application/pdf',
                    size: file.size || 0,
                    data: btoa(binary)
                });
            };
            reader.readAsArrayBuffer(file);
        });
    }

    async function readFilesAsBase64(files) {
        return Promise.all(files.map((file) => readFileAsBase64(file)));
    }

    function prepareUiForRun(reportCount = DEFAULT_REPORT_COUNT) {
        appState.renderedReportIndices.clear();
        setGenerateBusy(true, 'Generate Analysis');
        if (newValuationBtn) newValuationBtn.disabled = true;
        setNewValuationVisibility(false);
        updateDownloadButtonState(false);

        if (progressTitle) {
            progressTitle.innerHTML = '<i class="fas fa-circle-notch fa-spin text-brand-500"></i>Queued';
        }
        if (progressSection) progressSection.classList.remove('hidden');
        if (finalReportSection) finalReportSection.classList.add('hidden');
        if (finalReportStatus) finalReportStatus.textContent = 'Submitting request to the backend...';
        if (finalReportContent) finalReportContent.innerHTML = '';
        if (reportsContainer) reportsContainer.innerHTML = '';
        if (reportStatusList) {
            reportStatusList.innerHTML = '';
            for (let i = 0; i < reportCount; i++) {
                const statusItem = document.createElement('div');
                statusItem.id = `status-${i}`;
                statusItem.className = 'flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-100 text-sm';
                statusItem.innerHTML = `
                    <div class="w-2 h-2 rounded-full bg-slate-300"></div>
                    <span class="text-slate-500">Report ${i + 1}: Waiting...</span>
                `;
                reportStatusList.appendChild(statusItem);
            }
        }
        updateProgress(0, reportCount);
    }

    function updateProgress(completed, total) {
        const safeTotal = total || DEFAULT_REPORT_COUNT;
        const safeCompleted = Math.max(0, Math.min(completed || 0, safeTotal));
        const percent = safeTotal > 0 ? (safeCompleted / safeTotal) * 100 : 0;
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${safeCompleted} / ${safeTotal}`;
    }

    function updateStatus(index, status, message) {
        const statusItem = document.getElementById(`status-${index}`);
        if (!statusItem) return;

        const config = {
            processing: ['bg-blue-500 animate-pulse', 'text-blue-600 font-medium'],
            completed: ['bg-green-500', 'text-green-600 font-medium'],
            failed: ['bg-red-500', 'text-red-600 font-medium'],
            queued: ['bg-slate-300', 'text-slate-500']
        }[status] || ['bg-slate-300', 'text-slate-500'];

        statusItem.innerHTML = `
            <div class="w-2 h-2 rounded-full ${config[0]}"></div>
            <span class="${config[1]} flex-1">Report ${index + 1}: ${escapeHtml(message)}</span>
        `;
    }

    function applyReportToUi(rawReport, { scroll = false } = {}) {
        const report = normalizeReport(rawReport);
        if (!report) return;

        appState.currentReport = report;
        appState.activeReportId = report.id || null;
        requestState.propertyAddress = report.inputs.propertyAddress || '';
        requestState.inferredAddress = report.finalReport?.inferredAddress || report.output?.inferredAddress || '';
        requestState.finalValueRange = report.finalReport?.valueRange || report.finalReport?.valuations || null;

        const total = report.progress.total || DEFAULT_REPORT_COUNT;
        const completed = report.status === 'completed'
            ? total
            : report.progress.completed || countFinishedReports(report.individualReports);

        if (progressSection?.classList.contains('hidden') || reportStatusList?.children.length !== total) {
            prepareUiForRun(total);
        }

        updateProgress(completed, total);
        renderIndividualReports(report, total);

        if (report.status === 'queued') {
            showQueuedReport(report);
            startPolling(report.id);
        } else if (report.status === 'processing') {
            showProcessingReport(report);
            startPolling(report.id);
        } else if (report.status === 'completed') {
            showCompletedReport(report);
            stopPolling();
        } else if (report.status === 'failed') {
            showFailedReport(report);
            stopPolling();
        }

        if (scroll && progressSection) {
            progressSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function renderIndividualReports(report, total) {
        const items = report.individualReports || [];
        for (let i = 0; i < total; i++) {
            const item = items[i];
            if (item?.success || item?.status === 'completed') {
                updateStatus(i, 'completed', 'Completed');
                if (!appState.renderedReportIndices.has(i)) {
                    displayReport(i, item.content || item.output || '', item.searchSuggestions || []);
                    appState.renderedReportIndices.add(i);
                }
            } else if (item?.error || item?.status === 'failed') {
                const message = item.error?.message || item.error || 'Failed';
                updateStatus(i, 'failed', `Error: ${message}`);
            } else if (report.status === 'processing' && report.metadata?.runningIndex === i) {
                updateStatus(i, 'processing', 'Generating...');
            } else {
                updateStatus(i, report.status === 'processing' ? 'queued' : report.status, 'Queued');
            }
        }
    }

    function showQueuedReport(report) {
        setGenerateBusy(true, 'Generate Analysis');
        if (newValuationBtn) newValuationBtn.disabled = false;
        if (progressTitle) {
            progressTitle.innerHTML = '<i class="fas fa-clock text-brand-500"></i>Queued';
        }
        if (finalReportStatus) {
            finalReportStatus.textContent = 'Your report has been queued. You can leave this page and return later.';
        }
        safeStorageSet(ACTIVE_REPORT_STORAGE_KEY, report.id);
    }

    function showProcessingReport(report) {
        setGenerateBusy(true, 'Generate Analysis');
        if (newValuationBtn) newValuationBtn.disabled = false;
        if (progressTitle) {
            progressTitle.innerHTML = '<i class="fas fa-spinner fa-spin text-brand-500"></i>Processing';
        }
        if (finalReportStatus) {
            const phase = report.metadata?.phase || report.phase || 'reports';
            finalReportStatus.textContent = phase === 'validating'
                ? 'Validating comparable sales...'
                : phase === 'merging'
                    ? 'Generating the final consensus report...'
                    : 'The backend is generating this report. It will remain available in your account.';
        }
        safeStorageSet(ACTIVE_REPORT_STORAGE_KEY, report.id);
    }

    function showCompletedReport(report) {
        setGenerateBusy(false, 'Generate Analysis');
        if (newValuationBtn) newValuationBtn.disabled = false;
        setNewValuationVisibility(true);
        safeStorageRemove(ACTIVE_REPORT_STORAGE_KEY);
        updateDownloadButtonState(Boolean(getFinalContent(report)));

        if (progressTitle) {
            progressTitle.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>Analysis Complete';
        }
        if (finalReportSection) finalReportSection.classList.remove('hidden');
        if (finalReportStatus) finalReportStatus.textContent = '';
        if (finalReportContent) finalReportContent.innerHTML = markdownToHtml(getFinalContent(report));
        refreshHistoryList();
    }

    function showFailedReport(report) {
        setGenerateBusy(false, 'Generate Analysis');
        if (newValuationBtn) newValuationBtn.disabled = false;
        setNewValuationVisibility(true);
        safeStorageRemove(ACTIVE_REPORT_STORAGE_KEY);
        updateDownloadButtonState(false);

        if (progressTitle) {
            progressTitle.innerHTML = '<i class="fas fa-exclamation-circle text-red-500"></i>Analysis Failed';
        }
        if (finalReportSection) finalReportSection.classList.remove('hidden');
        if (finalReportContent) finalReportContent.innerHTML = '';
        if (finalReportStatus) {
            finalReportStatus.innerHTML = `
                ${escapeHtml(report.error?.message || 'Report processing failed.')}
                <button type="button" class="ml-2 text-brand-700 font-semibold underline" data-action="retry-current">Retry</button>
            `;
        }
        refreshHistoryList();
    }

    function getFinalContent(report) {
        return report?.finalReport?.content || report?.output?.content || report?.output?.finalReportMarkdown || '';
    }

    async function startReport(event) {
        event.preventDefault();
        if (!requireSignedIn()) return;

        const propertyAddress = document.getElementById('propertyAddress')?.value.trim() || '';
        const additionalDetails = document.getElementById('additionalDetails')?.value.trim() || '';
        const instructions = specialInstructions?.value.trim() || '';
        const reportAudience = document.getElementById('reportAudience')?.value || 'seller';
        const promptKey = document.getElementById('promptSelect')?.value || 'experimental';
        const model = getSelectedReportsModel();
        const propertyFiles = attachmentState.files.length > 0
            ? attachmentState.files.map((entry) => entry.file)
            : Array.from(propertyPdfInput?.files || []);

        if (!propertyAddress && propertyFiles.length === 0) {
            alert('Please provide a property address or upload supporting documents.');
            return;
        }

        const invalidFiles = propertyFiles.filter((file) => !isSupportedAttachment(file));
        if (invalidFiles.length > 0) {
            alert('Please upload only PDFs or image files.');
            return;
        }

        const oversized = propertyFiles.find((file) => file.size > MAX_ATTACHMENT_BYTES);
        if (oversized) {
            alert(`${oversized.name} is too large. Keep each attachment under 3 MB.`);
            return;
        }

        const totalAttachmentSize = propertyFiles.reduce((sum, file) => sum + (file.size || 0), 0);
        if (totalAttachmentSize > MAX_TOTAL_ATTACHMENT_BYTES) {
            alert('The selected attachments are too large for direct report submission. Keep the total under 3 MB.');
            return;
        }

        prepareUiForRun(DEFAULT_REPORT_COUNT);
        progressSection?.scrollIntoView({ behavior: 'smooth' });

        let attachments = [];
        try {
            attachments = await readFilesAsBase64(propertyFiles);
        } catch (error) {
            alert(`Failed to read attachment: ${error.message}`);
            setGenerateBusy(false, 'Generate Analysis');
            return;
        }

        try {
            const data = await apiRequest('/api/reports', {
                method: 'POST',
                body: {
                    propertyAddress,
                    additionalDetails,
                    specialInstructions: instructions,
                    reportAudience,
                    promptKey,
                    model,
                    reportCount: DEFAULT_REPORT_COUNT,
                    attachments
                }
            });

            const report = normalizeReport(data.report || data);
            appState.activeReportId = report.id;
            safeStorageSet(ACTIVE_REPORT_STORAGE_KEY, report.id);
            applyReportToUi(report, { scroll: true });
            await refreshHistoryList();
        } catch (error) {
            alert(error.message || 'Failed to start report.');
            showFailedReport({
                id: null,
                status: 'failed',
                error: { message: error.message || 'Failed to start report.' },
                inputs: { propertyAddress },
                progress: { total: DEFAULT_REPORT_COUNT, completed: 0 },
                individualReports: []
            });
        }
    }

    async function loadReport(id, options = {}) {
        if (!id || !appState.user) return;
        try {
            const data = await apiRequest(`/api/reports/${encodeURIComponent(id)}`);
            applyReportToUi(data.report || data, options);
        } catch (error) {
            if (error.status === 404) {
                safeStorageRemove(ACTIVE_REPORT_STORAGE_KEY);
            }
            console.warn('Failed to load report.', error);
        }
    }

    function startPolling(reportId) {
        if (!reportId) return;
        if (appState.pollTimer && appState.pollTimer.reportId === reportId) return;
        stopPolling();
        const timerId = window.setInterval(() => loadReport(reportId), POLL_INTERVAL_MS);
        appState.pollTimer = { reportId, timerId };
    }

    function stopPolling() {
        if (!appState.pollTimer) return;
        window.clearInterval(appState.pollTimer.timerId);
        appState.pollTimer = null;
    }

    async function retryReport(id) {
        if (!id || !requireSignedIn()) return;
        try {
            const data = await apiRequest(`/api/reports/${encodeURIComponent(id)}/retry`, {
                method: 'POST'
            });
            const report = normalizeReport(data.report || data);
            appState.activeReportId = report.id;
            safeStorageSet(ACTIVE_REPORT_STORAGE_KEY, report.id);
            appState.renderedReportIndices.clear();
            if (reportsContainer) reportsContainer.innerHTML = '';
            applyReportToUi(report, { scroll: true });
            await refreshHistoryList();
        } catch (error) {
            alert(error.message || 'Failed to retry report.');
        }
    }

    function displayReport(index, content) {
        if (!reportsContainer || !content) return;
        const reportCard = document.createElement('div');
        reportCard.className = 'bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm';
        reportCard.innerHTML = `
            <button type="button" id="accordion-button-${index}" class="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors" aria-expanded="false" aria-controls="accordion-content-${index}">
                <div class="flex items-center gap-3 w-full">
                    <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">${index + 1}</span>
                    <span class="font-semibold text-slate-700">Individual Analysis</span>
                </div>
                <i id="accordion-icon-${index}" class="fas fa-chevron-down text-slate-400 transition-transform ml-3"></i>
            </button>
            <div id="accordion-content-${index}" class="hidden">
                <div class="border-t border-slate-100 p-5 sm:p-8 bg-slate-50/50">
                    <div class="prose max-w-none text-sm">${markdownToHtml(content)}</div>
                </div>
            </div>
        `;

        const button = reportCard.querySelector(`#accordion-button-${index}`);
        button?.addEventListener('click', () => toggleAccordion(index));
        reportsContainer.appendChild(reportCard);
    }

    function toggleAccordion(index) {
        const content = document.getElementById(`accordion-content-${index}`);
        const icon = document.getElementById(`accordion-icon-${index}`);
        const button = document.getElementById(`accordion-button-${index}`);
        if (!content || !icon || !button) return;

        const hidden = content.classList.contains('hidden');
        content.classList.toggle('hidden', !hidden);
        icon.classList.toggle('rotate-180', hidden);
        button.setAttribute('aria-expanded', hidden ? 'true' : 'false');
    }

    function extractValuations(content) {
        const parseNumber = (value) => {
            if (!value) return null;
            const numeric = parseFloat(String(value).replace(/,/g, ''));
            return Number.isFinite(numeric) ? numeric : null;
        };
        const valuations = { pointEstimate: null, rangeLow: null, rangeHigh: null };
        const pointPatterns = [
            /Single\s*Point\s*Estimate[:\s]*\$?([\d,]+)/i,
            /Most\s*Likely\s*(?:Market\s*)?Value[:\s]*\$?([\d,]+)/i,
            /Point\s*Estimate[:\s]*\$?([\d,]+)/i,
            /Estimated\s*(?:Market\s*)?Value[:\s]*\$?([\d,]+)(?!\s*[-\u2013])/i
        ];
        const rangePatterns = [
            /(?:Estimated\s*)?(?:Market\s*)?Value\s*Range[:\s]*\$?([\d,]+)\s*[-\u2013]\s*\$?([\d,]+)/i,
            /Range[:\s]*\$?([\d,]+)\s*[-\u2013]\s*\$?([\d,]+)/i,
            /\$?([\d,]+)\s*[-\u2013]\s*\$?([\d,]+)/i
        ];

        for (const pattern of pointPatterns) {
            const match = content.match(pattern);
            if (match?.[1]) {
                valuations.pointEstimate = parseNumber(match[1]);
                break;
            }
        }
        for (const pattern of rangePatterns) {
            const match = content.match(pattern);
            if (match?.[1] && match?.[2]) {
                valuations.rangeLow = parseNumber(match[1]);
                valuations.rangeHigh = parseNumber(match[2]);
                break;
            }
        }
        return valuations;
    }

    function mergeValueRange(valuations, valueRangeOverride) {
        if (!valueRangeOverride?.rangeLow || !valueRangeOverride?.rangeHigh) {
            return valuations;
        }
        return {
            ...valuations,
            rangeLow: valueRangeOverride.rangeLow,
            rangeHigh: valueRangeOverride.rangeHigh
        };
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);
    }

    function markdownToHtml(markdown) {
        if (!markdown) return '';
        if (!window.marked) return escapeHtml(markdown).replace(/\n/g, '<br>');
        const rawHtml = window.marked.parse(markdown, {
            gfm: true,
            breaks: true,
            smartLists: true
        });
        const wrapper = document.createElement('div');
        wrapper.innerHTML = rawHtml;
        wrapper.querySelectorAll('table').forEach((table) => {
            const scrollWrapper = document.createElement('div');
            scrollWrapper.className = 'table-scroll';
            table.parentNode.insertBefore(scrollWrapper, table);
            scrollWrapper.appendChild(table);
        });
        return wrapper.innerHTML;
    }

    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function getReportAddress(report = appState.currentReport) {
        return report?.inputs?.propertyAddress
            || report?.finalReport?.inferredAddress
            || requestState.propertyAddress
            || requestState.inferredAddress
            || 'Address not provided';
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    async function resolvePdfAsset(path) {
        const url = new URL(path, window.location.href).href;
        try {
            const response = await fetch(url, { cache: 'force-cache' });
            if (!response.ok) throw new Error(`Asset request failed with ${response.status}`);
            return await blobToDataUrl(await response.blob());
        } catch (error) {
            console.warn(`PDF asset could not be embedded from ${path}. Falling back to URL.`, error);
            return url;
        }
    }

    async function loadPdfBrandAssets() {
        const [realEstateGroup, coldwellBanker] = await Promise.all([
            resolvePdfAsset(PDF_BRAND_ASSETS.realEstateGroup),
            resolvePdfAsset(PDF_BRAND_ASSETS.coldwellBanker)
        ]);
        return { realEstateGroup, coldwellBanker };
    }

    function normalizePdfReportHtml(html) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;

        wrapper.querySelectorAll('.table-scroll').forEach((scrollWrapper) => {
            const children = Array.from(scrollWrapper.children);
            const onlyTable = children.length === 1 && children[0]?.tagName === 'TABLE';
            if (onlyTable) {
                scrollWrapper.replaceWith(children[0]);
            } else {
                scrollWrapper.classList.remove('table-scroll');
            }
        });

        wrapper.querySelectorAll('a').forEach((link) => {
            const href = link.getAttribute('href');
            link.removeAttribute('target');
            link.removeAttribute('rel');
            if (href && !link.textContent.includes(href)) {
                const urlLabel = document.createElement('span');
                urlLabel.className = 'pdf-link-url';
                urlLabel.textContent = ` (${href})`;
                link.insertAdjacentElement('afterend', urlLabel);
            }
        });

        wrapper.querySelectorAll('img').forEach((image) => {
            image.removeAttribute('width');
            image.removeAttribute('height');
            image.loading = 'eager';
        });

        return wrapper.innerHTML;
    }

    function formatPdfValueSummary(value) {
        if (value?.rangeLow && value?.rangeHigh) {
            return `${formatCurrency(value.rangeLow)} - ${formatCurrency(value.rangeHigh)}`;
        }
        if (value?.pointEstimate) return formatCurrency(value.pointEstimate);
        return '';
    }

    function buildPdfSummaryItems(report, address, contentText) {
        const finalReport = report?.finalReport || {};
        const output = report?.output || {};
        const inputs = report?.inputs || {};
        const valuations = finalReport.valuations
            || output.valuations
            || requestState.finalValueRange
            || extractValuations(contentText || '');
        const mergedValue = mergeValueRange(
            valuations,
            finalReport.valueRange || output.valueRange || requestState.finalValueRange
        );
        const promptLabel = inputs.promptKey === 'experimental' ? 'Bank-Grade CMA' : 'Standard Valuation';

        return [
            { label: 'Subject property', value: address },
            { label: 'Prepared for', value: formatHistoryAudience(inputs.reportAudience || finalReport.reportAudience || 'seller') },
            { label: 'Analysis style', value: promptLabel },
            { label: 'Valuation', value: formatPdfValueSummary(mergedValue) || 'See consensus analysis' },
            { label: 'Generated', value: formatHistoryDate(report?.createdAt || report?.created_at || new Date().toISOString()) }
        ];
    }

    function applyPdfTheme(element) {
        Object.entries(PDF_BRAND_THEME).forEach(([key, value]) => {
            element.style.setProperty(`--pdf-${key}`, value);
        });
    }

    function buildPdfExportDocument({ address, logos, reportHtml, summaryItems }) {
        const summaryMarkup = summaryItems.map((item) => `
            <div class="pdf-summary-item">
                <dt>${escapeHtml(item.label)}</dt>
                <dd>${escapeHtml(item.value)}</dd>
            </div>
        `).join('');

        const realEstateLogo = escapeAttribute(logos.realEstateGroup);
        const coldwellLogo = escapeAttribute(logos.coldwellBanker);
        const exportDocument = document.createElement('article');
        exportDocument.className = 'pdf-export';
        exportDocument.setAttribute('aria-label', 'PDF valuation report export');
        exportDocument.innerHTML = `
            <section class="pdf-cover">
                <div class="pdf-cover-content">
                    <div class="pdf-logo-lockup" aria-label="Brokerage logos">
                        <img class="pdf-logo pdf-logo-906" src="${realEstateLogo}" alt="906 Real Estate Group">
                        <span class="pdf-logo-divider" aria-hidden="true"></span>
                        <img class="pdf-logo pdf-logo-cb" src="${coldwellLogo}" alt="Coldwell Banker Schmidt Realtors">
                    </div>
                    <div class="pdf-title-block">
                        <p class="pdf-eyebrow">AI valuation engine</p>
                        <h1>Comparative Market Analysis</h1>
                        <p class="pdf-address">${escapeHtml(address)}</p>
                    </div>
                    <dl class="pdf-summary-grid">${summaryMarkup}</dl>
                </div>
            </section>
            <section class="pdf-report-page">
                <header class="pdf-report-header">
                    <div>
                        <p class="pdf-report-kicker">Final consensus report</p>
                        <h2>${escapeHtml(address)}</h2>
                    </div>
                    <div class="pdf-header-logo-pair" aria-label="Brokerage logos">
                        <img class="pdf-logo pdf-logo-906" src="${realEstateLogo}" alt="906 Real Estate Group">
                        <img class="pdf-logo pdf-logo-cb" src="${coldwellLogo}" alt="Coldwell Banker Schmidt Realtors">
                    </div>
                </header>
                <div class="pdf-report-content">${reportHtml}</div>
            </section>
            <section class="pdf-disclaimer">
                <strong>Disclaimer:</strong> This AI-generated estimate is based on available data and model analysis. It is not an official appraisal, inspection, lending decision, or guarantee of market value. Consult a licensed professional before making financial decisions.
            </section>
        `;
        applyPdfTheme(exportDocument);
        return exportDocument;
    }

    function waitForPdfImages(container) {
        const images = Array.from(container.querySelectorAll('img'));
        return Promise.all(images.map((image) => {
            if (image.complete && image.naturalWidth > 0) return Promise.resolve();
            return new Promise((resolve) => {
                image.onload = resolve;
                image.onerror = resolve;
            });
        }));
    }

    function buildPdfFileName(address) {
        return `${address.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'valuation-report'}.pdf`;
    }

    async function saveFinalReportAsPDF() {
        if (!finalReportContent?.textContent.trim()) {
            alert('Generate or load a completed report before saving as PDF.');
            return;
        }
        if (!window.html2pdf) {
            alert('PDF generator failed to load. Please refresh and try again.');
            return;
        }

        const originalDownloadLabel = downloadPdfBtn?.innerHTML || '';
        if (downloadPdfBtn) {
            downloadPdfBtn.disabled = true;
            downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Preparing PDF...';
        }

        try {
            const address = getReportAddress();
            const logos = await loadPdfBrandAssets();
            const reportHtml = normalizePdfReportHtml(finalReportContent.innerHTML);
            const exportDocument = buildPdfExportDocument({
                address,
                logos,
                reportHtml,
                summaryItems: buildPdfSummaryItems(appState.currentReport, address, finalReportContent.textContent)
            });

            if (document.fonts?.ready) await document.fonts.ready.catch(() => null);
            await waitForPdfImages(exportDocument);

            const fileName = buildPdfFileName(address);
            await window.html2pdf()
                .set({
                    margin: 0,
                    filename: fileName,
                    image: { type: 'jpeg', quality: 0.98 },
                    pagebreak: {
                        mode: ['css', 'legacy'],
                        avoid: ['tr', 'thead', 'blockquote', 'h1', 'h2', 'h3', '.pdf-logo-lockup', '.pdf-summary-item', '.pdf-report-header']
                    },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        allowTaint: false,
                        backgroundColor: '#ffffff',
                        imageTimeout: 15000,
                        logging: false
                    },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait', compress: true }
                })
                .from(exportDocument)
                .save();
        } catch (error) {
            console.error('PDF export failed:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            if (downloadPdfBtn) {
                downloadPdfBtn.disabled = false;
                downloadPdfBtn.innerHTML = originalDownloadLabel;
            }
        }
    }

    function formatHistoryDate(value) {
        if (!value) return 'Date unknown';
        return new Date(value).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatHistoryAudience(audience) {
        if (!audience) return 'Audience unknown';
        return audience.charAt(0).toUpperCase() + audience.slice(1);
    }

    function normalizeHistoryModel(model) {
        return model ? model.replace(/^models\//i, '') : 'Default model';
    }

    function buildHistoryMeta(report) {
        const parts = [];
        parts.push(formatHistoryDate(report.createdAt || report.created_at));
        parts.push(statusLabel(report.status));
        if (report.inputs?.reportAudience) parts.push(formatHistoryAudience(report.inputs.reportAudience));
        if (report.inputs?.model || report.metadata?.model) parts.push(normalizeHistoryModel(report.inputs.model || report.metadata.model));

        const content = getFinalContent(report);
        const valuations = report.finalReport?.valuations || report.output?.valuations || extractValuations(content || '');
        const merged = mergeValueRange(valuations, report.finalReport?.valueRange);
        if (merged?.rangeLow && merged?.rangeHigh) {
            parts.push(`${formatCurrency(merged.rangeLow)} - ${formatCurrency(merged.rangeHigh)}`);
        } else if (merged?.pointEstimate) {
            parts.push(formatCurrency(merged.pointEstimate));
        }
        return parts.filter(Boolean).join(' - ');
    }

    function statusLabel(status) {
        const labels = {
            queued: 'Queued',
            processing: 'Processing',
            completed: 'Completed',
            failed: 'Failed'
        };
        return labels[status] || status || 'Unknown';
    }

    function renderHistoryList(reports) {
        if (!historyList || !historyEmpty) return;
        historyList.innerHTML = '';
        if (!reports || reports.length === 0) {
            historyEmpty.classList.remove('hidden');
            historyEmpty.textContent = appState.user ? 'No saved valuations yet.' : 'Sign in to view saved valuations.';
            return;
        }

        historyEmpty.classList.add('hidden');
        reports.forEach((rawReport) => {
            const report = normalizeReport(rawReport);
            const item = document.createElement('div');
            item.className = 'history-item';
            const title = escapeHtml(getReportAddress(report));
            const promptLabel = report.inputs?.promptKey === 'experimental' ? 'Bank-Grade CMA' : 'Standard';
            const status = statusLabel(report.status);
            const canRetry = report.status === 'failed';
            item.innerHTML = `
                <div class="history-item-header">
                    <div class="history-item-title">${title}</div>
                </div>
                <div class="history-item-meta">${escapeHtml(buildHistoryMeta(report))}</div>
                <div class="history-item-tags">
                    <span class="history-tag status-${report.status}">${status}</span>
                    <span class="history-tag">${promptLabel}</span>
                </div>
                <div class="history-item-actions">
                    <button class="history-view" type="button" data-action="view" data-id="${report.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${canRetry ? `
                        <button class="history-view" type="button" data-action="retry" data-id="${report.id}">
                            <i class="fas fa-rotate-right"></i> Retry
                        </button>
                    ` : ''}
                    <button class="history-delete" type="button" data-action="delete" data-id="${report.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            historyList.appendChild(item);
        });
    }

    function updateHistoryBadge(count) {
        if (!historyCountBadge) return;
        if (count > 0) {
            historyCountBadge.textContent = count > 99 ? '99+' : String(count);
            historyCountBadge.classList.remove('hidden');
        } else {
            historyCountBadge.classList.add('hidden');
        }
    }

    async function refreshHistoryList() {
        if (!appState.user) {
            appState.history = [];
            renderHistoryList([]);
            updateHistoryBadge(0);
            return;
        }

        try {
            const data = await apiRequest('/api/reports');
            const reports = (data.reports || data || []).map(normalizeReport).filter(Boolean);
            appState.history = reports;
            renderHistoryList(reports);
            updateHistoryBadge(reports.length);
        } catch (error) {
            console.warn('Failed to load saved valuations.', error);
        }
    }

    async function deleteReport(id) {
        if (!id) return;
        await apiRequest(`/api/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (appState.currentReport?.id === id) {
            resetValuationForm();
        }
        await refreshHistoryList();
    }

    async function clearHistoryReports() {
        if (!appState.history.length) return;
        const currentReportId = appState.currentReport?.id;
        await Promise.all(appState.history.map((report) => (
            apiRequest(`/api/reports/${encodeURIComponent(report.id)}`, { method: 'DELETE' })
        )));
        if (currentReportId && appState.history.some((report) => report.id === currentReportId)) {
            resetValuationForm();
        }
        await refreshHistoryList();
    }

    function resetValuationForm() {
        form?.reset();
        if (visibleInstructions) visibleInstructions.value = '';
        if (specialInstructions) specialInstructions.value = '';
        if (propertyPdfInput) propertyPdfInput.value = '';
        setAttachmentFiles([]);
        stopPolling();

        appState.currentReport = null;
        appState.activeReportId = null;
        appState.renderedReportIndices.clear();
        safeStorageRemove(ACTIVE_REPORT_STORAGE_KEY);

        if (progressSection) progressSection.classList.add('hidden');
        if (reportStatusList) reportStatusList.innerHTML = '';
        if (reportsContainer) reportsContainer.innerHTML = '';
        if (finalReportContent) finalReportContent.innerHTML = '';
        if (finalReportStatus) finalReportStatus.textContent = '';
        if (finalReportSection) finalReportSection.classList.add('hidden');

        setGenerateBusy(false, 'Generate Analysis');
        if (newValuationBtn) newValuationBtn.disabled = false;
        setNewValuationVisibility(false);
        updateDownloadButtonState(false);
        requestState.propertyAddress = '';
        requestState.inferredAddress = '';
        requestState.finalValueRange = null;
    }

    let scrollLockY = 0;
    let settingsLastFocus = null;
    let historyLastFocus = null;

    function lockScroll() {
        if (document.body.classList.contains('menu-open')) return;
        scrollLockY = window.scrollY || window.pageYOffset;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollLockY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.classList.add('menu-open');
        document.documentElement.classList.add('menu-open');
    }

    function unlockScroll() {
        if (!document.body.classList.contains('menu-open')) return;
        document.body.classList.remove('menu-open');
        document.documentElement.classList.remove('menu-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        window.scrollTo(0, scrollLockY);
    }

    function updateScrollLock() {
        const settingsOpen = settingsModal && !settingsModal.classList.contains('hidden');
        const historyOpen = historyDrawer && !historyDrawer.classList.contains('hidden');
        if (settingsOpen || historyOpen) lockScroll();
        else unlockScroll();
    }

    function openSettingsModal() {
        if (!settingsModal) return;
        settingsLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        settingsModal.classList.remove('hidden');
        settingsModal.setAttribute('aria-hidden', 'false');
        settingsToggle?.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => settingsModal.classList.add('is-open'));
        updateScrollLock();
        (appState.user ? settingsClose : authEmail)?.focus();
    }

    function closeSettingsModal() {
        if (!settingsModal) return;
        settingsModal.classList.remove('is-open');
        settingsModal.setAttribute('aria-hidden', 'true');
        settingsToggle?.setAttribute('aria-expanded', 'false');
        setTimeout(() => {
            if (!settingsModal.classList.contains('is-open')) {
                settingsModal.classList.add('hidden');
                updateScrollLock();
                const historyOpen = historyDrawer && !historyDrawer.classList.contains('hidden');
                if (settingsLastFocus && !historyOpen) settingsLastFocus.focus();
            }
        }, 250);
    }

    function openHistoryDrawer() {
        if (!historyDrawer) return;
        if (!requireSignedIn()) return;
        historyLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        historyDrawer.classList.remove('hidden');
        historyDrawer.setAttribute('aria-hidden', 'false');
        historyToggle?.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => historyDrawer.classList.add('is-open'));
        updateScrollLock();
        historyClose?.focus();
    }

    function closeHistoryDrawer() {
        if (!historyDrawer) return;
        historyDrawer.classList.remove('is-open');
        historyDrawer.setAttribute('aria-hidden', 'true');
        historyToggle?.setAttribute('aria-expanded', 'false');
        setTimeout(() => {
            if (!historyDrawer.classList.contains('is-open')) {
                historyDrawer.classList.add('hidden');
                updateScrollLock();
                const settingsOpen = settingsModal && !settingsModal.classList.contains('hidden');
                if (historyLastFocus && !settingsOpen) historyLastFocus.focus();
            }
        }, 300);
    }

    function wireEvents() {
        if (visibleInstructions && specialInstructions) {
            visibleInstructions.addEventListener('input', (event) => {
                specialInstructions.value = event.target.value;
            });
        }

        propertyPdfInput?.addEventListener('change', (event) => {
            const files = Array.from(event.target.files || []);
            const invalidFiles = files.filter((file) => !isSupportedAttachment(file));
            if (invalidFiles.length > 0) {
                alert('Please upload only PDFs or image files.');
                setAttachmentFiles([]);
                return;
            }
            setAttachmentFiles(files);
        });

        form?.addEventListener('submit', startReport);
        downloadPdfBtn?.addEventListener('click', saveFinalReportAsPDF);
        settingsToggle?.addEventListener('click', openSettingsModal);
        authStatusBtn?.addEventListener('click', openSettingsModal);
        settingsOverlay?.addEventListener('click', closeSettingsModal);
        settingsClose?.addEventListener('click', closeSettingsModal);
        authLoginBtn?.addEventListener('click', login);
        authSignupBtn?.addEventListener('click', signup);
        authLogoutBtn?.addEventListener('click', logout);
        authPassword?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') login();
        });

        historyToggle?.addEventListener('click', async () => {
            await refreshHistoryList();
            openHistoryDrawer();
        });
        historyOverlay?.addEventListener('click', closeHistoryDrawer);
        historyClose?.addEventListener('click', closeHistoryDrawer);
        historyRefresh?.addEventListener('click', refreshHistoryList);
        historyClear?.addEventListener('click', async () => {
            if (!appState.history.length) return;
            const confirmed = confirm('Delete all saved valuations for this account? This cannot be undone.');
            if (!confirmed) return;
            await clearHistoryReports();
        });
        newValuationBtn?.addEventListener('click', () => {
            const confirmed = confirm('Start a new valuation? This clears the current form and result view, but saved reports stay in your account.');
            if (!confirmed) return;
            resetValuationForm();
            form?.scrollIntoView({ behavior: 'smooth' });
        });
        historyList?.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const action = button.getAttribute('data-action');
            const id = button.getAttribute('data-id');
            if (!id) return;
            if (action === 'view') {
                closeHistoryDrawer();
                await loadReport(id, { scroll: true });
            } else if (action === 'retry') {
                closeHistoryDrawer();
                await retryReport(id);
            } else if (action === 'delete') {
                const confirmed = confirm('Delete this saved valuation?');
                if (!confirmed) return;
                await deleteReport(id);
            }
        });
        finalReportStatus?.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action="retry-current"]');
            if (!button || !appState.currentReport?.id) return;
            await retryReport(appState.currentReport.id);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
                closeSettingsModal();
                return;
            }
            if (event.key === 'Escape' && historyDrawer && !historyDrawer.classList.contains('hidden')) {
                closeHistoryDrawer();
            }
        });
        window.addEventListener('focus', () => {
            if (appState.activeReportId && appState.user) {
                loadReport(appState.activeReportId);
            }
        });
    }

    async function boot() {
        updateDownloadButtonState(false);
        setNewValuationVisibility(false);
        wireEvents();
        await loadCurrentUser();
        await refreshHistoryList();
        if (appState.user && appState.activeReportId) {
            await loadReport(appState.activeReportId, { scroll: false });
        }

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js', { scope: './' })
                    .catch((error) => console.warn('Service worker registration failed:', error));
            });
        }
    }

    boot();
})();
