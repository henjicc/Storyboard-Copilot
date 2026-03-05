import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Eye, EyeOff, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '@/stores/settingsStore';
import { UiCheckbox, UiSelect } from '@/components/ui';
import { UI_CONTENT_OVERLAY_INSET_CLASS, UI_DIALOG_TRANSITION_MS } from '@/components/ui/motion';
import { useDialogTransition } from '@/components/ui/useDialogTransition';
import { listModelProviders } from '@/features/canvas/models';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsCategory = 'providers' | 'appearance' | 'general' | 'about';

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const {
    apiKeys,
    downloadPresetPaths,
    useUploadFilenameAsNodeTitle,
    storyboardGenKeepStyleConsistent,
    storyboardGenDisableTextInImage,
    ignoreAtTagWhenCopyingAndGenerating,
    uiRadiusPreset,
    themeTonePreset,
    accentColor,
    setProviderApiKey,
    setDownloadPresetPaths,
    setUseUploadFilenameAsNodeTitle,
    setStoryboardGenKeepStyleConsistent,
    setStoryboardGenDisableTextInImage,
    setIgnoreAtTagWhenCopyingAndGenerating,
    setUiRadiusPreset,
    setThemeTonePreset,
    setAccentColor,
  } = useSettingsStore();
  const providers = useMemo(() => listModelProviders(), []);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [appVersion, setAppVersion] = useState<string>('');
  const [localApiKeys, setLocalApiKeys] = useState<Record<string, string>>(apiKeys);
  const [localDownloadPathInput, setLocalDownloadPathInput] = useState('');
  const [localDownloadPresetPaths, setLocalDownloadPresetPaths] = useState(downloadPresetPaths);
  const [localUseUploadFilenameAsNodeTitle, setLocalUseUploadFilenameAsNodeTitle] = useState(
    useUploadFilenameAsNodeTitle
  );
  const [localStoryboardGenKeepStyleConsistent, setLocalStoryboardGenKeepStyleConsistent] =
    useState(storyboardGenKeepStyleConsistent);
  const [localStoryboardGenDisableTextInImage, setLocalStoryboardGenDisableTextInImage] = useState(
    storyboardGenDisableTextInImage
  );
  const [localIgnoreAtTagWhenCopyingAndGenerating, setLocalIgnoreAtTagWhenCopyingAndGenerating] =
    useState(ignoreAtTagWhenCopyingAndGenerating);
  const [localUiRadiusPreset, setLocalUiRadiusPreset] = useState(uiRadiusPreset);
  const [localThemeTonePreset, setLocalThemeTonePreset] = useState(themeTonePreset);
  const [localAccentColor, setLocalAccentColor] = useState(accentColor);
  const [revealedApiKeys, setRevealedApiKeys] = useState<Record<string, boolean>>({});
  const { shouldRender, isVisible } = useDialogTransition(isOpen, UI_DIALOG_TRANSITION_MS);

  useEffect(() => {
    let mounted = true;
    const loadAppVersion = async () => {
      try {
        const version = await getVersion();
        if (mounted) {
          setAppVersion(version);
        }
      } catch {
        if (mounted) {
          setAppVersion('');
        }
      }
    };
    void loadAppVersion();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setLocalApiKeys(apiKeys);
    setLocalDownloadPresetPaths(downloadPresetPaths);
    setLocalUseUploadFilenameAsNodeTitle(useUploadFilenameAsNodeTitle);
    setLocalStoryboardGenKeepStyleConsistent(storyboardGenKeepStyleConsistent);
    setLocalStoryboardGenDisableTextInImage(storyboardGenDisableTextInImage);
    setLocalIgnoreAtTagWhenCopyingAndGenerating(ignoreAtTagWhenCopyingAndGenerating);
    setLocalUiRadiusPreset(uiRadiusPreset);
    setLocalThemeTonePreset(themeTonePreset);
    setLocalAccentColor(accentColor);
    setRevealedApiKeys({});
    setLocalDownloadPathInput('');
  }, [
    apiKeys,
    downloadPresetPaths,
    isOpen,
    useUploadFilenameAsNodeTitle,
    storyboardGenKeepStyleConsistent,
    storyboardGenDisableTextInImage,
    ignoreAtTagWhenCopyingAndGenerating,
    uiRadiusPreset,
    themeTonePreset,
    accentColor,
  ]);

  const handleSave = useCallback(() => {
    providers.forEach((provider) => {
      setProviderApiKey(provider.id, localApiKeys[provider.id] ?? '');
    });
    setDownloadPresetPaths(localDownloadPresetPaths);
    setUseUploadFilenameAsNodeTitle(localUseUploadFilenameAsNodeTitle);
    setStoryboardGenKeepStyleConsistent(localStoryboardGenKeepStyleConsistent);
    setStoryboardGenDisableTextInImage(localStoryboardGenDisableTextInImage);
    setIgnoreAtTagWhenCopyingAndGenerating(localIgnoreAtTagWhenCopyingAndGenerating);
    setUiRadiusPreset(localUiRadiusPreset);
    setThemeTonePreset(localThemeTonePreset);
    setAccentColor(localAccentColor);
    onClose();
  }, [
    localApiKeys,
    localDownloadPresetPaths,
    localUseUploadFilenameAsNodeTitle,
    localStoryboardGenKeepStyleConsistent,
    localStoryboardGenDisableTextInImage,
    localIgnoreAtTagWhenCopyingAndGenerating,
    localUiRadiusPreset,
    localThemeTonePreset,
    localAccentColor,
    providers,
    setProviderApiKey,
    setDownloadPresetPaths,
    setUseUploadFilenameAsNodeTitle,
    setStoryboardGenKeepStyleConsistent,
    setStoryboardGenDisableTextInImage,
    setIgnoreAtTagWhenCopyingAndGenerating,
    setUiRadiusPreset,
    setThemeTonePreset,
    setAccentColor,
    onClose,
  ]);

  const handlePickDownloadPath = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (!selected || Array.isArray(selected)) {
        return;
      }
      setLocalDownloadPresetPaths((previous) => {
        if (previous.includes(selected)) {
          return previous;
        }
        return [...previous, selected].slice(0, 8);
      });
    } catch (error) {
      console.error('Failed to pick download path', error);
    }
  }, []);

  const handleAddDownloadPathFromInput = useCallback(() => {
    const next = localDownloadPathInput.trim();
    if (!next) {
      return;
    }
    setLocalDownloadPresetPaths((previous) => {
      if (previous.includes(next)) {
        return previous;
      }
      return [...previous, next].slice(0, 8);
    });
    setLocalDownloadPathInput('');
  }, [localDownloadPathInput]);

  const handleRemoveDownloadPath = useCallback((path: string) => {
    setLocalDownloadPresetPaths((previous) => previous.filter((value) => value !== path));
  }, []);

  if (!shouldRender) return null;

  return (
    <div className={`fixed ${UI_CONTENT_OVERLAY_INSET_CLASS} z-50 flex items-center justify-center`}>
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`relative h-[500px] w-[700px] overflow-hidden rounded-lg border border-border-dark bg-surface-dark shadow-xl transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'} flex`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-bg-dark rounded transition-colors z-10"
        >
          <X className="w-5 h-5 text-text-muted" />
        </button>

        {/* Sidebar */}
        <div className="w-[180px] bg-bg-dark border-r border-border-dark flex flex-col">
          <div className="px-4 py-4">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              {t('settings.title')}
            </span>
          </div>

          <nav className="flex-1">
            <button
              onClick={() => setActiveCategory('general')}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left
                transition-colors
                ${activeCategory === 'general'
                  ? 'bg-accent/10 text-text-dark border-l-2 border-accent'
                  : 'text-text-muted hover:bg-bg-dark hover:text-text-dark'
                }
              `}
            >
              <span className="text-sm">{t('settings.general')}</span>
            </button>

            <button
              onClick={() => setActiveCategory('providers')}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left
                transition-colors
                ${activeCategory === 'providers'
                  ? 'bg-accent/10 text-text-dark border-l-2 border-accent'
                  : 'text-text-muted hover:bg-bg-dark hover:text-text-dark'
                }
              `}
            >
              <span className="text-sm">{t('settings.providers')}</span>
            </button>

            <button
              onClick={() => setActiveCategory('appearance')}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left
                transition-colors
                ${activeCategory === 'appearance'
                  ? 'bg-accent/10 text-text-dark border-l-2 border-accent'
                  : 'text-text-muted hover:bg-bg-dark hover:text-text-dark'
                }
              `}
            >
              <span className="text-sm">{t('settings.appearance')}</span>
            </button>

            <button
              onClick={() => setActiveCategory('about')}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left
                transition-colors
                ${activeCategory === 'about'
                  ? 'bg-accent/10 text-text-dark border-l-2 border-accent'
                  : 'text-text-muted hover:bg-bg-dark hover:text-text-dark'
                }
              `}
            >
              <span className="text-sm">{t('settings.about')}</span>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {activeCategory === 'providers' && (
            <>
              <div className="px-6 py-5 border-b border-border-dark">
                <h2 className="text-lg font-semibold text-text-dark">
                  {t('settings.providers')}
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  {t('settings.providersDesc')}
                </p>
              </div>

              <div className="ui-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
                {providers.map((provider) => {
                  const displayName = i18n.language.startsWith('zh') ? provider.label : provider.name;
                  const isRevealed = Boolean(revealedApiKeys[provider.id]);

                  return (
                    <div key={provider.id} className="rounded-lg border border-border-dark bg-bg-dark p-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-medium text-text-dark">{displayName}</h3>
                        {provider.id === 'ppio' ? (
                          <a
                            href="https://ppio.com/user/register?invited_by=MLBDS6"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent hover:underline"
                          >
                            {t('settings.getApiKeyLink')}
                          </a>
                        ) : (
                          <p className="text-xs text-text-muted">{provider.id}</p>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type={isRevealed ? 'text' : 'password'}
                          value={localApiKeys[provider.id] ?? ''}
                          onChange={(event) =>
                            setLocalApiKeys((previous) => ({
                              ...previous,
                              [provider.id]: event.target.value,
                            }))
                          }
                          placeholder={t('settings.enterApiKey')}
                          className="w-full rounded border border-border-dark bg-surface-dark px-3 py-2 pr-10 text-sm text-text-dark placeholder:text-text-muted"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedApiKeys((previous) => ({
                              ...previous,
                              [provider.id]: !isRevealed,
                            }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-bg-dark"
                        >
                          {isRevealed ? (
                            <EyeOff className="h-4 w-4 text-text-muted" />
                          ) : (
                            <Eye className="h-4 w-4 text-text-muted" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 border-t border-border-dark flex justify-end">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium bg-accent text-white rounded
                             hover:bg-accent/80 transition-colors"
                >
                  {t('common.save')}
                </button>
              </div>
            </>
          )}

          {activeCategory === 'appearance' && (
            <>
              <div className="px-6 py-5 border-b border-border-dark">
                <h2 className="text-lg font-semibold text-text-dark">
                  {t('settings.appearance')}
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  {t('settings.appearanceDesc')}
                </p>
              </div>

              <div className="ui-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
                <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
                  <h3 className="text-sm font-medium text-text-dark">
                    {t('settings.radiusPreset')}
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {t('settings.radiusPresetDesc')}
                  </p>
                  <div className="mt-3">
                    <UiSelect
                      value={localUiRadiusPreset}
                      onChange={(event) =>
                        setLocalUiRadiusPreset(event.target.value as typeof localUiRadiusPreset)
                      }
                      className="h-9 text-sm"
                    >
                      <option value="compact">{t('settings.radiusCompact')}</option>
                      <option value="default">{t('settings.radiusDefault')}</option>
                      <option value="large">{t('settings.radiusLarge')}</option>
                    </UiSelect>
                  </div>
                </div>

                <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
                  <h3 className="text-sm font-medium text-text-dark">
                    {t('settings.themeTone')}
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {t('settings.themeToneDesc')}
                  </p>
                  <div className="mt-3">
                    <UiSelect
                      value={localThemeTonePreset}
                      onChange={(event) =>
                        setLocalThemeTonePreset(event.target.value as typeof localThemeTonePreset)
                      }
                      className="h-9 text-sm"
                    >
                      <option value="neutral">{t('settings.toneNeutral')}</option>
                      <option value="warm">{t('settings.toneWarm')}</option>
                      <option value="cool">{t('settings.toneCool')}</option>
                    </UiSelect>
                  </div>
                </div>

                <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
                  <h3 className="text-sm font-medium text-text-dark">
                    {t('settings.accentColor')}
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {t('settings.accentColorDesc')}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="color"
                      value={localAccentColor}
                      onChange={(event) => setLocalAccentColor(event.target.value)}
                      className="h-9 w-12 rounded border border-border-dark bg-surface-dark p-1"
                    />
                    <input
                      value={localAccentColor}
                      onChange={(event) => setLocalAccentColor(event.target.value)}
                      placeholder="#3B82F6"
                      className="h-9 flex-1 rounded border border-border-dark bg-surface-dark px-3 text-sm text-text-dark outline-none placeholder:text-text-muted"
                    />
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded border border-border-dark bg-surface-dark px-3 text-xs text-text-dark transition-colors hover:bg-bg-dark"
                      onClick={() => setLocalAccentColor('#3B82F6')}
                    >
                      {t('settings.resetAccentColor')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-border-dark px-6 py-4">
                <button
                  onClick={handleSave}
                  className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
                >
                  {t('common.save')}
                </button>
              </div>
            </>
          )}

          {activeCategory === 'general' && (
            <>
              <div className="px-6 py-5 border-b border-border-dark">
                <h2 className="text-lg font-semibold text-text-dark">
                  {t('settings.general')}
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  {t('settings.generalDesc')}
                </p>
              </div>

              <div className="ui-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
                <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
                  <div className="flex items-start gap-3">
                    <UiCheckbox
                      checked={localStoryboardGenKeepStyleConsistent}
                      onCheckedChange={(checked) => setLocalStoryboardGenKeepStyleConsistent(checked)}
                      className="mt-0.5"
                    />
                    <div>
                      <h3 className="text-sm font-medium text-text-dark">
                        {t('settings.storyboardGenKeepStyleConsistent')}
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        {t('settings.storyboardGenKeepStyleConsistentDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
                  <div className="flex items-start gap-3">
                    <UiCheckbox
                      checked={localIgnoreAtTagWhenCopyingAndGenerating}
                      onCheckedChange={(checked) =>
                        setLocalIgnoreAtTagWhenCopyingAndGenerating(checked)
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <h3 className="text-sm font-medium text-text-dark">
                        {t('settings.ignoreAtTagWhenCopyingAndGenerating')}
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        {t('settings.ignoreAtTagWhenCopyingAndGeneratingDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
                  <div className="flex items-start gap-3">
                    <UiCheckbox
                      checked={localStoryboardGenDisableTextInImage}
                      onCheckedChange={(checked) => setLocalStoryboardGenDisableTextInImage(checked)}
                      className="mt-0.5"
                    />
                    <div>
                      <h3 className="text-sm font-medium text-text-dark">
                        {t('settings.storyboardGenDisableTextInImage')}
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        {t('settings.storyboardGenDisableTextInImageDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
                  <div className="flex items-start gap-3">
                    <UiCheckbox
                      checked={localUseUploadFilenameAsNodeTitle}
                      onCheckedChange={(checked) => setLocalUseUploadFilenameAsNodeTitle(checked)}
                      className="mt-0.5"
                    />
                    <div>
                      <h3 className="text-sm font-medium text-text-dark">
                        {t('settings.useUploadFilenameAsNodeTitle')}
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        {t('settings.useUploadFilenameAsNodeTitleDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-text-dark">
                      {t('settings.downloadPresetPaths')}
                    </h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {t('settings.downloadPresetPathsDesc')}
                    </p>
                  </div>

                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={localDownloadPathInput}
                      onChange={(event) => setLocalDownloadPathInput(event.target.value)}
                      placeholder={t('settings.downloadPathPlaceholder')}
                      className="h-9 flex-1 rounded border border-border-dark bg-surface-dark px-3 text-sm text-text-dark outline-none placeholder:text-text-muted"
                    />
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded border border-border-dark bg-surface-dark px-3 text-xs text-text-dark transition-colors hover:bg-bg-dark"
                      onClick={handleAddDownloadPathFromInput}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {t('settings.addPath')}
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded border border-border-dark bg-surface-dark px-3 text-xs text-text-dark transition-colors hover:bg-bg-dark"
                      onClick={() => {
                        void handlePickDownloadPath();
                      }}
                    >
                      <FolderOpen className="mr-1 h-3.5 w-3.5" />
                      {t('settings.chooseFolder')}
                    </button>
                  </div>

                  <div className="space-y-1">
                    {localDownloadPresetPaths.length > 0 ? (
                      localDownloadPresetPaths.map((path) => (
                        <div
                          key={path}
                          className="flex items-center gap-2 rounded border border-border-dark bg-surface-dark px-2 py-1.5"
                        >
                          <span className="truncate text-xs text-text-dark">{path}</span>
                          <button
                            type="button"
                            className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-dark hover:text-text-dark"
                            onClick={() => handleRemoveDownloadPath(path)}
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-text-muted">{t('settings.noDownloadPresetPaths')}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-border-dark px-6 py-4">
                <button
                  onClick={handleSave}
                  className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
                >
                  {t('common.save')}
                </button>
              </div>
            </>
          )}

          {activeCategory === 'about' && (
            <>
              <div className="px-6 py-5 border-b border-border-dark">
                <h2 className="text-lg font-semibold text-text-dark">
                  {t('settings.about')}
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  {t('settings.aboutDesc')}
                </p>
              </div>

              <div className="ui-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
                <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src="/app-icon.png"
                      alt={t('settings.aboutAppName')}
                      className="h-14 w-14 rounded-lg border border-border-dark object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <a
                        href="https://space.bilibili.com/39337803"
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-semibold text-accent hover:underline"
                      >
                        {t('settings.aboutAppName')}
                      </a>
                      <p className="mt-1 text-sm text-text-muted">
                        {t('settings.aboutIntro')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border-dark bg-bg-dark p-4 space-y-2 text-sm">
                  <p className="text-text-dark">
                    {t('settings.aboutVersionLabel')}: <span className="text-text-muted">{appVersion || t('settings.aboutVersionUnknown')}</span>
                  </p>
                  <p className="text-text-dark">
                    {t('settings.aboutAuthorLabel')}:{' '}
                    <a
                      href="https://space.bilibili.com/39337803"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {t('settings.aboutAuthor')}
                    </a>
                  </p>
                  <p className="text-text-dark">
                    {t('settings.aboutRepositoryLabel')}:{' '}
                    <a
                      href="https://github.com/henjicc/Storyboard-Copilot"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline break-all"
                    >
                      https://github.com/henjicc/Storyboard-Copilot
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-border-dark px-6 py-4">
                <button
                  onClick={onClose}
                  className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
                >
                  {t('common.close')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
