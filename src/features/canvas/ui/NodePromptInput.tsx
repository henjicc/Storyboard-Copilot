import {
  type KeyboardEvent,
  memo,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { NodeToolbar as ReactFlowNodeToolbar, Position } from '@xyflow/react';
import {
  ArrowUp,
  SlidersHorizontal,
} from 'lucide-react';

import {
  AUTO_REQUEST_ASPECT_RATIO,
  isImageEditNode,
  type ImageSize,
  type CanvasNode,
} from '@/features/canvas/domain/canvasNodes';
import {
  canvasAiGateway,
  graphImageResolver,
} from '@/features/canvas/application/canvasServices';
import {
  detectAspectRatio,
  imageUrlToDataUrl,
  parseAspectRatio,
} from '@/features/canvas/application/imageData';
import {
  DEFAULT_IMAGE_MODEL_ID,
  getImageModel,
  getModelProvider,
  listImageModels,
} from '@/features/canvas/models';
import { useCanvasStore } from '@/stores/canvasStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  UiButton,
  UiChipButton,
  UiPanel,
  UiTextAreaField,
} from '@/components/ui';

interface NodePromptInputProps {
  node: CanvasNode;
}

interface AspectRatioChoice {
  value: string;
  label: string;
}

const AUTO_ASPECT_RATIO_OPTION: AspectRatioChoice = {
  value: AUTO_REQUEST_ASPECT_RATIO,
  label: '自动',
};

function pickClosestAspectRatio(
  targetRatio: number,
  supportedAspectRatios: string[]
): string {
  const supported = supportedAspectRatios.length > 0 ? supportedAspectRatios : ['1:1'];
  let bestValue = supported[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const aspectRatio of supported) {
    const ratio = parseAspectRatio(aspectRatio);
    const distance = Math.abs(Math.log(ratio / targetRatio));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestValue = aspectRatio;
    }
  }

  return bestValue;
}

function NanoBananaIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.5 19.824c0-.548.444-.992.991-.992h.744a.991.991 0 010 1.983H2.49a.991.991 0 01-.991-.991z" fill="#F3AD61" />
      <path d="M14.837 13.5h7.076c.522 0 .784-.657.413-1.044l-1.634-1.704a3.183 3.183 0 00-4.636 0l-1.633 1.704c-.37.385-.107 1.044.414 1.044zM3.587 13.5h7.076c.521 0 .784-.659.414-1.044l-1.635-1.704a3.183 3.183 0 00-4.636 0l-1.633 1.704c-.37.385-.107 1.044.414 1.044z" fill="#F9C23C" />
      <path d="M12.525 1.521c3.69-.53 5.97 8.923 4.309 12.744-1.662 3.82-5.248 4.657-9.053 6.152a3.49 3.49 0 01-1.279.244c-1.443 0-2.227 1.187-2.774-.282-.707-1.9.22-4.031 2.069-4.757 2.014-.79 3.084-2.308 3.89-4.364.82-2.096.877-2.956.873-5.241-.003-1.827-.123-4.195 1.965-4.496z" fill="#FEEFC2" />
      <path d="M16.834 14.264l-7.095-3.257c-.815 1.873-2.29 3.308-4.156 4.043-2.16.848-3.605 3.171-2.422 5.54 2.364 4.727 13.673-.05 13.673-6.325z" fill="#FCD53F" />
      <path d="M13.68 12.362c.296.094.46.41.365.707-1.486 4.65-5.818 6.798-9.689 6.997a.562.562 0 11-.057-1.124c3.553-.182 7.372-2.138 8.674-6.216a.562.562 0 01.707-.364z" fill="#F9C23C" />
      <path d="M17.43 19.85l-7.648-8.835h6.753c1.595.08 2.846 1.433 2.846 3.073v5.664c0 .997-.898 1.302-1.95.098z" fill="#FFF478" />
    </svg>
  );
}

