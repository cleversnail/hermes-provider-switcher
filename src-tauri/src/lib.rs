use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub provider: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HermesConfig {
    pub model: ModelConfig,
    #[serde(default)]
    pub custom_providers: Vec<Provider>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderTemplate {
    pub name: String,
    pub display_name: String,
    pub base_url: String,
    pub default_model: String,
    pub description: String,
    pub api_mode: Option<String>,
}

fn get_config_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("无法获取用户主目录")?;
    let hermes_dir = home.join(".hermes");
    if !hermes_dir.exists() {
        fs::create_dir_all(&hermes_dir).map_err(|e| format!("创建 .hermes 目录失败: {}", e))?;
    }
    Ok(hermes_dir.join("config.yaml"))
}

#[tauri::command]
fn load_config() -> Result<HermesConfig, String> {
    let path = get_config_path()?;
    if !path.exists() {
        // 返回默认配置
        return Ok(HermesConfig {
            model: ModelConfig {
                provider: "custom".to_string(),
                base_url: None,
                api_key: None,
                default: None,
                api_mode: None,
            },
            custom_providers: vec![],
        });
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("无法读取配置文件: {}", e))?;
    let config: HermesConfig = serde_yaml::from_str(&content)
        .map_err(|e| format!("配置文件格式错误: {}", e))?;
    Ok(config)
}

