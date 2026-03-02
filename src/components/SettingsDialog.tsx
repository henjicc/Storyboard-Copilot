import { useState, useCallback } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsCategory = 'providers' | 'appearance' | 'general';

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const { apiKey, setApiKey } = useSettingsStore();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('providers');
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = useCallback(() => {
    setApiKey(localApiKey);
    onClose();
  }, [localApiKey, setApiKey, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[700px] h-[500px] bg-surface-dark border border-border-dark rounded-lg shadow-xl flex overflow-hidden">
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

              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                <div
                  className="p-4 bg-bg-dark border border-border-dark rounded-lg"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                      <svg height="1em" style={{ flex: 'none', lineHeight: 1 }} viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
                        <title>PPIO</title>
                        <path clipRule="evenodd" d="M12.002 0C5.377 0 0 5.37 0 11.994c0 3.266 1.309 6.232 3.43 8.395v-8.383c0-2.288.893-4.447 2.51-6.063a8.513 8.513 0 016.066-2.509h.07l-.074.008c4.735 0 8.575 3.84 8.575 8.571 0 .413-.03.818-.087 1.219l-4.844-4.86A5.12 5.12 0 0012.01 6.87a5.126 5.126 0 00-3.637 1.503 5.107 5.107 0 00-1.507 3.641c0 1.376.536 2.666 1.507 3.64a5.12 5.12 0 003.637 1.504 5.126 5.126 0 003.637-1.503 5.114 5.114 0 001.496-3.348l2.842 2.853c-1.256 3.18-4.353 5.433-7.978 5.433-1.879 0-3.671-.6-5.145-1.714v3.967c1.56.742 3.3 1.155 5.137 1.155C18.623 24 24 18.63 24 12.006 24.008 5.373 18.635.004 12.006.004L12.002 0z" fill="#2874FF" fillRule="evenodd"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-text-dark">
                        {i18n.language === 'zh' ? '派欧云' : 'PPIO'}
                      </h3>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={localApiKey}
                      onChange={(e) => setLocalApiKey(e.target.value)}
                      placeholder={t('settings.enterApiKey')}
                      className="w-full px-3 py-2 pr-10 bg-surface-dark border border-border-dark rounded
                                 text-sm text-text-dark placeholder:text-text-muted"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-bg-dark rounded"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4 text-text-muted" />
                      ) : (
                        <Eye className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                  </div>
                </div>
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

              <div className="flex-1 p-6">
                <p className="text-text-muted text-sm">{t('settings.comingSoon')}</p>
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

              <div className="flex-1 p-6">
                <p className="text-text-muted text-sm">{t('settings.comingSoon')}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
