import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Zap, Plus, Edit3, Trash2, RefreshCw, Server, Key, Cpu, Check, X,
  Settings, Sparkles, Eye, EyeOff, Globe, Activity, FolderOpen,
  ChevronRight, Star, Copy, AlertTriangle, Info
} from 'lucide-react';
import './styles.css';

interface Provider {
  name: string;
  base_url: string;
  api_key: string;
  model?: string;
  api_mode?: string;
}

interface ModelConfig {
  provider: string;
  base_url?: string;
  api_key?: string;
  default?: string;
  api_mode?: string;
}

interface HermesConfig {
  model: ModelConfig;
  custom_providers: Provider[];
}

interface ProviderTemplate {
  name: string;
  display_name: string;
  base_url: string;
  default_model: string;
  description: string;
  api_mode?: string;
}

function App() {
  const [config, setConfig] = useState<HermesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{name: string, ok: boolean, msg?: string} | null>(null);
  const [templates, setTemplates] = useState<ProviderTemplate[]>([]);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [configPath, setConfigPath] = useState<string>('');

  const [formData, setFormData] = useState<Provider>({
    name: '', base_url: '', api_key: '', model: '', api_mode: ''
  });

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, path] = await Promise.all([
        invoke<HermesConfig>('load_config'),
        invoke<string>('get_config_file_path')
      ]);
      setConfig(cfg);
      setConfigPath(path);
      if (cfg.model.base_url) {
        const current = cfg.custom_providers.find(p => p.base_url === cfg.model.base_url);
        if (current) setSelectedProvider(current.name);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const temps = await invoke<ProviderTemplate[]>('get_provider_templates');
      setTemplates(temps);
    } catch (e) {
      console.error('加载模板失败:', e);
    }
  };

  useEffect(() => {
    loadConfig();
    loadTemplates();
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const handleActivate = async () => {
    if (!config || !selectedProvider) return;
    try {
      const newConfig = await invoke<HermesConfig>('switch_provider', {
        config, providerName: selectedProvider
      });
      setConfig(newConfig);
      showSuccess(`已激活: ${selectedProvider}`);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDoubleClickActivate = async (name: string) => {
    if (!config) return;
    try {
      const newConfig = await invoke<HermesConfig>('switch_provider', {
        config, providerName: name
      });
      setConfig(newConfig);
      setSelectedProvider(name);
      showSuccess(`已激活: ${name}`);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleTestConnection = async (provider: Provider) => {
    setTestingProvider(provider.name);
    setTestResult(null);
    try {
      const ok = await invoke<boolean>('test_provider_connection', {
        baseUrl: provider.base_url,
        apiKey: provider.api_key,
        model: provider.model,
        apiMode: provider.api_mode
      });
      setTestResult({ name: provider.name, ok });
      showSuccess(ok ? `${provider.name} 连接成功` : `${provider.name} 连接异常`);
    } catch (e) {
      setTestResult({ name: provider.name, ok: false, msg: String(e) });
      setError(`${provider.name} 测试失败: ${e}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleAdd = () => {
    setFormData({ name: '', base_url: '', api_key: '', model: '', api_mode: '' });
    setEditingProvider(null);
    setIsEditing(false);
    setShowEditor(true);
  };

  const handleEdit = () => {
    if (!config || !selectedProvider) return;
    const provider = config.custom_providers.find(p => p.name === selectedProvider);
    if (!provider) return;
    setFormData({
      name: provider.name,
      base_url: provider.base_url,
      api_key: provider.api_key,
      model: provider.model || '',
      api_mode: provider.api_mode || ''
    });
    setEditingProvider(provider);
    setIsEditing(true);
    setShowEditor(true);
  };

  const handleDelete = async () => {
    if (!config || !selectedProvider) return;
    if (!confirm(`确定要删除 Provider "${selectedProvider}" 吗？`)) return;
    try {
      const newConfig = await invoke<HermesConfig>('delete_provider', {
        config, name: selectedProvider
      });
      setConfig(newConfig);
      setSelectedProvider(null);
      showSuccess('已删除');
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSave = async () => {
    if (!config) return;
    if (!formData.name || !formData.base_url || !formData.api_key) {
      setError('名称、API 地址和 API Key 为必填项');
      return;
    }
    const provider: Provider = {
      name: formData.name,
      base_url: formData.base_url,
      api_key: formData.api_key,
      model: formData.model || undefined,
      api_mode: formData.api_mode || undefined
    };
    try {
      let newConfig: HermesConfig;
      if (isEditing && editingProvider) {
        newConfig = await invoke<HermesConfig>('update_provider', {
          config, oldName: editingProvider.name, provider
        });
      } else {
        newConfig = await invoke<HermesConfig>('add_provider', { config, provider });
      }
      setConfig(newConfig);
      setSelectedProvider(provider.name);
      setShowEditor(false);
      showSuccess(isEditing ? '已更新' : '已添加');
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSelectTemplate = (template: ProviderTemplate) => {
    setFormData({
      name: template.name,
      base_url: template.base_url,
      api_key: '',
      model: template.default_model,
      api_mode: template.api_mode || ''
    });
    setShowTemplatePicker(false);
    setShowEditor(true);
  };

  const toggleApiKeyVisibility = (name: string) => {
    setShowApiKey(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('已复制到剪贴板');
    } catch {
      showSuccess('复制失败');
    }
  };

  const openConfigDir = async () => {
    try {
      await invoke('open_config_directory');
    } catch (e) {
      setError(String(e));
    }
  };

  const getCurrentProvider = (): Provider | null => {
    if (!config?.model.base_url) return null;
    return config.custom_providers.find(p => p.base_url === config.model.base_url) || null;
  };

  const currentProvider = getCurrentProvider();

  const sortedProviders = config?.custom_providers.slice().sort((a, b) => {
    if (a.name === currentProvider?.name) return -1;
    if (b.name === currentProvider?.name) return 1;
    return a.name.localeCompare(b.name);
  }) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">加载配置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Sparkles className="w-7 h-7 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Hermes Provider Switcher
            </h1>
          </div>
          <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
            <Info className="w-3.5 h-3.5" />
            一键切换 AI Provider，Ctrl+C 退出当前 Hermes 对话并重进，即刻生效
          </p>
        </div>

        {/* Current Status Card */}
        <div className={`rounded-2xl p-6 mb-6 border transition-all ${
          currentProvider
            ? 'bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border-indigo-500/40 shadow-lg shadow-indigo-500/20'
            : 'bg-gray-900/50 border-gray-700/50'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${currentProvider ? 'bg-indigo-500/20' : 'bg-gray-700/30'}`}>
              <Zap className={`w-5 h-5 ${currentProvider ? 'text-indigo-400' : 'text-gray-500'}`} />
            </div>
            <span className="text-gray-400 text-sm font-medium">当前激活</span>
            {currentProvider && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                <Activity className="w-3 h-3" />
                运行中
              </span>
            )}
          </div>
          {currentProvider ? (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{currentProvider.name}</h2>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-300">
                  <Cpu className="w-3.5 h-3.5" />
                  {config?.model.default || currentProvider.model || 'default'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-700/50 rounded-full text-gray-300 font-mono text-xs">
                  <Globe className="w-3 h-3" />
                  {currentProvider.base_url.replace(/^https?:\/\//, '')}
                </span>
                {currentProvider.api_mode && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 rounded-full text-purple-300 text-xs">
                    <Server className="w-3 h-3" />
                    {currentProvider.api_mode}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-gray-400">
              <AlertTriangle className="w-5 h-5 text-yellow-500/60" />
              <p>未配置 Provider，请添加并激活一个</p>
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-4 flex items-center gap-3 animate-fade-in">
            <X className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 mb-4 flex items-center gap-3 animate-fade-in">
            <Check className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-green-300 text-sm">{successMessage}</p>
          </div>
        )}
        {testResult && (
          <div className={`border rounded-xl p-4 mb-4 flex items-center gap-3 animate-fade-in ${
            testResult.ok
              ? 'bg-green-900/20 border-green-500/30'
              : 'bg-yellow-900/20 border-yellow-500/30'
          }`}>
            {testResult.ok ? (
              <Check className="w-5 h-5 text-green-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            )}
            <p className={`text-sm ${testResult.ok ? 'text-green-300' : 'text-yellow-300'}`}>
              {testResult.ok
                ? `${testResult.name} 连接正常`
                : `${testResult.name} 连接异常${testResult.msg ? ': ' + testResult.msg : ''}`
              }
            </p>
            <button onClick={() => setTestResult(null)} className="ml-auto text-gray-400 hover:text-white shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Provider List */}
        <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-400" />
              已配置 Providers
              <span className="text-sm font-normal text-gray-500">
                ({config?.custom_providers.length || 0})
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={openConfigDir}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                title="打开配置目录"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <button
                onClick={loadConfig}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                title="刷新"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-700/30">
            {sortedProviders.map((provider) => {
              const isCurrent = currentProvider?.name === provider.name;
              const isSelected = selectedProvider === provider.name;
              const isTesting = testingProvider === provider.name;
              const showKey = showApiKey[provider.name];

              return (
                <div
                  key={provider.name}
                  onClick={() => setSelectedProvider(provider.name)}
                  onDoubleClick={() => handleDoubleClickActivate(provider.name)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/15 border-l-4 border-indigo-500'
                      : 'hover:bg-gray-800/40 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {isCurrent && (
                        <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
                      )}
                      <h4 className="font-semibold text-white">{provider.name}</h4>
                      {provider.model && (
                        <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md">
                          {provider.model}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          当前
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTestConnection(provider); }}
                        disabled={isTesting}
                        className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="测试连接"
                      >
                        {isTesting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Activity className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    <span className="text-gray-500 font-mono text-xs truncate">
                      {provider.base_url}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Key className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    <span className="text-gray-500 font-mono text-xs">
                      {showKey ? provider.api_key : '•'.repeat(Math.min(provider.api_key.length, 24))}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleApiKeyVisibility(provider.name); }}
                      className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
                      title={showKey ? '隐藏' : '显示'}
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(provider.api_key); }}
                      className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
                      title="复制"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {(!config?.custom_providers || config.custom_providers.length === 0) && (
              <div className="p-10 text-center text-gray-500">
                <Server className="w-14 h-14 mx-auto mb-4 opacity-40" />
                <p className="text-lg mb-1">暂无自定义 Provider</p>
                <p className="text-sm mb-4">点击下方按钮添加，或从预设模板快速创建</p>
                <button
                  onClick={() => setShowTemplatePicker(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg transition-colors text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  从模板添加
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3 animate-fade-in">
          <button
            onClick={handleActivate}
            disabled={!selectedProvider || currentProvider?.name === selectedProvider}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            <Zap className="w-4 h-4" />
            {currentProvider?.name === selectedProvider ? '已激活' : '激活'}
          </button>
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 rounded-xl transition-colors border border-indigo-500/30"
          >
            <Sparkles className="w-4 h-4" />
            模板
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-5 py-3 bg-gray-700/50 hover:bg-gray-700 text-white rounded-xl transition-colors border border-gray-600"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
          <button
            onClick={handleEdit}
            disabled={!selectedProvider}
            className="flex items-center gap-2 px-5 py-3 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors border border-gray-600"
          >
            <Edit3 className="w-4 h-4" />
            编辑
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedProvider}
            className="flex items-center gap-2 px-5 py-3 bg-red-900/30 hover:bg-red-900/50 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 rounded-xl transition-colors border border-red-800/50"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-xs space-y-1">
          <p>修改配置后，Ctrl+C 退出当前 Hermes 对话并重进，即刻生效</p>
          {configPath && (
            <p className="flex items-center justify-center gap-1 text-gray-700">
              <FolderOpen className="w-3 h-3" />
              {configPath}
            </p>
          )}
        </div>

        {/* Template Picker Modal */}
        {showTemplatePicker && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">
              <div className="p-5 border-b border-gray-700 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  选择 Provider 模板
                </h3>
                <button onClick={() => setShowTemplatePicker(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handleSelectTemplate(template)}
                    className="text-left p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-indigo-500/50 rounded-xl transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {template.display_name}
                      </h4>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{template.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-400 rounded font-mono">
                        {template.base_url.replace(/^https?:\/\//, '')}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded">
                        {template.default_model}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-gray-700 text-center shrink-0">
                <button
                  onClick={() => { setShowTemplatePicker(false); handleAdd(); }}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  或者手动添加自定义 Provider
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Editor Modal */}
        {showEditor && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg animate-fade-in">
              <div className="p-5 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-400" />
                  {isEditing ? '编辑 Provider' : '添加 Provider'}
                </h3>
                <button onClick={() => setShowEditor(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isEditing}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="例如: my-openai"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5" />
                    API 地址 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                    placeholder="https://api.openai.com/v1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    API Key <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey['form'] ? 'text' : 'password'}
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      className="w-full px-4 py-2.5 pr-20 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                      placeholder="sk-..."
                    />
                    <button
                      onClick={() => toggleApiKeyVisibility('form')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-300 rounded transition-colors"
                    >
                      {showApiKey['form'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                      placeholder="gpt-4o"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      API 模式
                    </label>
                    <select
                      value={formData.api_mode}
                      onChange={(e) => setFormData({ ...formData, api_mode: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="">自动检测 / OpenAI 兼容</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="gemini">Gemini</option>
                      <option value="azure">Azure OpenAI</option>
                      <option value="ollama">Ollama</option>
                    </select>
                  </div>
                </div>

                {!isEditing && (
                  <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-300">
                      添加后点击"激活"即可将当前 Hermes 配置切换到此 Provider。Ctrl+C 退出当前 Hermes 对话并重进，即刻生效。
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-5 py-2.5 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