#[tauri::command]
fn save_config(config: HermesConfig) -> Result<(), String> {
    let path = get_config_path()?;
    let content = serde_yaml::to_string(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    fs::write(&path, content)
        .map_err(|e| format!("写入配置文件失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn switch_provider(mut config: HermesConfig, provider_name: String) -> Result<HermesConfig, String> {
    let provider = config.custom_providers
        .iter()
        .find(|p| p.name == provider_name)
        .ok_or_else(|| format!("找不到 Provider: {}", provider_name))?
        .clone();

    config.model.provider = "custom".to_string();
    config.model.base_url = Some(provider.base_url.clone());
    config.model.api_key = Some(provider.api_key.clone());
    if let Some(model) = provider.model {
        config.model.default = Some(model);
    } else {
        config.model.default = None;
    }
    if let Some(api_mode) = provider.api_mode {
        config.model.api_mode = Some(api_mode);
    } else {
        config.model.api_mode = None;
    }

    save_config(config.clone())?;
    Ok(config)
}

#[tauri::command]
fn add_provider(mut config: HermesConfig, provider: Provider) -> Result<HermesConfig, String> {
    if config.custom_providers.iter().any(|p| p.name == provider.name) {
        return Err(format!("Provider '{}' 已存在", provider.name));
    }
    config.custom_providers.push(provider);
    save_config(config.clone())?;
    Ok(config)
}

#[tauri::command]
fn update_provider(mut config: HermesConfig, old_name: String, provider: Provider) -> Result<HermesConfig, String> {
    let index = config.custom_providers
        .iter()
        .position(|p| p.name == old_name)
        .ok_or_else(|| format!("找不到 Provider: {}", old_name))?;
    config.custom_providers[index] = provider;
    save_config(config.clone())?;
    Ok(config)
}

#[tauri::command]
fn delete_provider(mut config: HermesConfig, name: String) -> Result<HermesConfig, String> {
    config.custom_providers.retain(|p| p.name != name);
    save_config(config.clone())?;
    Ok(config)
}

#[tauri::command]
fn get_current_provider(config: HermesConfig) -> Option<String> {
    let current_url = config.model.base_url.as_ref()?;
    config.custom_providers
        .iter()
        .find(|p| &p.base_url == current_url)
        .map(|p| p.name.clone())
}

#[tauri::command]
fn get_provider_templates() -> Vec<ProviderTemplate> {
    vec![
        ProviderTemplate {
            name: "openai".to_string(),
            display_name: "OpenAI".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            default_model: "gpt-4o".to_string(),
            description: "OpenAI 官方 API".to_string(),
            api_mode: Some("openai".to_string()),
        },
        ProviderTemplate {
            name: "anthropic".to_string(),
            display_name: "Anthropic".to_string(),
            base_url: "https://api.anthropic.com".to_string(),
            default_model: "claude-sonnet-4".to_string(),
            description: "Anthropic Claude API".to_string(),
            api_mode: Some("anthropic".to_string()),
        },
        ProviderTemplate {
            name: "gemini".to_string(),
            display_name: "Google Gemini".to_string(),
            base_url: "https://generativelanguage.googleapis.com".to_string(),
            default_model: "gemini-2.5-pro".to_string(),
            description: "Google Gemini API".to_string(),
            api_mode: Some("gemini".to_string()),
        },
        ProviderTemplate {
            name: "deepseek".to_string(),
            display_name: "DeepSeek".to_string(),
            base_url: "https://api.deepseek.com".to_string(),
            default_model: "deepseek-chat".to_string(),
            description: "DeepSeek 官方 API".to_string(),
            api_mode: Some("openai".to_string()),
        },
        ProviderTemplate {
            name: "siliconflow".to_string(),
            display_name: "SiliconFlow".to_string(),
            base_url: "https://api.siliconflow.cn/v1".to_string(),
            default_model: "deepseek-ai/DeepSeek-V3".to_string(),
            description: "SiliconFlow 聚合平台".to_string(),
            api_mode: Some("openai".to_string()),
        },
        ProviderTemplate {
            name: "openrouter".to_string(),
            display_name: "OpenRouter".to_string(),
            base_url: "https://openrouter.ai/api/v1".to_string(),
            default_model: "anthropic/claude-sonnet-4".to_string(),
            description: "OpenRouter 统一路由".to_string(),
            api_mode: Some("openai".to_string()),
        },
        ProviderTemplate {
            name: "moonshot".to_string(),
            display_name: "Moonshot AI".to_string(),
            base_url: "https://api.moonshot.cn/v1".to_string(),
            default_model: "moonshot-v1-8k".to_string(),
            description: "月之暗面 Kimi API".to_string(),
            api_mode: Some("openai".to_string()),
        },
        ProviderTemplate {
            name: "zhipu".to_string(),
            display_name: "智谱 AI (GLM)".to_string(),
            base_url: "https://open.bigmodel.cn/api/paas/v4".to_string(),
            default_model: "glm-4-flash".to_string(),
            description: "智谱清言 GLM 系列".to_string(),
            api_mode: Some("openai".to_string()),
        },
        ProviderTemplate {
            name: "qwen".to_string(),
            display_name: "通义千问".to_string(),
            base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1".to_string(),
            default_model: "qwen-max".to_string(),
            description: "阿里云通义千问".to_string(),
            api_mode: Some("openai".to_string()),
        },
        ProviderTemplate {
            name: "baidu".to_string(),
            display_name: "百度千帆".to_string(),
            base_url: "https://qianfan.baidubce.com/v2".to_string(),
            default_model: "ernie-4.0".to_string(),
            description: "百度文心一言".to_string(),
            api_mode: Some("openai".to_string()),
        },
        ProviderTemplate {
            name: "xai".to_string(),
            display_name: "xAI (Grok)".to_string(),
            base_url: "https://api.x.ai/v1".to_string(),
            default_model: "grok-2".to_string(),
            description: "xAI Grok API".to_string(),
            api_mode: Some("openai".to_string()),
        },
        ProviderTemplate {
            name: "azure".to_string(),
            display_name: "Azure OpenAI".to_string(),
            base_url: "https://your-resource.openai.azure.com".to_string(),
            default_model: "gpt-4o".to_string(),
            description: "微软 Azure OpenAI".to_string(),
            api_mode: Some("azure".to_string()),
        },
        ProviderTemplate {
            name: "ollama".to_string(),
            display_name: "Ollama (本地)".to_string(),
            base_url: "http://localhost:11434".to_string(),
            default_model: "llama3.2".to_string(),
            description: "本地 Ollama 部署".to_string(),
            api_mode: Some("ollama".to_string()),
        },
        ProviderTemplate {
            name: "lmstudio".to_string(),
            display_name: "LM Studio".to_string(),
            base_url: "http://localhost:1234/v1".to_string(),
            default_model: "local-model".to_string(),
            description: "LM Studio 本地".to_string(),
            api_mode: Some("openai".to_string()),
        },
    ]
}

#[tauri::command]
async fn test_provider_connection(base_url: String, api_key: String, model: Option<String>, api_mode: Option<String>) -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let mode = api_mode.as_deref().unwrap_or("openai");

    let result = match mode {
        "anthropic" => {
            let url = format!("{}/v1/messages", base_url.trim_end_matches("/"));
            let body = serde_json::json!({
                "model": model.as_deref().unwrap_or("claude-sonnet-4"),
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "hi"}]
            });
            let resp = client.post(&url)
                .header("x-api-key", &api_key)
                .header("anthropic-version", "2023-06-01")
                .json(&body)
                .send()
                .await;
            match resp {
                Ok(r) => r.status().is_success() || r.status().as_u16() == 400,
                Err(e) => return Err(format!("连接失败: {}", e)),
            }
        }
        "gemini" => {
            let url = format!("{}/v1beta/models/{}:generateContent?key={}",
                base_url.trim_end_matches("/"),
                model.as_deref().unwrap_or("gemini-2.5-pro"),
                api_key
            );
            let body = serde_json::json!({
                "contents": [{"parts": [{"text": "hi"}]}]
            });
            let resp = client.post(&url)
                .json(&body)
                .send()
                .await;
            match resp {
                Ok(r) => r.status().is_success() || r.status().as_u16() == 400,
                Err(e) => return Err(format!("连接失败: {}", e)),
            }
        }
        "azure" => {
            let url = format!("{}/openai/deployments/{}/chat/completions?api-version=2024-02-01",
                base_url.trim_end_matches("/"),
                model.as_deref().unwrap_or("gpt-4o")
            );
            let body = serde_json::json!({
                "messages": [{"role": "user", "content": "hi"}],
                "max_tokens": 1
            });
            let resp = client.post(&url)
                .header("api-key", &api_key)
                .json(&body)
                .send()
                .await;
            match resp {
                Ok(r) => r.status().is_success() || r.status().as_u16() == 400,
                Err(e) => return Err(format!("连接失败: {}", e)),
            }
        }
        "ollama" => {
            let url = format!("{}/api/tags", base_url.trim_end_matches("/"));
            let resp = client.get(&url)
                .timeout(std::time::Duration::from_secs(5))
                .send()
                .await;
            match resp {
                Ok(r) => r.status().is_success(),
                Err(e) => return Err(format!("连接失败: {}", e)),
            }
        }
        _ => {
            // openai compatible
            let url = format!("{}/chat/completions", base_url.trim_end_matches("/"));
            let body = serde_json::json!({
                "model": model.as_deref().unwrap_or("gpt-4o"),
                "messages": [{"role": "user", "content": "hi"}],
                "max_tokens": 1
            });
            let resp = client.post(&url)
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&body)
                .send()
                .await;
            match resp {
                Ok(r) => r.status().is_success() || r.status().as_u16() == 400,
                Err(e) => return Err(format!("连接失败: {}", e)),
            }
        }
    };

    Ok(result)
}

#[tauri::command]
fn get_config_file_path() -> Result<String, String> {
    let path = get_config_path()?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn open_config_directory() -> Result<(), String> {
    let path = get_config_path()?;
    let dir = path.parent().ok_or("无法获取配置目录")?;

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(dir)
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(dir)
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(dir)
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            switch_provider,
            add_provider,
            update_provider,
            delete_provider,
            get_current_provider,
            get_provider_templates,
            test_provider_connection,
            get_config_file_path,
            open_config_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
