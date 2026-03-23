const fs = require("fs");
const path = require("path");

class InvalidEnvError extends Error {
  constructor(value) {
    super(`BROWSER_PATH is set but not a valid executable: ${value}`);
    this.name = "InvalidEnvError";
    this.value = value;
  }
}

class NotFoundError extends Error {
  constructor(scanned) {
    super("No supported browser executable found on system");
    this.name = "NotFoundError";
    this.scanned = scanned;
  }
}

class MultipleFoundError extends Error {
  constructor(found) {
    super("Multiple browser executables found");
    this.name = "MultipleFoundError";
    this.found = found;
  }
}

function expandHomeAndEnv(p) {
  if (!p || typeof p !== "string") return p;
  // ~ expansion
  if (p.startsWith("~")) {
    p = path.join(
      process.env.HOME || process.env.USERPROFILE || "",
      p.slice(1),
    );
  }
  // $VAR or ${VAR} expansion
  p = p.replace(/\$\{([^}]+)\}|\$(?:([A-Z0-9_]+))/gi, (_, g1, g2) => {
    const key = g1 || g2;
    return process.env[key] || "";
  });
  // %VAR% Windows style
  p = p.replace(/%([^%]+)%/g, (_, k) => process.env[k] || "");
  return p;
}

function isWindows() {
  return process.platform === "win32";
}

function isWSL() {
  if (process.platform !== "linux") return false;
  try {
    const ver = fs.readFileSync("/proc/version", "utf8").toLowerCase();
    return ver.includes("microsoft") || ver.includes("wsl");
  } catch (e) {
    return !!process.env.WSL_DISTRO_NAME;
  }
}