function getRatioPreviewStyle(ratio: string): { width: number; height: number } {
  const [rawW, rawH] = ratio.split(':').map((value) => Number(value));
  const width = Number.isFinite(rawW) && rawW > 0 ? rawW : 1;
  const height = Number.isFinite(rawH) && rawH > 0 ? rawH : 1;

  const box = 20;
  if (width >= height) {
    return {
      width: box,
      height: Math.max(8, Math.round((box * height) / width)),
    };
  }

  return {
    width: Math.max(8, Math.round((box * width) / height)),
    height: box,
  };
}

export const NodePromptInput = memo(({ node }: NodePromptInputProps) => {
  const [error, setError] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<'model' | 'params' | null>(null);
  const [renderPanel, setRenderPanel] = useState<'model' | 'params' | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerCursor, setPickerCursor] = useState<number | null>(null);

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const apiKey = useSettingsStore((state) => state.apiKey);

  const imageEditNode = isImageEditNode(node) ? node : null;

  const incomingImages = useMemo(
    () => graphImageResolver.collectInputImages(imageEditNode?.id ?? '', nodes, edges),
    [imageEditNode?.id, nodes, edges]
  );

  const imageModels = useMemo(() => listImageModels(), []);

  const selectedModel = useMemo(() => {
    const modelId = imageEditNode?.data.model ?? DEFAULT_IMAGE_MODEL_ID;
    return getImageModel(modelId);
  }, [imageEditNode?.data.model]);

  const selectedProvider = useMemo(
    () => getModelProvider(selectedModel.providerId),
    [selectedModel.providerId]
  );

  const selectedResolution = useMemo(
    () =>
      selectedModel.resolutions.find((item) => item.value === imageEditNode?.data.size) ??
      selectedModel.resolutions.find((item) => item.value === selectedModel.defaultResolution) ??
      selectedModel.resolutions[0],
    [imageEditNode?.data.size, selectedModel]
  );

  const aspectRatioOptions = useMemo<AspectRatioChoice[]>(
    () => [AUTO_ASPECT_RATIO_OPTION, ...selectedModel.aspectRatios],
    [selectedModel.aspectRatios]
  );

  const selectedAspectRatio = useMemo(
    () =>
      aspectRatioOptions.find((item) => item.value === imageEditNode?.data.requestAspectRatio) ??
      AUTO_ASPECT_RATIO_OPTION,
    [aspectRatioOptions, imageEditNode?.data.requestAspectRatio]
  );

  const requestResolution = selectedModel.resolveRequest({
    referenceImageCount: incomingImages.length,
  });

  const supportedAspectRatioValues = useMemo(
    () => selectedModel.aspectRatios.map((item) => item.value),
    [selectedModel.aspectRatios]
  );

  useEffect(() => {
    if (!imageEditNode) {
      return;
    }

    if (imageEditNode.data.model !== selectedModel.id) {
      updateNodeData(imageEditNode.id, { model: selectedModel.id });
    }

    if (imageEditNode.data.size !== selectedResolution.value) {
      updateNodeData(imageEditNode.id, { size: selectedResolution.value as ImageSize });
    }

    if (imageEditNode.data.requestAspectRatio !== selectedAspectRatio.value) {
      updateNodeData(imageEditNode.id, { requestAspectRatio: selectedAspectRatio.value });
    }
  }, [
    imageEditNode,
    selectedModel.id,
    selectedResolution.value,
    selectedAspectRatio.value,
    updateNodeData,
  ]);

  useEffect(() => {
    if (incomingImages.length === 0) {
      setShowImagePicker(false);
      setPickerCursor(null);
    }
  }, [incomingImages.length]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as globalThis.Node)) {
        return;
      }

      setOpenPanel(null);
      setShowImagePicker(false);
    };

    document.addEventListener('mousedown', handleOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside, true);
    };
  }, []);

  useEffect(() => {
    const animationDurationMs = 200;
    let enterRaf1: number | null = null;
    let enterRaf2: number | null = null;
    let switchTimer: ReturnType<typeof setTimeout> | null = null;

    const startEnterAnimation = () => {
      enterRaf1 = requestAnimationFrame(() => {
        enterRaf2 = requestAnimationFrame(() => {
          setIsPanelVisible(true);
        });
      });
    };

    if (!openPanel) {
      setIsPanelVisible(false);
      switchTimer = setTimeout(() => setRenderPanel(null), animationDurationMs);
      return () => {
        if (switchTimer) {
          clearTimeout(switchTimer);
        }
        if (enterRaf1) {
          cancelAnimationFrame(enterRaf1);
        }
        if (enterRaf2) {
          cancelAnimationFrame(enterRaf2);
        }
      };
    }

    if (renderPanel && renderPanel !== openPanel) {
      setIsPanelVisible(false);
      switchTimer = setTimeout(() => {
        setRenderPanel(openPanel);
        startEnterAnimation();
      }, animationDurationMs);
      return () => {
        if (switchTimer) {
          clearTimeout(switchTimer);
        }
        if (enterRaf1) {
          cancelAnimationFrame(enterRaf1);
        }
        if (enterRaf2) {
          cancelAnimationFrame(enterRaf2);
        }
      };
    }

    if (!renderPanel) {
      setRenderPanel(openPanel);
    }
    startEnterAnimation();

    return () => {
      if (switchTimer) {
        clearTimeout(switchTimer);
      }
      if (enterRaf1) {
        cancelAnimationFrame(enterRaf1);
      }
      if (enterRaf2) {
        cancelAnimationFrame(enterRaf2);
      }
    };
  }, [openPanel, renderPanel]);

  const handleGenerate = useCallback(async () => {
    if (!imageEditNode) {
      return;
    }
    if (imageEditNode.data.isGenerating) {
      return;
    }

    const prompt = imageEditNode.data.prompt.replace(/@(?=图\d+)/g, '').trim();
    if (!prompt) {
      setError('请输入提示词');
      return;
    }

    if (!apiKey) {
      setError('请在设置中填写 API Key');
      return;
    }

    const generationDurationMs = selectedModel.expectedDurationMs ?? 60000;
    updateNodeData(imageEditNode.id, {
      isGenerating: true,
      generationStartedAt: Date.now(),
      generationDurationMs,
    });
    setSelectedNode(null);
    setOpenPanel(null);
    setError(null);

    try {
      await canvasAiGateway.setApiKey('ppio', apiKey);

      let resolvedRequestAspectRatio = selectedAspectRatio.value;
      if (resolvedRequestAspectRatio === AUTO_REQUEST_ASPECT_RATIO) {
        if (incomingImages.length > 0) {
          try {
            const sourceAspectRatio = await detectAspectRatio(incomingImages[0]);
            const sourceAspectRatioValue = parseAspectRatio(sourceAspectRatio);
            resolvedRequestAspectRatio = pickClosestAspectRatio(
              sourceAspectRatioValue,
              supportedAspectRatioValues
            );
          } catch {
            resolvedRequestAspectRatio = pickClosestAspectRatio(1, supportedAspectRatioValues);
          }
        } else {
          resolvedRequestAspectRatio = pickClosestAspectRatio(1, supportedAspectRatioValues);
        }
      }

      const resultUrl = await canvasAiGateway.generateImage({
        prompt,
        model: requestResolution.requestModel,
        size: selectedResolution.value,
        aspectRatio: resolvedRequestAspectRatio,
        referenceImages: incomingImages,
      });

      const dataUrl = await imageUrlToDataUrl(resultUrl);
      const aspectRatio = await detectAspectRatio(dataUrl);

      updateNodeData(imageEditNode.id, {
        imageUrl: dataUrl,
        aspectRatio,
        requestAspectRatio: selectedAspectRatio.value,
        isGenerating: false,
        generationStartedAt: null,
      });
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : '生成失败');
      updateNodeData(imageEditNode.id, {
        isGenerating: false,
        generationStartedAt: null,
      });
    }
  }, [
    apiKey,
    imageEditNode,
    incomingImages,
    requestResolution.requestModel,
    selectedModel.expectedDurationMs,
    supportedAspectRatioValues,
    setSelectedNode,
    selectedAspectRatio.value,
    selectedResolution.value,
    updateNodeData,
  ]);

  if (!imageEditNode) {
    return null;
  }

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === '@' && incomingImages.length > 0) {
      event.preventDefault();
      const cursor = event.currentTarget.selectionStart ?? imageEditNode.data.prompt.length;
      setPickerCursor(cursor);
      setShowImagePicker(true);
      return;
    }

    if (event.key === 'Escape' && showImagePicker) {
      event.preventDefault();
      setShowImagePicker(false);
      setPickerCursor(null);
    }
  };

  const insertImageReference = (imageIndex: number) => {
    const marker = `图${imageIndex + 1}`;
    const currentPrompt = imageEditNode.data.prompt;
    const cursor = pickerCursor ?? currentPrompt.length;
    const nextPrompt = `${currentPrompt.slice(0, cursor)}${marker}${currentPrompt.slice(cursor)}`;

    updateNodeData(imageEditNode.id, { prompt: nextPrompt });
    setShowImagePicker(false);

    const nextCursor = cursor + marker.length;
    requestAnimationFrame(() => {
      promptRef.current?.focus();
      promptRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <ReactFlowNodeToolbar
      nodeId={imageEditNode.id}
      isVisible
      position={Position.Bottom}
      align="center"
      offset={14}
      className="pointer-events-auto"
    >
      <div ref={containerRef} className="relative">
        <UiPanel className="w-[540px] p-2">
          <UiTextAreaField
            ref={promptRef}
            value={imageEditNode.data.prompt}
            onChange={(event) => updateNodeData(imageEditNode.id, { prompt: event.target.value })}
            onKeyDown={handlePromptKeyDown}
            placeholder="描述任何你想要生成或编辑的内容"
            className="h-32 border-none bg-transparent px-1 py-1.5 text-sm leading-7 placeholder:text-text-muted/80 focus:border-transparent"
          />

          {showImagePicker && incomingImages.length > 0 && (
            <div className="absolute left-2 top-2 z-30 w-[220px] rounded-xl border border-[rgba(255,255,255,0.16)] bg-surface-dark p-2 shadow-xl">
              <div className="mb-2 text-lg leading-none text-text-dark">@</div>
              <div className="max-h-[180px] space-y-1 overflow-y-auto">
                {incomingImages.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() => insertImageReference(index)}
                    className="flex w-full items-center gap-2 rounded-lg border border-transparent bg-bg-dark/70 px-2 py-2 text-left text-sm text-text-dark transition-colors hover:border-[rgba(255,255,255,0.18)]"
                  >
                    <img
                      src={imageUrl}
                      alt={`图${index + 1}`}
                      className="h-8 w-8 rounded object-cover"
                    />
                    <span>{`图${index + 1}`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-1 flex items-center gap-1">
            <div className="relative">
              <UiChipButton
                active={openPanel === 'model'}
                onClick={() => setOpenPanel((current) => (current === 'model' ? null : 'model'))}
              >
                <NanoBananaIcon className="h-4 w-4" />
                <span className="font-medium">{selectedModel.displayName}</span>
                <span className="text-text-muted/80">{selectedProvider.name}</span>
              </UiChipButton>

              {renderPanel === 'model' && (
                <UiPanel
                  className={`absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-[360px] -translate-x-1/2 p-2 transition-all duration-200 ease-out ${
                    isPanelVisible
                      ? 'translate-y-0 scale-100 opacity-100'
                      : 'pointer-events-none translate-y-2 scale-95 opacity-0'
                  }`}
                >
                  <div className="max-h-[300px] space-y-1 overflow-y-auto pr-1">
                    {imageModels.map((model) => {
                      const provider = getModelProvider(model.providerId);
                      const active = model.id === selectedModel.id;

                      return (
                        <button
                          key={model.id}
                          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                            active
                              ? 'border-accent/45 bg-accent/15'
                              : 'border-transparent bg-bg-dark/70 hover:border-[rgba(255,255,255,0.14)]'
                          }`}
                          onClick={() => {
                            updateNodeData(imageEditNode.id, { model: model.id });
                            setOpenPanel(null);
                          }}
                        >
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-bg-dark text-text-muted">
                            <NanoBananaIcon className="h-4 w-4" />
                          </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-text-dark">{model.displayName}</div>
                      <div className="truncate text-xs text-text-muted">
                        {provider.name} · {model.description}
                      </div>
                    </div>
                  </button>
                );
              })}
                  </div>
                </UiPanel>
              )}
            </div>

            <div className="relative">
              <UiChipButton
                active={openPanel === 'params'}
                onClick={() => setOpenPanel((current) => (current === 'params' ? null : 'params'))}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>{selectedAspectRatio.label}</span>
                <span className="text-text-muted/80">· {selectedResolution.label}</span>
              </UiChipButton>

              {renderPanel === 'params' && (
                <UiPanel
                  className={`absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-[420px] -translate-x-1/2 p-3 transition-all duration-200 ease-out ${
                    isPanelVisible
                      ? 'translate-y-0 scale-100 opacity-100'
                      : 'pointer-events-none translate-y-2 scale-95 opacity-0'
                  }`}
                >
                  <div>
                    <div className="mb-2 text-xs text-text-muted">画质</div>
                    <div className="grid grid-cols-4 gap-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-bg-dark/65 p-1">
                      {selectedModel.resolutions.map((item) => {
                        const active = item.value === selectedResolution.value;
                        return (
                          <button
                            key={item.value}
                            className={`h-8 rounded-lg text-sm transition-colors ${
                              active
                                ? 'bg-surface-dark text-text-dark'
                                : 'text-text-muted hover:bg-bg-dark'
                            }`}
                            onClick={() =>
                              updateNodeData(imageEditNode.id, {
                                size: item.value as ImageSize,
                              })
                            }
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-2 text-xs text-text-muted">比例</div>
                    <div className="grid grid-cols-5 gap-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-bg-dark/65 p-1">
                      {aspectRatioOptions.map((item) => {
                        const active = item.value === selectedAspectRatio.value;
                        const previewStyle = getRatioPreviewStyle(
                          item.value === AUTO_REQUEST_ASPECT_RATIO ? '1:1' : item.value
                        );
                        return (
                          <button
                            key={item.value}
                            className={`rounded-lg px-1 py-1.5 transition-colors ${
                              active
                                ? 'bg-surface-dark text-text-dark'
                                : 'text-text-muted hover:bg-bg-dark'
                            }`}
                            onClick={() =>
                              updateNodeData(imageEditNode.id, {
                                requestAspectRatio: item.value,
                              })
                            }
                          >
                            <div className="mb-1 flex h-6 items-center justify-center">
                              {item.value === AUTO_REQUEST_ASPECT_RATIO ? (
                                <span className="text-[10px] font-semibold">AUTO</span>
                              ) : (
                                <span
                                  className="inline-block rounded-[3px] border border-current/60"
                                  style={previewStyle}
                                />
                              )}
                            </div>
                            <div className="text-[10px]">{item.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </UiPanel>
              )}
            </div>

            <div className="ml-auto" />

            <UiButton
              onClick={handleGenerate}
              variant="primary"
              className="h-10 w-10 rounded-full px-0"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.8} />
            </UiButton>
          </div>

          {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
        </UiPanel>

      </div>
    </ReactFlowNodeToolbar>
  );
});

NodePromptInput.displayName = 'NodePromptInput';
