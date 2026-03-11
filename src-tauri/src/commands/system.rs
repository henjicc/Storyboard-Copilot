use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub os_build: String,
}

fn run_command(program: &str, args: &[&str]) -> Option<String> {
    let output = Command::new(program).args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }

    let text = String::from_utf8(output.stdout).ok()?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

#[cfg(target_os = "windows")]
fn resolve_windows_info() -> RuntimeSystemInfo {
    let ver_text = run_command("cmd", &["/C", "ver"]).unwrap_or_else(|| "Microsoft Windows".to_string());
    let version_token = ver_text
        .split_once('[')
        .and_then(|(_, right)| right.split_once(']'))
        .map(|(inside, _)| inside.trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    let normalized_version = version_token
        .strip_prefix("Version")
        .map(|raw| raw.trim().to_string())
        .unwrap_or(version_token);
    let build = normalized_version
        .split('.')
        .nth(2)
        .unwrap_or("unknown")
        .to_string();

    let product_name = run_command(
        "reg",
        &[
            "query",
            r#"HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion"#,
            "/v",
            "ProductName",
        ],
    )
    .and_then(|raw| {
        raw.lines()
            .find(|line| line.contains("ProductName"))
            .map(|line| line.split_whitespace().last().unwrap_or("Windows").to_string())
    })
    .unwrap_or_else(|| "Windows".to_string());

    RuntimeSystemInfo {
        os_name: product_name,
        os_version: normalized_version,
        os_build: build,
    }
}

#[cfg(target_os = "macos")]
fn resolve_macos_info() -> RuntimeSystemInfo {
    let version = run_command("sw_vers", &["-productVersion"]).unwrap_or_else(|| "unknown".to_string());
    let build = run_command("sw_vers", &["-buildVersion"]).unwrap_or_else(|| "unknown".to_string());

    RuntimeSystemInfo {
        os_name: "macOS".to_string(),
        os_version: version,
        os_build: build,
    }
}

#[cfg(target_os = "linux")]
fn resolve_linux_info() -> RuntimeSystemInfo {
    let mut os_name = "Linux".to_string();
    let mut os_version = "unknown".to_string();

    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        for line in content.lines() {
            if let Some(value) = line.strip_prefix("NAME=") {
                os_name = value.trim_matches('"').to_string();
            } else if let Some(value) = line.strip_prefix("VERSION_ID=") {
                os_version = value.trim_matches('"').to_string();
            }
        }
    }

    let build = run_command("uname", &["-r"]).unwrap_or_else(|| "unknown".to_string());
    RuntimeSystemInfo {
        os_name,
        os_version,
        os_build: build,
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn resolve_generic_info() -> RuntimeSystemInfo {
    RuntimeSystemInfo {
        os_name: std::env::consts::OS.to_string(),
        os_version: "unknown".to_string(),
        os_build: "unknown".to_string(),
    }
}

#[tauri::command]
pub fn get_runtime_system_info() -> RuntimeSystemInfo {
    #[cfg(target_os = "windows")]
    {
        return resolve_windows_info();
    }

    #[cfg(target_os = "macos")]
    {
        return resolve_macos_info();
    }

    #[cfg(target_os = "linux")]
    {
        return resolve_linux_info();
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        resolve_generic_info()
    }
}