function isExecutableSync(p) {
  try {
    const st = fs.statSync(p);
    if (st.isDirectory()) return false;
    if (isWindows()) return true;
    // In WSL, Windows .exe files live on /mnt/* and may not have the
    // POSIX execute bit set. Treat .exe files as executable when running
    // under WSL so we can detect Windows browsers from within WSL.
    if (isWSL() && String(p).toLowerCase().endsWith(".exe")) return true;
    // POSIX: check execute bit
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function uniquePaths(arr) {
  const seen = new Map();
  for (const p of arr) {
    try {
      const real = fs.realpathSync(p);
      const key = isWindows() ? real.toLowerCase() : real;
      if (!seen.has(key)) seen.set(key, real);
    } catch (e) {
      // skip if realpath fails
      const key = isWindows() ? p.toLowerCase() : p;
      if (!seen.has(key)) seen.set(key, p);
    }
  }
  return Array.from(seen.values());
}

function scanPathForNames(names) {
  const found = [];
  const PATH = process.env.PATH || "";
  const parts = PATH.split(path.delimiter).filter(Boolean);
  for (const dir of parts) {
    for (const name of names) {
      const p = path.join(dir, name);
      if (isExecutableSync(p)) found.push(p);
    }
  }
  return found;
}

function checkAbsolutePaths(list) {
  const found = [];
  for (const p0 of list) {
    const p = expandHomeAndEnv(p0);
    try {
      if (isExecutableSync(p)) found.push(p);
    } catch (e) {}
  }
  return found;
}

function scanMacApps(appNames) {
  const candidates = [];
  const appDirs = [
    "/Applications",
    path.join(process.env.HOME || "", "Applications"),
  ];
  for (const appDir of appDirs) {
    for (const appName of appNames) {
      const appPath = path.join(appDir, appName);
      const macosDir = path.join(appPath, "Contents", "MacOS");
      try {
        if (!fs.existsSync(macosDir)) continue;
        const files = fs.readdirSync(macosDir);
        for (const f of files) {
          const p = path.join(macosDir, f);
          if (isExecutableSync(p)) {
            candidates.push(p);
          }
        }
      } catch (e) {
        continue;
      }
    }
  }
  return candidates;
}

function checkWslWindowsPaths() {
  const found = [];
  const mnt = "/mnt";
  try {
    const mounts = fs.readdirSync(mnt).map((n) => path.join(mnt, n)).filter((p) => {
      try {
        return fs.statSync(p).isDirectory();
      } catch (e) {
        return false;
      }
    });

    for (const mountPoint of mounts) {
      const usersDir = path.join(mountPoint, "Users");
      if (fs.existsSync(usersDir)) {
        try {
          const users = fs.readdirSync(usersDir).filter((u) => {
            try {
              return fs.statSync(path.join(usersDir, u)).isDirectory();
            } catch (e) {
              return false;
            }
          });
          for (const user of users) {
            found.push(
              path.join(
                usersDir,
                user,
                "AppData",
                "Local",
                "Google",
                "Chrome",
                "Application",
                "chrome.exe",
              ),
            );
            found.push(
              path.join(
                usersDir,
                user,
                "AppData",
                "Local",
                "Programs",
                "Google",
                "Chrome",
                "Application",
                "chrome.exe",
              ),
            );
            found.push(
              path.join(
                usersDir,
                user,
                "AppData",
                "Local",
                "Microsoft",
                "Edge",
                "Application",
                "msedge.exe",
              ),
            );
            found.push(
              path.join(
                usersDir,
                user,
                "AppData",
                "Local",
                "Programs",
                "Microsoft",
                "Edge",
                "Application",
                "msedge.exe",
              ),
            );
            found.push(
              path.join(
                usersDir,
                user,
                "AppData",
                "Local",
                "BraveSoftware",
                "Brave-Browser",
                "Application",
                "brave.exe",
              ),
            );
          }
        } catch (e) {}
      }

      const programs = [
        path.join(mountPoint, "Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(mountPoint, "Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(mountPoint, "Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
        path.join(mountPoint, "Program Files", "Google", "Chrome", "Application", "chrome.exe"),
        path.join(mountPoint, "Program Files", "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
        path.join(mountPoint, "Program Files (x86)", "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
        path.join(mountPoint, "Program Files", "Mozilla Firefox", "firefox.exe"),
        path.join(mountPoint, "Program Files (x86)", "Mozilla Firefox", "firefox.exe"),
      ];

      for (const p of programs) found.push(p);
    }
  } catch (e) {}
  return found;
}

async function findBrowser(opts = {}) {
  const platform = opts.platform || process.platform;

  // 1) BROWSER_PATH override
  const envPathRaw = process.env.BROWSER_PATH;
  if (envPathRaw) {
    const envPath = expandHomeAndEnv(envPathRaw);
    if (isExecutableSync(envPath)) return path.resolve(envPath);
    throw new InvalidEnvError(envPathRaw);
  }

  const candidateNames = [
    "google-chrome-stable",
    "google-chrome",
    "chrome",
    "chrome.exe",
    "chromium",
    "chromium-browser",
    "brave-browser",
    "brave",
    "brave.exe",
    "microsoft-edge",
    "msedge",
    "msedge.exe",
    "firefox",
    "firefox.exe",
    "opera",
    "opera.exe",
  ];

  let candidates = [];

  // PATH scan
  candidates = candidates.concat(scanPathForNames(candidateNames));

  // Platform-specific absolute paths
  if (platform === "linux") {
    const linuxPaths = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/opt/google/chrome/chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
      "/usr/bin/brave-browser",
      "/usr/bin/brave",
      "/usr/bin/microsoft-edge",
      "/usr/bin/microsoft-edge-stable",
      "/usr/bin/firefox",
      "/usr/local/bin",
      "~/.local/bin",
      "/var/lib/flatpak/exports/bin",
    ];
    candidates = candidates.concat(checkAbsolutePaths(linuxPaths));
    if (isWSL()) {
      // also probe common Windows browser locations mounted under /mnt/* in WSL
      candidates = candidates.concat(checkAbsolutePaths(checkWslWindowsPaths()));
    }
  } else if (platform === "darwin") {
    const macAppNames = [
      "Google Chrome.app",
      "Chromium.app",
      "Brave Browser.app",
      "Microsoft Edge.app",
      "Firefox.app",
      "Safari.app",
    ];
    const macPaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Firefox.app/Contents/MacOS/firefox",
      "/Applications/Safari.app/Contents/MacOS/Safari",
      path.join(
        process.env.HOME || "",
        "Applications",
        "Google Chrome.app",
        "Contents",
        "MacOS",
        "Google Chrome",
      ),
    ];
    candidates = candidates.concat(checkAbsolutePaths(macPaths));
    candidates = candidates.concat(scanMacApps(macAppNames));
  } else if (platform === "win32") {
    const pf = process.env.PROGRAMFILES || "C:\\Program Files";
    const pf86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const local =
      process.env.LOCALAPPDATA ||
      path.join(process.env.USERPROFILE || "", "AppData", "Local");
    const winPaths = [
      path.join(local, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(pf, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(pf, "Chromium", "chrome.exe"),
      path.join(local, "Chromium", "chrome.exe"),
      path.join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(
        pf,
        "BraveSoftware",
        "Brave-Browser",
        "Application",
        "brave.exe",
      ),
      path.join(pf, "Mozilla Firefox", "firefox.exe"),
    ];
    candidates = candidates.concat(checkAbsolutePaths(winPaths));
  }

  // normalize and dedupe
  const uniq = uniquePaths(candidates);
  const validated = uniq.filter((p) => isExecutableSync(p));

  if (validated.length === 0) {
    throw new NotFoundError(candidateNames);
  }

  if (validated.length > 1) {
    throw new MultipleFoundError(validated);
  }

  return path.resolve(validated[0]);
}

// Return all validated browser paths (may be empty)
function listBrowsers(opts = {}) {
  const platform = opts.platform || process.platform;
  const candidateNames = [
    "google-chrome-stable",
    "google-chrome",
    "chrome",
    "chrome.exe",
    "chromium",
    "chromium-browser",
    "brave-browser",
    "brave",
    "brave.exe",
    "microsoft-edge",
    "msedge",
    "msedge.exe",
    "firefox",
    "firefox.exe",
    "opera",
    "opera.exe",
  ];

  const candidates = [];

  // include BROWSER_PATH if set and valid
  const envPathRaw = process.env.BROWSER_PATH;
  if (envPathRaw) {
    const envPath = expandHomeAndEnv(envPathRaw);
    if (isExecutableSync(envPath)) candidates.push(path.resolve(envPath));
  }

  candidates.push(...scanPathForNames(candidateNames));

  if (platform === "linux") {
    const linuxPaths = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/opt/google/chrome/chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
      "/usr/bin/brave-browser",
      "/usr/bin/brave",
      "/usr/bin/microsoft-edge",
      "/usr/bin/microsoft-edge-stable",
      "/usr/bin/firefox",
      "/usr/local/bin",
      "~/.local/bin",
      "/var/lib/flatpak/exports/bin",
    ];
    candidates.push(...checkAbsolutePaths(linuxPaths));
    if (isWSL()) {
      candidates.push(...checkAbsolutePaths(checkWslWindowsPaths()));
    }
  } else if (platform === "darwin") {
    const macAppNames = [
      "Google Chrome.app",
      "Chromium.app",
      "Brave Browser.app",
      "Microsoft Edge.app",
      "Firefox.app",
      "Safari.app",
    ];
    const macPaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Firefox.app/Contents/MacOS/firefox",
      "/Applications/Safari.app/Contents/MacOS/Safari",
      path.join(
        process.env.HOME || "",
        "Applications",
        "Google Chrome.app",
        "Contents",
        "MacOS",
        "Google Chrome",
      ),
    ];
    candidates.push(...checkAbsolutePaths(macPaths));
    candidates.push(...scanMacApps(macAppNames));
  } else if (platform === "win32") {
    const pf = process.env.PROGRAMFILES || "C:\\Program Files";
    const pf86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const local =
      process.env.LOCALAPPDATA ||
      path.join(process.env.USERPROFILE || "", "AppData", "Local");
    const winPaths = [
      path.join(local, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(pf, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(pf, "Chromium", "chrome.exe"),
      path.join(local, "Chromium", "chrome.exe"),
      path.join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(
        pf,
        "BraveSoftware",
        "Brave-Browser",
        "Application",
        "brave.exe",
      ),
      path.join(pf, "Mozilla Firefox", "firefox.exe"),
    ];
    candidates.push(...checkAbsolutePaths(winPaths));
  }

  const uniq = uniquePaths(candidates);
  return uniq.filter((p) => isExecutableSync(p));
}

module.exports = {
  findBrowser,
  InvalidEnvError,
  NotFoundError,
  MultipleFoundError,
  listBrowsers,
};
