(() => {
    const DEFAULT_REPORT_COUNT = 16;
    const POLL_INTERVAL_MS = 3500;
    const ACTIVE_REPORT_STORAGE_KEY = 'valuate:activeReportId';
    const USER_SETTINGS_STORAGE_KEY = 'valuate:userSettings:v1';
    const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
    const MAX_TOTAL_ATTACHMENT_BYTES = 3 * 1024 * 1024;
    const USER_SETTINGS_FIELDS = Object.freeze({
        model: { elementId: 'modelSelect', defaultValue: 'gemini-flash-lite-latest' },
        reportAudience: { elementId: 'reportAudience', defaultValue: 'seller' }
    });
    const REPORT_MODEL_TIERS = Object.freeze({
        'gemini-flash-lite-latest': 'fast',
        'gemini-3-flash-preview': 'smart'
    });
    const REPORT_TIER_ORDER = Object.freeze(['fast', 'smart']);
    const REPORT_TIER_DISPLAY = Object.freeze({
        fast: { label: 'Fast', icon: 'fa-bolt', model: 'gemini-flash-lite-latest' },
        smart: { label: 'Smart', icon: 'fa-brain', model: 'gemini-3-flash-preview' }
    });
    const REPORT_MODEL_ALIASES = Object.freeze({
        'gemini-3.5-flash': 'gemini-3-flash-preview',
        'gemini-flash-latest': 'gemini-3-flash-preview'
    });
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
    const AUTH_GATE_COPY = Object.freeze({
        login: {
            eyebrow: 'Secure access',
            title: 'Sign in to continue',
            subtitle: 'Use your account to access valuation history and saved preferences.',
            submitIcon: 'fa-right-to-bracket',
            submitLabel: 'Sign in'
        },
        signup: {
            eyebrow: 'New workspace',
            title: 'Create your account',
            subtitle: 'Start with a secure profile for saved reports and configuration.',
            submitIcon: 'fa-user-plus',
            submitLabel: 'Create account'
        },
        forgot: {
            eyebrow: 'Password recovery',
            title: 'Reset your password',
            subtitle: 'Enter your account email and we will send a secure reset link.',
            submitIcon: 'fa-paper-plane',
            submitLabel: 'Send reset link'
        },
        reset: {
            eyebrow: 'Set new password',
            title: 'Choose a new password',
            subtitle: 'Use your reset token to secure the account with a new password.',
            submitIcon: 'fa-key',
            submitLabel: 'Reset password'
        }
    });

    const appShell = document.getElementById('appShell');
    const authGate = document.getElementById('authGate');
    const authGateForm = document.getElementById('authGateForm');
    const authGateEyebrow = document.getElementById('authGateEyebrow');
    const authGateTitle = document.getElementById('authGateTitle');
    const authGateSubtitle = document.getElementById('authGateSubtitle');
    const authGateTabs = document.getElementById('authGateTabs');
    const authGateLoginTab = document.getElementById('authGateLoginTab');
    const authGateSignupTab = document.getElementById('authGateSignupTab');
    const authGateEmailGroup = document.getElementById('authGateEmailGroup');
    const authGatePasswordGroup = document.getElementById('authGatePasswordGroup');
    const authGateConfirmGroup = document.getElementById('authGateConfirmGroup');
    const authGateTokenGroup = document.getElementById('authGateTokenGroup');
    const authGateNewPasswordGroup = document.getElementById('authGateNewPasswordGroup');
    const authGateEmail = document.getElementById('authGateEmail');
    const authGatePassword = document.getElementById('authGatePassword');
    const authGateConfirmPassword = document.getElementById('authGateConfirmPassword');
    const authGateResetToken = document.getElementById('authGateResetToken');
    const authGateNewPassword = document.getElementById('authGateNewPassword');
    const authGateSubmit = document.getElementById('authGateSubmit');
    const authGateForgotBtn = document.getElementById('authGateForgotBtn');
    const authGateBackBtn = document.getElementById('authGateBackBtn');
    const authGateMessage = document.getElementById('authGateMessage');
    const authGateDevReset = document.getElementById('authGateDevReset');
    const authGateDevResetLink = document.getElementById('authGateDevResetLink');
    const form = document.getElementById('reportForm');
    const generateBtn = document.getElementById('generateBtn');
    const progressSection = document.getElementById('progressSection');
    const progressText = document.getElementById('progressText');
    const progressTitle = document.getElementById('progressTitle');
    const progressMessage = document.getElementById('progressMessage');
    const finalReportSection = document.getElementById('finalReportSection');
    const finalReportStatus = document.getElementById('finalReportStatus');
    const finalReportContent = document.getElementById('finalReportContent');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
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
    const authCredentialFields = document.getElementById('authCredentialFields');
    const authLoginBtn = document.getElementById('authLoginBtn');
    const authSignupBtn = document.getElementById('authSignupBtn');
    const authLogoutBtn = document.getElementById('authLogoutBtn');
    const authStatusText = document.getElementById('authStatusText');
    const usageSummary = document.getElementById('usageSummary');
    const usageLimitGrid = document.getElementById('usageLimitGrid');
    const usageResetText = document.getElementById('usageResetText');
    const usageRefresh = document.getElementById('usageRefresh');
    const selectedUsageHint = document.getElementById('selectedUsageHint');

    const attachmentState = {
        files: []
    };

    const appState = {
        activeReportId: safeStorageGet(ACTIVE_REPORT_STORAGE_KEY),
        currentReport: null,
        history: [],
        pollTimer: null,
        user: null,
        usageLimits: null,
        usageLimitsLoading: false,
        usageLimitsError: ''
    };

    const requestState = {
        propertyAddress: '',
        inferredAddress: '',
        finalValueRange: null
    };

    let userSettingsRevision = 0;
    let userSettingsSaveTimer = null;
    let userSettingsChangedThisSession = false;
    let userSettingsSavePromise = Promise.resolve();
    let lastPersistedUserSettingsSignature = null;
    let authGateMode = 'login';

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

    function readStoredJson(key, fallback = null) {
        const rawValue = safeStorageGet(key);
        if (!rawValue) return fallback;
        try {
            const parsedValue = JSON.parse(rawValue);
            return parsedValue && typeof parsedValue === 'object' ? parsedValue : fallback;
        } catch (error) {
            safeStorageRemove(key);
            return fallback;
        }
    }

    function hasSelectOption(select, value) {
        if (!select || typeof value !== 'string') return false;
        return Array.from(select.options).some((option) => option.value === value);
    }

    function getStoredUserSettings() {
        return readStoredJson(USER_SETTINGS_STORAGE_KEY, {});
    }

    function getCurrentUserSettings() {
        return Object.entries(USER_SETTINGS_FIELDS).reduce((settings, [key, field]) => {
            const select = document.getElementById(field.elementId);
            const selectedValue = select?.value || field.defaultValue;
            settings[key] = hasSelectOption(select, selectedValue) ? selectedValue : field.defaultValue;
            return settings;
        }, {});
    }

    function getUserSettingsSignature(settings = getCurrentUserSettings()) {
        return JSON.stringify(settings);
    }

    function cacheUserSettings(settings = getCurrentUserSettings()) {
        safeStorageSet(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        return settings;
    }

    function applyUserSettings(settings = {}) {
        Object.entries(USER_SETTINGS_FIELDS).forEach(([key, field]) => {
            const select = document.getElementById(field.elementId);
            if (!select) return;

            const settingValue = key === 'model' ? normalizeModelName(settings[key]) : settings[key];
            const nextValue = hasSelectOption(select, settingValue) ? settingValue : field.defaultValue;
            if (hasSelectOption(select, nextValue)) {
                select.value = nextValue;
            }
        });
    }

    function applyStoredUserSettings() {
        applyUserSettings(getStoredUserSettings());
    }

    function shouldPersistUserSettings(settings = getCurrentUserSettings()) {
        return Boolean(appState.user) && getUserSettingsSignature(settings) !== lastPersistedUserSettingsSignature;
    }

    async function persistUserSettings(settings = getCurrentUserSettings(), revision = userSettingsRevision, options = {}) {
        if (!appState.user) return settings;
        const data = await apiRequest('/api/user/settings', {
            method: 'PATCH',
            body: { settings },
            keepalive: options.keepalive === true
        });
        const savedSettings = data.settings || settings;
        if (revision === userSettingsRevision) {
            applyUserSettings(savedSettings);
            cacheUserSettings(getCurrentUserSettings());
            lastPersistedUserSettingsSignature = getUserSettingsSignature(getCurrentUserSettings());
            userSettingsChangedThisSession = false;
        }
        return savedSettings;
    }

    function flushUserSettings(options = {}) {
        if (userSettingsSaveTimer) {
            window.clearTimeout(userSettingsSaveTimer);
            userSettingsSaveTimer = null;
        }

        const settings = cacheUserSettings(getCurrentUserSettings());
        if (!shouldPersistUserSettings(settings)) {
            return Promise.resolve(settings);
        }

        const revision = userSettingsRevision;
        userSettingsSavePromise = userSettingsSavePromise
            .catch(() => {})
            .then(() => persistUserSettings(settings, revision, options));
        return userSettingsSavePromise;
    }

    function saveUserSettings(options = {}) {
        const syncRemote = options.syncRemote !== false;
        const immediate = options.immediate === true;
        const settings = cacheUserSettings(getCurrentUserSettings());
        userSettingsChangedThisSession = true;
        userSettingsRevision += 1;

        if (!syncRemote || !appState.user) {
            return Promise.resolve(settings);
        }

        if (immediate) {
            return flushUserSettings();
        }

        if (userSettingsSaveTimer) {
            window.clearTimeout(userSettingsSaveTimer);
        }
        userSettingsSaveTimer = window.setTimeout(() => {
            userSettingsSaveTimer = null;
            flushUserSettings()
                .catch((error) => console.warn('Failed to save user settings.', error));
        }, 150);

        return Promise.resolve(settings);
    }

    async function syncUserSettingsAfterAuth(serverSettings = null) {
        if (!appState.user) return;

        if (userSettingsChangedThisSession) {
            if (userSettingsSaveTimer) {
                window.clearTimeout(userSettingsSaveTimer);
                userSettingsSaveTimer = null;
            }
            await flushUserSettings();
            return;
        }

        let settings = serverSettings;
        if (!settings) {
            const data = await apiRequest('/api/user/settings');
            settings = data.settings;
        }
        if (settings) {
            applyUserSettings(settings);
            cacheUserSettings(getCurrentUserSettings());
            lastPersistedUserSettingsSignature = getUserSettingsSignature(getCurrentUserSettings());
            userSettingsChangedThisSession = false;
        }
    }

    function wireUserSettingsPersistence() {
        Object.values(USER_SETTINGS_FIELDS).forEach((field) => {
            document.getElementById(field.elementId)?.addEventListener('change', () => saveUserSettings());
        });
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
                ...progress,
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
        return modelSelect?.value?.trim() || 'gemini-flash-lite-latest';
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

    function normalizeTierName(tier) {
        return String(tier || '').trim().toLowerCase();
    }

    function normalizeModelName(model) {
        const normalized = String(model || '').trim().replace(/^models\//i, '');
        return REPORT_MODEL_ALIASES[normalized] || normalized;
    }

    function getTierForModel(model = getSelectedReportsModel()) {
        return REPORT_MODEL_TIERS[normalizeModelName(model)] || 'fast';
    }

    function getTierDisplay(tier) {
        const normalizedTier = normalizeTierName(tier);
        return REPORT_TIER_DISPLAY[normalizedTier] || {
            label: normalizedTier ? normalizedTier.charAt(0).toUpperCase() + normalizedTier.slice(1) : 'Report',
            icon: 'fa-chart-line',
            model: ''
        };
    }

    function asUsageNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function isUsageNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function normalizeUsageLimits(rawUsage) {
        const usage = rawUsage?.usage || rawUsage || {};
        const limits = Array.isArray(usage.limits) ? usage.limits : [];
        return {
            timeZone: usage.timeZone || '',
            generatedAt: usage.generatedAt || null,
            limits: limits.map((item) => {
                const tier = normalizeTierName(item.tier);
                const display = getTierDisplay(tier);
                const unlimited = item.unlimited === true;
                const limit = unlimited ? null : asUsageNumber(item.limit);
                const used = unlimited ? null : asUsageNumber(item.used);
                const remaining = unlimited
                    ? null
                    : (
                        Number.isFinite(Number(item.remaining))
                            ? asUsageNumber(item.remaining)
                            : Math.max(0, limit - used)
                    );
                return {
                    tier,
                    label: item.label || display.label,
                    model: item.model || display.model,
                    limit,
                    used,
                    remaining: unlimited ? null : Math.max(0, remaining),
                    unlimited,
                    resetAt: item.resetAt || item.windowEnd || null,
                    windowStart: item.windowStart || null
                };
            })
        };
    }

    function getUsageLimitsForRender() {
        const usageLimits = appState.usageLimits?.limits || [];
        const byTier = new Map(usageLimits.map((item) => [item.tier, item]));
        return REPORT_TIER_ORDER.map((tier) => {
            const display = getTierDisplay(tier);
            return byTier.get(tier) || {
                tier,
                label: display.label,
                model: display.model,
                limit: null,
                used: null,
                remaining: null,
                unlimited: false,
                resetAt: null
            };
        });
    }

    function formatLabelList(labels) {
        const safeLabels = labels.filter(Boolean);
        if (safeLabels.length <= 1) return safeLabels[0] || '';
        if (safeLabels.length === 2) return `${safeLabels[0]} and ${safeLabels[1]}`;
        return `${safeLabels.slice(0, -1).join(', ')}, and ${safeLabels[safeLabels.length - 1]}`;
    }

    function formatUsageReset(value) {
        const date = new Date(value);
        if (!value || Number.isNaN(date.getTime())) return '';
        return date.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function usagePercent(item) {
        const limit = Number(item.limit);
        const used = Number(item.used);
        if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(used)) return 0;
        return Math.min(100, Math.max(0, (used / limit) * 100));
    }

    function getSelectedUsageLimit() {
        const selectedTier = getTierForModel();
        return getUsageLimitsForRender().find((item) => item.tier === selectedTier) || null;
    }

    function renderUsageLimits() {
        if (!usageLimitGrid) return;

        const signedIn = Boolean(appState.user);
        const loading = appState.usageLimitsLoading;
        const limits = getUsageLimitsForRender();
        usageLimitGrid.innerHTML = limits.map((item) => {
            const display = getTierDisplay(item.tier);
            const unlimited = signedIn && item.unlimited === true;
            const hasNumbers = signedIn && !unlimited && isUsageNumber(item.limit) && isUsageNumber(item.used) && isUsageNumber(item.remaining);
            const remainingText = unlimited ? 'Unlimited' : (hasNumbers ? `${item.remaining} left` : (loading ? 'Loading' : 'Sign in'));
            const usedText = unlimited ? 'No usage cap' : (hasNumbers ? `${item.used} used` : (loading ? 'Checking usage' : 'Usage hidden'));
            const limitText = unlimited ? 'No weekly limit' : (hasNumbers ? `${item.limit} weekly` : 'Weekly limit');
            const percent = unlimited ? '100' : (hasNumbers ? usagePercent(item).toFixed(1) : '0');
            const selected = item.tier === getTierForModel();
            const exhausted = hasNumbers && item.remaining <= 0;
            return `
                <div class="usage-limit-item${loading && !hasNumbers && !unlimited ? ' is-loading' : ''}${selected ? ' is-selected' : ''}${exhausted ? ' is-exhausted' : ''}${unlimited ? ' is-unlimited' : ''}" aria-label="${escapeAttribute(item.label)} usage">
                    <div class="usage-limit-top">
                        <span><i class="fas ${display.icon}"></i> ${escapeHtml(item.label || display.label)}</span>
                        <strong>${escapeHtml(remainingText)}</strong>
                    </div>
                    <div class="usage-meter" aria-hidden="true"><span style="width:${percent}%"></span></div>
                    <div class="usage-limit-meta">
                        <span>${escapeHtml(usedText)}</span>
                        <span>${escapeHtml(limitText)}</span>
                    </div>
                </div>
            `;
        }).join('');

        if (usageSummary) {
            usageSummary.classList.toggle('is-loading', loading);
        }
        if (usageRefresh) {
            usageRefresh.disabled = loading || !signedIn;
        }
        if (usageResetText) {
            if (!signedIn) {
                usageResetText.textContent = 'Sign in to view weekly report limits and remaining usage.';
            } else if (appState.usageLimitsError) {
                usageResetText.textContent = appState.usageLimitsError;
            } else if (loading && !appState.usageLimits) {
                usageResetText.textContent = 'Checking current usage...';
            } else if (limits.some((item) => item.unlimited)) {
                usageResetText.textContent = `Your account has unlimited ${formatLabelList(limits.map((item) => item.label))} reports.`;
            } else {
                const resetAt = limits.find((item) => item.resetAt)?.resetAt;
                const resetLabel = formatUsageReset(resetAt);
                usageResetText.textContent = resetLabel
                    ? `Limits reset ${resetLabel}. Retries use one report; deleting history does not restore usage.`
                    : 'Retries use one report; deleting history does not restore usage.';
            }
        }
        if (selectedUsageHint) {
            const selected = getSelectedUsageLimit();
            if (!signedIn) {
                selectedUsageHint.textContent = 'Sign in to view selected model usage.';
            } else if (selected?.unlimited) {
                selectedUsageHint.textContent = `${selected.label}: unlimited reports available.`;
            } else if (loading && (!selected || !isUsageNumber(selected.limit))) {
                selectedUsageHint.textContent = 'Checking selected model usage...';
            } else if (selected && isUsageNumber(selected.limit)) {
                const resetLabel = formatUsageReset(selected.resetAt);
                selectedUsageHint.textContent = `${selected.label}: ${selected.remaining} of ${selected.limit} reports remaining this week${resetLabel ? `; resets ${resetLabel}` : ''}.`;
            } else {
                selectedUsageHint.textContent = 'Usage limits are unavailable right now.';
            }
        }
    }

    async function refreshUsageLimits() {
        if (!appState.user) {
            appState.usageLimits = null;
            appState.usageLimitsError = '';
            appState.usageLimitsLoading = false;
            renderUsageLimits();
            return null;
        }

        appState.usageLimitsLoading = true;
        appState.usageLimitsError = '';
        renderUsageLimits();

        try {
            const data = await apiRequest('/api/reports/usage');
            appState.usageLimits = normalizeUsageLimits(data.usage || data);
            return appState.usageLimits;
        } catch (error) {
            if (error.status !== 401) {
                console.warn('Failed to load usage limits.', error);
                appState.usageLimitsError = 'Usage limits could not be refreshed.';
            }
            return null;
        } finally {
            appState.usageLimitsLoading = false;
            renderUsageLimits();
        }
    }

    function toggleHidden(element, shouldHide) {
        if (!element) return;
        element.classList.toggle('hidden', shouldHide);
    }

    function setAuthGateMessage(message = '', type = 'info') {
        if (!authGateMessage) return;
        authGateMessage.textContent = message;
        authGateMessage.classList.toggle('hidden', !message);
        authGateMessage.classList.toggle('is-error', type === 'error');
        authGateMessage.classList.toggle('is-success', type === 'success');
    }

    function clearAuthGateMessage() {
        setAuthGateMessage('');
    }

    function setAuthGateDevReset(reset = null) {
        const resetUrl = reset?.resetUrl || '';
        toggleHidden(authGateDevReset, !resetUrl);
        if (authGateDevResetLink) {
            authGateDevResetLink.href = resetUrl || '#';
        }
    }

    function setAuthGateBusy(isBusy) {
        if (!authGateSubmit) return;
        authGateSubmit.disabled = isBusy;
        const copy = AUTH_GATE_COPY[authGateMode] || AUTH_GATE_COPY.login;
        authGateSubmit.innerHTML = isBusy
            ? '<i class="fas fa-spinner fa-spin"></i><span>Working...</span>'
            : `<i class="fas ${copy.submitIcon}"></i><span>${copy.submitLabel}</span>`;
    }

    function setAuthGateMode(mode, options = {}) {
        const nextMode = AUTH_GATE_COPY[mode] ? mode : 'login';
        authGateMode = nextMode;
        const copy = AUTH_GATE_COPY[nextMode];
        const isLogin = nextMode === 'login';
        const isSignup = nextMode === 'signup';
        const isForgot = nextMode === 'forgot';
        const isReset = nextMode === 'reset';

        if (authGateEyebrow) authGateEyebrow.textContent = copy.eyebrow;
        if (authGateTitle) authGateTitle.textContent = copy.title;
        if (authGateSubtitle) authGateSubtitle.textContent = copy.subtitle;
        toggleHidden(authGateTabs, isForgot || isReset);
        toggleHidden(authGateEmailGroup, isReset);
        toggleHidden(authGatePasswordGroup, isForgot || isReset);
        toggleHidden(authGateConfirmGroup, !isSignup && !isReset);
        toggleHidden(authGateTokenGroup, !isReset);
        toggleHidden(authGateNewPasswordGroup, !isReset);
        toggleHidden(authGateForgotBtn, !isLogin);
        toggleHidden(authGateBackBtn, isLogin || isSignup);

        authGateLoginTab?.classList.toggle('is-active', isLogin);
        authGateLoginTab?.setAttribute('aria-selected', String(isLogin));
        authGateSignupTab?.classList.toggle('is-active', isSignup);
        authGateSignupTab?.setAttribute('aria-selected', String(isSignup));

        if (authGatePassword) {
            authGatePassword.autocomplete = isSignup ? 'new-password' : 'current-password';
        }

        setAuthGateBusy(false);
        if (!options.preserveMessage) clearAuthGateMessage();
        if (!options.keepDevReset) setAuthGateDevReset(null);
    }

    function getAuthGateFocusTarget() {
        if (authGateMode === 'reset') return authGateResetToken;
        return authGateEmail;
    }

    function showAuthGate() {
        document.body.classList.remove('auth-loading');
        document.body.classList.add('auth-required');
        authGate?.classList.remove('hidden');
        authGate?.setAttribute('aria-hidden', 'false');
        appShell?.classList.add('app-shell--locked');
        appShell?.setAttribute('aria-hidden', 'true');

        settingsModal?.classList.remove('is-open');
        settingsModal?.classList.add('hidden');
        settingsModal?.setAttribute('aria-hidden', 'true');
        settingsToggle?.setAttribute('aria-expanded', 'false');
        historyDrawer?.classList.remove('is-open');
        historyDrawer?.classList.add('hidden');
        historyDrawer?.setAttribute('aria-hidden', 'true');
        historyToggle?.setAttribute('aria-expanded', 'false');
        updateScrollLock();
        requestAnimationFrame(() => getAuthGateFocusTarget()?.focus());
    }

    function hideAuthGate() {
        document.body.classList.remove('auth-loading');
        document.body.classList.remove('auth-required');
        authGate?.classList.add('hidden');
        authGate?.setAttribute('aria-hidden', 'true');
        appShell?.classList.remove('app-shell--locked');
        appShell?.setAttribute('aria-hidden', 'false');
        clearAuthGateMessage();
        setAuthGateDevReset(null);
        updateScrollLock();
    }

    function clearAuthSecrets() {
        [
            authPassword,
            authGatePassword,
            authGateConfirmPassword,
            authGateResetToken,
            authGateNewPassword
        ].forEach((input) => {
            if (input) input.value = '';
        });
    }

    function updateAuthUi() {
        const signedIn = Boolean(appState.user);
        const label = signedIn ? appState.user.email : 'Sign in';

        if (authStatusBtn) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-user';
            icon.setAttribute('aria-hidden', 'true');

            const text = document.createElement('span');
            text.textContent = signedIn ? 'Account' : 'Sign in';

            authStatusBtn.replaceChildren(icon, text);
            authStatusBtn.title = label;
            authStatusBtn.setAttribute(
                'aria-label',
                signedIn ? `Open account and settings for ${label}` : 'Open account and settings'
            );
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
        toggleHidden(authCredentialFields, signedIn);
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
        renderUsageLimits();
        if (signedIn) {
            hideAuthGate();
        } else {
            showAuthGate();
        }
    }

    async function loadCurrentUser() {
        try {
            const data = await apiRequest('/api/auth/me');
            appState.user = data.user || null;
            if (appState.user) {
                await syncUserSettingsAfterAuth(data.settings)
                    .catch((error) => console.warn('Failed to load user settings.', error));
            }
        } catch (error) {
            appState.user = null;
        }
        updateAuthUi();
        if (appState.user) {
            await refreshUsageLimits();
        } else {
            renderUsageLimits();
        }
        return appState.user;
    }

    function getSettingsAuthCredentials(actionLabel) {
        const email = authEmail?.value?.trim();
        const password = authPassword?.value || '';
        if (!email || !password) {
            alert(`Enter your email and password to ${actionLabel}.`);
            return null;
        }
        return { email, password };
    }

    function getAuthGatePayload() {
        const email = authGateEmail?.value?.trim() || '';
        const password = authGatePassword?.value || '';
        const confirmPassword = authGateConfirmPassword?.value || '';
        const resetToken = authGateResetToken?.value?.trim() || '';
        const newPassword = authGateNewPassword?.value || '';

        if (authGateMode === 'forgot') {
            if (!email) {
                setAuthGateMessage('Enter your email address to request a password reset.', 'error');
                return null;
            }
            return { email };
        }

        if (authGateMode === 'reset') {
            if (!resetToken || !newPassword || !confirmPassword) {
                setAuthGateMessage('Enter the reset token and your new password twice.', 'error');
                return null;
            }
            if (newPassword.length < 8) {
                setAuthGateMessage('Use a password that is at least 8 characters.', 'error');
                return null;
            }
            if (newPassword !== confirmPassword) {
                setAuthGateMessage('The new passwords do not match.', 'error');
                return null;
            }
            return { token: resetToken, password: newPassword };
        }

        if (!email || !password) {
            setAuthGateMessage('Enter your email and password.', 'error');
            return null;
        }

        if (authGateMode === 'signup') {
            if (password.length < 8) {
                setAuthGateMessage('Use a password that is at least 8 characters.', 'error');
                return null;
            }
            if (password !== confirmPassword) {
                setAuthGateMessage('The passwords do not match.', 'error');
                return null;
            }
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

    async function completeAuth(data) {
        appState.user = data.user || null;
        clearAuthSecrets();
        updateAuthUi();
        await syncUserSettingsAfterAuth(data.settings)
            .catch((error) => console.warn('Failed to sync user settings.', error));
        await Promise.all([
            refreshUsageLimits(),
            refreshHistoryList()
        ]);
    }

    async function signInWithCredentials(credentials) {
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: credentials
        });
        await completeAuth(data);
    }

    async function createAccountWithCredentials(credentials) {
        const data = await apiRequest('/api/auth/signup', {
            method: 'POST',
            body: credentials
        });
        await completeAuth(data);
    }

    async function login() {
        const credentials = getSettingsAuthCredentials('sign in');
        if (!credentials) return;

        setAuthBusy(true, 'login');
        try {
            await signInWithCredentials(credentials);
            closeSettingsModal();
        } catch (error) {
            alert(error.message || 'Sign in failed.');
        } finally {
            setAuthBusy(false);
        }
    }

    async function signup() {
        const credentials = getSettingsAuthCredentials('create an account');
        if (!credentials) return;
        if (credentials.password.length < 8) {
            alert('Use a password that is at least 8 characters.');
            return;
        }

        setAuthBusy(true, 'signup');
        try {
            await createAccountWithCredentials(credentials);
            closeSettingsModal();
        } catch (error) {
            alert(error.message || 'Account creation failed.');
        } finally {
            setAuthBusy(false);
        }
    }

    async function requestPasswordReset(email) {
        const data = await apiRequest('/api/auth/password-reset/request', {
            method: 'POST',
            body: { email }
        });

        if (data.reset?.token) {
            if (authGateResetToken) authGateResetToken.value = data.reset.token;
            setAuthGateMode('reset', { preserveMessage: true });
            setAuthGateMessage('Development reset token is ready. Enter a new password to finish.', 'success');
            setAuthGateDevReset(data.reset);
            return;
        }

        setAuthGateMessage(data.message || 'If an account exists for that email, a password reset link will be sent.', 'success');
    }

    async function confirmPasswordReset(payload) {
        const data = await apiRequest('/api/auth/password-reset/confirm', {
            method: 'POST',
            body: payload
        });
        await completeAuth(data);
        clearPasswordResetUrl();
    }

    async function handleAuthGateSubmit(event) {
        event.preventDefault();
        const payload = getAuthGatePayload();
        if (!payload) return;

        setAuthGateBusy(true);
        clearAuthGateMessage();
        try {
            if (authGateMode === 'login') {
                await signInWithCredentials(payload);
            } else if (authGateMode === 'signup') {
                await createAccountWithCredentials(payload);
            } else if (authGateMode === 'forgot') {
                await requestPasswordReset(payload.email);
            } else if (authGateMode === 'reset') {
                await confirmPasswordReset(payload);
            }
        } catch (error) {
            setAuthGateMessage(error.message || 'Authentication failed. Please try again.', 'error');
        } finally {
            setAuthGateBusy(false);
        }
    }

    function hydratePasswordResetFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('reset_token');
        if (!token) return;
        if (authGateResetToken) authGateResetToken.value = token;
        setAuthGateMode('reset', { preserveMessage: true });
        setAuthGateMessage('Choose a new password to finish resetting your account.', 'success');
    }

    function clearPasswordResetUrl() {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('reset_token')) return;
        url.searchParams.delete('reset_token');
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
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
        appState.usageLimits = null;
        appState.usageLimitsError = '';
        appState.usageLimitsLoading = false;
        userSettingsChangedThisSession = false;
        lastPersistedUserSettingsSignature = null;
        if (userSettingsSaveTimer) {
            window.clearTimeout(userSettingsSaveTimer);
            userSettingsSaveTimer = null;
        }
        safeStorageRemove(ACTIVE_REPORT_STORAGE_KEY);
        stopPolling();
        setAuthGateMode('login');
        updateAuthUi();
        renderUsageLimits();
        renderHistoryList([]);
        updateHistoryBadge(0);
        resetValuationForm();
    }

    function requireSignedIn() {
        if (appState.user) return true;
        setAuthGateMode('login', { preserveMessage: true });
        setAuthGateMessage('Please sign in before starting or viewing reports.', 'error');
        showAuthGate();
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

    function setProgressDisplay({ title, iconClass, badge, message }) {
        if (progressTitle) {
            progressTitle.innerHTML = `<i class="${iconClass}"></i>${escapeHtml(title)}`;
        }
        if (progressText) {
            progressText.textContent = badge || title;
        }
        if (progressMessage) {
            progressMessage.textContent = message || '';
        }
    }

    function prepareUiForRun() {
        setGenerateBusy(true, 'Generate Analysis');
        if (newValuationBtn) newValuationBtn.disabled = true;
        setNewValuationVisibility(false);
        updateDownloadButtonState(false);

        setProgressDisplay({
            title: 'Processing',
            iconClass: 'fas fa-circle-notch fa-spin text-brand-500',
            badge: 'Working',
            message: 'Submitting the request and preparing the final report.'
        });
        if (progressSection) progressSection.classList.remove('hidden');
        if (finalReportSection) finalReportSection.classList.add('hidden');
        if (finalReportStatus) finalReportStatus.textContent = 'Submitting request to the backend...';
        if (finalReportContent) finalReportContent.innerHTML = '';
    }

    function applyReportToUi(rawReport, { scroll = false } = {}) {
        const report = normalizeReport(rawReport);
        if (!report) return;

        appState.currentReport = report;
        appState.activeReportId = report.id || null;
        requestState.propertyAddress = report.inputs.propertyAddress || '';
        requestState.inferredAddress = report.finalReport?.inferredAddress || report.output?.inferredAddress || '';
        requestState.finalValueRange = report.finalReport?.valueRange || report.finalReport?.valuations || null;

        if (report.status !== 'completed' && progressSection?.classList.contains('hidden')) {
            prepareUiForRun();
        }

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

        if (scroll) {
            const scrollTarget = report.status === 'completed' || report.status === 'failed'
                ? finalReportSection
                : progressSection;
            scrollTarget?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function showQueuedReport(report) {
        setGenerateBusy(true, 'Generate Analysis');
        if (newValuationBtn) newValuationBtn.disabled = false;
        if (progressSection) progressSection.classList.remove('hidden');
        if (finalReportSection) finalReportSection.classList.add('hidden');
        setProgressDisplay({
            title: 'Queued',
            iconClass: 'fas fa-clock text-brand-500',
            badge: 'Waiting',
            message: 'Your request is queued. The final report will appear here when it is ready.'
        });
        if (finalReportStatus) {
            finalReportStatus.textContent = 'Your report has been queued. You can leave this page and return later.';
        }
        safeStorageSet(ACTIVE_REPORT_STORAGE_KEY, report.id);
    }

    function showProcessingReport(report) {
        setGenerateBusy(true, 'Generate Analysis');
        if (newValuationBtn) newValuationBtn.disabled = false;
        if (progressSection) progressSection.classList.remove('hidden');
        if (finalReportSection) finalReportSection.classList.add('hidden');
        const phase = report.progress?.phase || report.metadata?.progress?.phase || report.metadata?.phase || report.phase || 'reports';
        const message = phase === 'validating'
            ? 'Validating comparable sales before the final report is shown.'
            : phase === 'merging'
                ? 'Generating the final report.'
                : phase === 'compliance_review' || phase === 'compliance_rereview'
                    ? 'Running the final ethics and compliance review.'
                    : phase === 'compliance_revision'
                        ? 'Revising the report to satisfy the final compliance review.'
                        : 'The backend is processing the valuation. The final report will appear when complete.';
        setProgressDisplay({
            title: 'Processing',
            iconClass: 'fas fa-spinner fa-spin text-brand-500',
            badge: 'Working',
            message
        });
        if (finalReportStatus) {
            finalReportStatus.textContent = message;
        }
        safeStorageSet(ACTIVE_REPORT_STORAGE_KEY, report.id);
    }

    function showCompletedReport(report) {
        setGenerateBusy(false, 'Generate Analysis');
        if (newValuationBtn) newValuationBtn.disabled = false;
        setNewValuationVisibility(true);
        safeStorageRemove(ACTIVE_REPORT_STORAGE_KEY);
        updateDownloadButtonState(Boolean(getFinalContent(report)));

        if (progressSection) progressSection.classList.add('hidden');
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

        if (progressSection) progressSection.classList.add('hidden');
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
        await flushUserSettings()
            .catch((error) => console.warn('Failed to save user settings.', error));

        const propertyAddress = document.getElementById('propertyAddress')?.value.trim() || '';
        const additionalDetails = document.getElementById('additionalDetails')?.value.trim() || '';
        const instructions = specialInstructions?.value.trim() || '';
        const reportAudience = document.getElementById('reportAudience')?.value || 'seller';
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

        prepareUiForRun();
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
                    model,
                    reportCount: DEFAULT_REPORT_COUNT,
                    attachments
                }
            });

            const report = normalizeReport(data.report || data);
            appState.activeReportId = report.id;
            safeStorageSet(ACTIVE_REPORT_STORAGE_KEY, report.id);
            applyReportToUi(report, { scroll: true });
            await Promise.all([
                refreshUsageLimits(),
                refreshHistoryList()
            ]);
        } catch (error) {
            if (error.status === 429) {
                refreshUsageLimits()
                    .catch((refreshError) => console.warn('Failed to refresh usage after quota error.', refreshError));
            }
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
            applyReportToUi(report, { scroll: true });
            await Promise.all([
                refreshUsageLimits(),
                refreshHistoryList()
            ]);
        } catch (error) {
            if (error.status === 429) {
                refreshUsageLimits()
                    .catch((refreshError) => console.warn('Failed to refresh usage after quota error.', refreshError));
            }
            alert(error.message || 'Failed to retry report.');
        }
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

        return [
            { label: 'Subject property', value: address },
            { label: 'Prepared for', value: formatHistoryAudience(inputs.reportAudience || finalReport.reportAudience || 'seller') },
            { label: 'Valuation', value: formatPdfValueSummary(mergedValue) || 'See final report' },
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
                        <p class="pdf-report-kicker">Final report</p>
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
                        avoid: [
                            '.pdf-logo-lockup',
                            '.pdf-summary-item',
                            '.pdf-report-header',
                            '.pdf-report-content h1',
                            '.pdf-report-content h2',
                            '.pdf-report-content h3',
                            '.pdf-report-content h4',
                            '.pdf-report-content p',
                            '.pdf-report-content li',
                            '.pdf-report-content blockquote',
                            '.pdf-report-content tr',
                            '.pdf-report-content thead'
                        ]
                    },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        allowTaint: false,
                        backgroundColor: '#ffffff',
                        imageTimeout: 15000,
                        logging: false,
                        scrollY: 0
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
        const normalized = normalizeModelName(model);
        const tier = REPORT_MODEL_TIERS[normalized];
        if (tier) return getTierDisplay(tier).label;
        return normalized || 'Default model';
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
        setHistoryLoading(false);
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
            const status = statusLabel(report.status);
            const canRetry = report.status === 'failed';
            item.innerHTML = `
                <div class="history-item-header">
                    <div class="history-item-title">${title}</div>
                </div>
                <div class="history-item-meta">${escapeHtml(buildHistoryMeta(report))}</div>
                <div class="history-item-tags">
                    <span class="history-tag status-${report.status}">${status}</span>
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

    function setHistoryLoading(loading) {
        if (!historyList) return;
        if (loading) {
            historyList.setAttribute('aria-busy', 'true');
            if (historyEmpty && appState.history.length === 0) {
                historyList.innerHTML = '';
                historyEmpty.classList.remove('hidden');
                historyEmpty.textContent = 'Loading saved valuations...';
            }
            return;
        }
        historyList.removeAttribute('aria-busy');
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

    async function refreshHistoryList(options = {}) {
        const { showLoading = false } = options;
        if (!appState.user) {
            appState.history = [];
            renderHistoryList([]);
            updateHistoryBadge(0);
            return;
        }

        if (showLoading) setHistoryLoading(true);
        try {
            const data = await apiRequest('/api/reports');
            const reports = (data.reports || data || []).map(normalizeReport).filter(Boolean);
            appState.history = reports;
            renderHistoryList(reports);
            updateHistoryBadge(reports.length);
        } catch (error) {
            console.warn('Failed to load saved valuations.', error);
            if (showLoading && appState.history.length === 0 && historyEmpty) {
                historyEmpty.classList.remove('hidden');
                historyEmpty.textContent = 'Saved valuations are unavailable right now.';
            }
        } finally {
            setHistoryLoading(false);
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
        safeStorageRemove(ACTIVE_REPORT_STORAGE_KEY);

        if (progressSection) progressSection.classList.add('hidden');
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
        if (appState.user) {
            refreshUsageLimits()
                .catch((error) => console.warn('Failed to refresh usage limits.', error));
        }
        (appState.user ? settingsClose : authEmail)?.focus();
    }

    function closeSettingsModal() {
        if (!settingsModal) return;
        flushUserSettings({ keepalive: true })
            .catch((error) => console.warn('Failed to save user settings.', error));
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
        }, 240);
    }

    function openHistoryDrawer() {
        if (!historyDrawer) return false;
        if (!requireSignedIn()) return false;
        historyLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        historyDrawer.classList.remove('hidden');
        historyDrawer.setAttribute('aria-hidden', 'false');
        historyToggle?.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => historyDrawer.classList.add('is-open'));
        updateScrollLock();
        historyClose?.focus();
        return true;
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
        }, 240);
    }

    function wireEvents() {
        wireUserSettingsPersistence();

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
        authGateForm?.addEventListener('submit', handleAuthGateSubmit);
        authGateLoginTab?.addEventListener('click', () => setAuthGateMode('login'));
        authGateSignupTab?.addEventListener('click', () => setAuthGateMode('signup'));
        authGateForgotBtn?.addEventListener('click', () => setAuthGateMode('forgot'));
        authGateBackBtn?.addEventListener('click', () => setAuthGateMode('login'));
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
        document.getElementById('modelSelect')?.addEventListener('change', renderUsageLimits);
        usageRefresh?.addEventListener('click', () => {
            refreshUsageLimits()
                .catch((error) => console.warn('Failed to refresh usage limits.', error));
        });

        historyToggle?.addEventListener('click', () => {
            if (!openHistoryDrawer()) return;
            refreshHistoryList({ showLoading: true })
                .catch((error) => console.warn('Failed to load saved valuations.', error));
        });
        historyOverlay?.addEventListener('click', closeHistoryDrawer);
        historyClose?.addEventListener('click', closeHistoryDrawer);
        historyRefresh?.addEventListener('click', () => refreshHistoryList({ showLoading: true }));
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
        window.addEventListener('pagehide', () => {
            flushUserSettings({ keepalive: true })
                .catch((error) => console.warn('Failed to save user settings.', error));
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                flushUserSettings({ keepalive: true })
                    .catch((error) => console.warn('Failed to save user settings.', error));
            }
        });
    }

    async function boot() {
        updateDownloadButtonState(false);
        setNewValuationVisibility(false);
        renderUsageLimits();
        hydratePasswordResetFromUrl();
        applyStoredUserSettings();
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
