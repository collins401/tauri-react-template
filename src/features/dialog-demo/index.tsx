import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  clear,
  readText,
  writeText,
} from "@tauri-apps/plugin-clipboard-manager";
import { ask, confirm, message, open, save } from "@tauri-apps/plugin-dialog";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  debug,
  info,
  error as logError,
  trace,
  warn,
} from "@tauri-apps/plugin-log";
import {
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import {
  arch,
  eol,
  exeExtension,
  family,
  hostname,
  locale,
  type as osType,
  platform,
  version,
} from "@tauri-apps/plugin-os";
import { relaunch } from "@tauri-apps/plugin-process";
import Database from "@tauri-apps/plugin-sql";
import { load as loadStore } from "@tauri-apps/plugin-store";
import { check } from "@tauri-apps/plugin-updater";
import { download, upload } from "@tauri-apps/plugin-upload";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  type: "info" | "success" | "error";
  message: string;
  timestamp: number;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function DialogDemoPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [{ message, timestamp: Date.now(), type }, ...prev]);
  };

  const handleOpenSingleFile = async () => {
    try {
      const result = await open({
        filters: [
          { extensions: ["*"], name: "All Files" },
          { extensions: ["png", "jpg", "jpeg", "gif", "webp"], name: "Images" },
          { extensions: ["txt", "md", "json"], name: "Text" },
        ],
        multiple: false,
        title: "Select a file",
      });
      if (result) {
        addLog("success", `File selected: ${result}`);
      } else {
        addLog("info", "File selection cancelled");
      }
    } catch (e) {
      addLog("error", `Error: ${e}`);
    }
  };

  const handleOpenMultipleFiles = async () => {
    try {
      const result = await open({
        filters: [
          { extensions: ["png", "jpg", "jpeg", "gif", "webp"], name: "Images" },
        ],
        multiple: true,
        title: "Select files",
      });
      if (result) {
        const files = Array.isArray(result) ? result : [result];
        addLog(
          "success",
          `${files.length} file(s) selected:\n${files.join("\n")}`
        );
      } else {
        addLog("info", "File selection cancelled");
      }
    } catch (e) {
      addLog("error", `Error: ${e}`);
    }
  };

  const handleOpenDirectory = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: "Select a directory",
      });
      if (result) {
        addLog("success", `Directory selected: ${result}`);
      } else {
        addLog("info", "Directory selection cancelled");
      }
    } catch (e) {
      addLog("error", `Error: ${e}`);
    }
  };

  const handleSaveFile = async () => {
    try {
      const result = await save({
        defaultPath: "untitled.txt",
        filters: [
          { extensions: ["txt"], name: "Text" },
          { extensions: ["json"], name: "JSON" },
          { extensions: ["*"], name: "All Files" },
        ],
        title: "Save file",
      });
      if (result) {
        addLog("success", `Save path: ${result}`);
      } else {
        addLog("info", "Save cancelled");
      }
    } catch (e) {
      addLog("error", `Error: ${e}`);
    }
  };

  const handleMessage = async (kind: "info" | "warning" | "error") => {
    try {
      await message(`This is a ${kind} message dialog.`, {
        kind,
        title: kind.charAt(0).toUpperCase() + kind.slice(1),
      });
      addLog("success", `${kind} message dialog shown`);
    } catch (e) {
      addLog("error", `Error: ${e}`);
    }
  };

  const handleMessageWithButtons = async () => {
    try {
      const result = await message("Choose an option:", {
        buttons: { cancel: "Cancel", no: "Reject", yes: "Accept" },
        title: "Custom Buttons",
      });
      addLog("info", `User clicked: ${result}`);
    } catch (e) {
      addLog("error", `Error: ${e}`);
    }
  };

  const handleAsk = async () => {
    try {
      const yes = await ask("Are you sure you want to proceed?", {
        kind: "warning",
        title: "Confirmation",
      });
      addLog("info", `User responded: ${yes ? "Yes" : "No"}`);
    } catch (e) {
      addLog("error", `Error: ${e}`);
    }
  };

  const handleConfirm = async () => {
    try {
      const ok = await confirm("Do you want to save changes?", {
        kind: "info",
        title: "Save Changes",
      });
      addLog("info", `User responded: ${ok ? "Ok" : "Cancel"}`);
    } catch (e) {
      addLog("error", `Error: ${e}`);
    }
  };

  const [uploadUrl, setUploadUrl] = useState("https://httpbin.org/post");
  const [downloadUrl, setDownloadUrl] = useState(
    "https://httpbin.org/image/jpeg"
  );
  const [downloadPath, setDownloadPath] = useState("");

  const handlePickFileToUpload = async () => {
    try {
      const filePath = await open({
        filters: [{ extensions: ["*"], name: "All Files" }],
        multiple: false,
        title: "Select a file to upload",
      });
      if (!filePath) {
        addLog("info", "No file selected for upload");
        return;
      }
      addLog("info", `Uploading ${filePath} to ${uploadUrl}...`);
      const response = await upload(uploadUrl, filePath as string);
      addLog("success", `Upload complete. Response: ${response.slice(0, 200)}`);
    } catch (e) {
      addLog("error", `Upload error: ${e}`);
    }
  };

  const handlePickDownloadDest = async () => {
    const dir = await open({
      directory: true,
      multiple: false,
      title: "Select download destination",
    });
    if (dir) {
      setDownloadPath(`${dir}/download`);
      addLog("info", `Download destination: ${dir}`);
    }
  };

  const handleDownload = async () => {
    try {
      if (!downloadPath) {
        addLog("error", "Select a download destination first");
        return;
      }
      addLog("info", `Downloading ${downloadUrl} to ${downloadPath}...`);
      await download(downloadUrl, downloadPath, (progress) => {
        addLog(
          "info",
          `Download progress: ${Math.round((progress.progress / progress.progressTotal) * 100)}% (${(progress.transferSpeed / 1024).toFixed(1)} KB/s)`
        );
      });
      addLog("success", `Download complete: ${downloadPath}`);
    } catch (e) {
      addLog("error", `Download error: ${e}`);
    }
  };

  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateBody, setUpdateBody] = useState("");
  const [checking, setChecking] = useState(false);

  const handleCheckUpdate = async () => {
    setChecking(true);
    try {
      const update = await check();
      if (update) {
        setUpdateVersion(update.version);
        setUpdateBody(update.body ?? "");
        addLog(
          "success",
          `Update available: v${update.version} (current: v${update.currentVersion})`
        );
      } else {
        setUpdateVersion(null);
        setUpdateBody("");
        addLog("info", "No update available");
      }
    } catch (e) {
      addLog("error", `Update check error: ${e}`);
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadAndInstall = async () => {
    try {
      const update = await check();
      if (!update) {
        addLog("info", "No update available");
        return;
      }
      addLog("info", `Downloading update v${update.version}...`);
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          const size = event.data.contentLength
            ? `${(event.data.contentLength / 1024 / 1024).toFixed(1)} MB`
            : "unknown size";
          addLog("info", `Download started (${size})`);
        } else if (event.event === "Progress") {
          addLog(
            "info",
            `Download progress: ${(event.data.chunkLength / 1024).toFixed(1)} KB received`
          );
        } else if (event.event === "Finished") {
          addLog("success", "Download finished, installing...");
        }
      });
      addLog("success", "Update installed. Restart to apply.");
      await relaunch();
    } catch (e) {
      addLog("error", `Update error: ${e}`);
    }
  };

  const [osInfo, setOsInfo] = useState<Record<string, string> | null>(null);

  const handleLoadOsInfo = async () => {
    const info: Record<string, string> = {
      arch: arch(),
      eol: JSON.stringify(eol()),
      exeExtension: exeExtension() || "(none)",
      family: family(),
      platform: platform(),
      type: osType(),
      version: version(),
    };
    const loc = await locale();
    if (loc) {
      info.locale = loc;
    }
    const host = await hostname();
    if (host) {
      info.hostname = host;
    }
    setOsInfo(info);
    addLog("success", "OS info loaded");
  };

  const [storeKey, setStoreKey] = useState("");
  const [storeValue, setStoreValue] = useState("");
  const [storeEntries, setStoreEntries] = useState<[string, unknown][]>([]);
  const storeRef = useRef<Awaited<ReturnType<typeof loadStore>> | null>(null);

  const getOrInitStore = useCallback(async () => {
    if (!storeRef.current) {
      storeRef.current = await loadStore("demo.json", {
        autoSave: 100,
        defaults: {},
      });
    }
    return storeRef.current;
  }, []);

  const handleStoreSet = async () => {
    if (!storeKey) {
      return;
    }
    const store = await getOrInitStore();
    await store.set(storeKey, storeValue);
    addLog("success", `Store set: ${storeKey} = ${storeValue}`);
    setStoreKey("");
    setStoreValue("");
    handleStoreList();
  };

  const handleStoreGet = async () => {
    if (!storeKey) {
      return;
    }
    const store = await getOrInitStore();
    const val = await store.get(storeKey);
    addLog("info", `Store get: ${storeKey} = ${JSON.stringify(val)}`);
  };

  const handleStoreDelete = async () => {
    if (!storeKey) {
      return;
    }
    const store = await getOrInitStore();
    await store.delete(storeKey);
    addLog("success", `Store delete: ${storeKey}`);
    handleStoreList();
  };

  const handleStoreClear = async () => {
    const store = await getOrInitStore();
    await store.clear();
    addLog("success", "Store cleared");
    handleStoreList();
  };

  const handleStoreList = async () => {
    const store = await getOrInitStore();
    const entries = await store.entries();
    setStoreEntries(entries);
  };

  const handleSendLocalNotification = async () => {
    await requestPermission();
    // macOS needs a brief moment after permission grant before sending
    await new Promise((r) => setTimeout(r, 200));
    sendNotification({
      body: "This is a local notification!",
      title: "Tauri Demo",
    });
    addLog("success", "Local notification sent");
  };

  const handleCheckServerNotification = async () => {
    try {
      const res = await fetch("https://tauri-updater.deepsky.top/api/notify");
      const data = await res.json();
      if (data.hasNotification) {
        await requestPermission();
        await new Promise((r) => setTimeout(r, 200));
        sendNotification({ body: data.body, title: data.title });
        addLog("success", `Server notification: ${data.title} — ${data.body}`);
      } else {
        addLog("info", "No server notifications");
      }
    } catch (e) {
      addLog("error", `Notification check error: ${e}`);
    }
  };

  const [httpUrl, setHttpUrl] = useState("https://httpbin.org/json");
  const [httpResponse, setHttpResponse] = useState("");

  const handleHttpFetch = async () => {
    try {
      addLog("info", `Fetching: ${httpUrl}`);
      const res = await tauriFetch(httpUrl);
      const text = await res.text();
      setHttpResponse(text.slice(0, 500));
      addLog("success", `HTTP ${res.status}: ${text.length} bytes`);
    } catch (e) {
      addLog("error", `HTTP fetch error: ${e}`);
    }
  };

  // ── Clipboard ─────────────────────────────────────────────────

  const [clipboardText, setClipboardText] = useState("");

  const handleClipboardWrite = async () => {
    await writeText(clipboardText || "Hello from Tauri!");
    addLog("success", "Text written to clipboard");
  };

  const handleClipboardRead = async () => {
    const text = await readText();
    setClipboardText(text);
    addLog("success", `Clipboard read: ${text.slice(0, 50)}`);
  };

  const handleClipboardClear = async () => {
    await clear();
    addLog("success", "Clipboard cleared");
  };

  // ── Log ───────────────────────────────────────────────────────

  const handleLogTest = async () => {
    await trace("This is a TRACE log");
    await debug("This is a DEBUG log");
    await info("This is an INFO log");
    await warn("This is a WARN log");
    await logError("This is an ERROR log");
    addLog("success", "Log entries written to file + stdout");
  };

  // ── Global Shortcut ──────────────────────────────────────────

  const [shortcutActive, setShortcutActive] = useState(false);

  const handleRegisterShortcut = async () => {
    await register("CmdOrCtrl+Shift+G", (event) => {
      if (event.state === "Pressed") {
        addLog("info", `Global shortcut triggered: ${event.shortcut}`);
      }
    });
    setShortcutActive(true);
    addLog("success", "Global shortcut CmdOrCtrl+Shift+G registered");
  };

  const handleUnregisterShortcut = async () => {
    await unregisterAll();
    setShortcutActive(false);
    addLog("info", "All global shortcuts unregistered");
  };

  // ── SQL ──────────────────────────────────────────────────────

  const [sqlResult, setSqlResult] = useState("");
  const dbRef = useRef<Database | null>(null);

  const getOrInitDb = async () => {
    if (!dbRef.current) {
      dbRef.current = await Database.load("sqlite:demo.db");
      await dbRef.current.execute(
        "CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, done INTEGER DEFAULT 0)"
      );
    }
    return dbRef.current;
  };

  const handleSqlInsert = async () => {
    const db = await getOrInitDb();
    await db.execute("INSERT INTO todos (title) VALUES ($1)", [
      `Task ${Date.now() % 1000}`,
    ]);
    addLog("success", "SQL row inserted");
    handleSqlQuery();
  };

  const handleSqlQuery = async () => {
    const db = await getOrInitDb();
    const rows = await db.select<{ id: number; title: string; done: number }[]>(
      "SELECT * FROM todos ORDER BY id DESC LIMIT 5"
    );
    setSqlResult(JSON.stringify(rows, null, 2));
    addLog("info", `SQL query: ${rows.length} rows`);
  };

  const handleSqlClear = async () => {
    const db = await getOrInitDb();
    await db.execute("DELETE FROM todos");
    setSqlResult("");
    addLog("success", "SQL table cleared");
  };

  // ── Drag & Drop ──────────────────────────────────────────────

  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);

  useEffect(() => {
    const unlisten = getCurrentWebviewWindow().onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        // Visual feedback can be added here
      } else if (event.payload.type === "drop") {
        const { paths } = event.payload;
        setDroppedFiles(paths);
        addLog(
          "success",
          `${paths.length} file(s) dropped:\n${paths.join("\n")}`
        );
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div className="h-screen overflow-auto p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-bold text-2xl">Tauri Plugins Demo</h1>
          <p className="text-muted-foreground text-xs">
            dialog · upload · updater · os · store · notification · http ·
            clipboard · log · shortcut · sql
          </p>
        </div>

        <Section title="File Dialogs">
          <Button onClick={handleOpenSingleFile}>Open Single File</Button>
          <Button onClick={handleOpenMultipleFiles} variant="secondary">
            Open Multiple Files
          </Button>
          <Button onClick={handleOpenDirectory} variant="secondary">
            Open Directory
          </Button>
          <Button onClick={handleSaveFile} variant="outline">
            Save File
          </Button>
        </Section>

        <Section title="Message Dialogs">
          <Button onClick={() => handleMessage("info")}>Info Message</Button>
          <Button onClick={() => handleMessage("warning")} variant="secondary">
            Warning Message
          </Button>
          <Button onClick={() => handleMessage("error")} variant="destructive">
            Error Message
          </Button>
          <Button onClick={handleMessageWithButtons} variant="outline">
            Custom Buttons
          </Button>
        </Section>

        <Section title="Question Dialogs">
          <Button onClick={handleAsk}>Ask (Yes/No)</Button>
          <Button onClick={handleConfirm} variant="secondary">
            Confirm (Ok/Cancel)
          </Button>
        </Section>

        <Section title="Upload / Download">
          <div className="flex w-full flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <label className="mb-1 block text-muted-foreground text-xs">
                Upload URL
              </label>
              <input
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                onChange={(e) => setUploadUrl(e.target.value)}
                value={uploadUrl}
              />
            </div>
            <Button onClick={handlePickFileToUpload}>Pick File & Upload</Button>
          </div>
          <div className="flex w-full flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <label className="mb-1 block text-muted-foreground text-xs">
                Download URL
              </label>
              <input
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                onChange={(e) => setDownloadUrl(e.target.value)}
                value={downloadUrl}
              />
            </div>
            <Button onClick={handlePickDownloadDest} variant="secondary">
              Choose Dest
            </Button>
            <Button onClick={handleDownload} variant="outline">
              Download
            </Button>
          </div>
          {downloadPath && (
            <p className="text-muted-foreground text-xs">
              Dest: {downloadPath}
            </p>
          )}
        </Section>

        <Section title="Updater (Auto Update)">
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={checking} onClick={handleCheckUpdate}>
              {checking ? "Checking..." : "Check for Updates"}
            </Button>
            {updateVersion && (
              <Button onClick={handleDownloadAndInstall} variant="secondary">
                Download & Install v{updateVersion}
              </Button>
            )}
          </div>
          {updateBody && (
            <div className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-xs">
              {updateBody}
            </div>
          )}
        </Section>

        <Section title="OS Info">
          <Button onClick={handleLoadOsInfo}>Load OS Info</Button>
          {osInfo && (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border bg-muted/30 p-3 font-mono text-xs">
              {Object.entries(osInfo).map(([key, value]) => (
                <div className="contents" key={key}>
                  <span className="text-muted-foreground">{key}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Store (Persistent KV Storage)">
          <div className="flex flex-wrap items-end gap-2">
            <input
              className="w-32 rounded-md border bg-background px-3 py-1.5 text-sm"
              onChange={(e) => setStoreKey(e.target.value)}
              placeholder="Key"
              value={storeKey}
            />
            <input
              className="w-40 rounded-md border bg-background px-3 py-1.5 text-sm"
              onChange={(e) => setStoreValue(e.target.value)}
              placeholder="Value"
              value={storeValue}
            />
            <Button onClick={handleStoreSet} size="sm">
              Set
            </Button>
            <Button onClick={handleStoreGet} size="sm" variant="secondary">
              Get
            </Button>
            <Button onClick={handleStoreDelete} size="sm" variant="outline">
              Delete
            </Button>
            <Button onClick={handleStoreClear} size="sm" variant="destructive">
              Clear
            </Button>
            <Button onClick={handleStoreList} size="sm" variant="ghost">
              List All
            </Button>
          </div>
          {storeEntries.length > 0 && (
            <div className="max-h-32 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs">
              {storeEntries.map(([k, v]) => (
                <div key={k}>
                  <span className="text-muted-foreground">{k}</span> ={" "}
                  {JSON.stringify(v)}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Notification">
          <Button onClick={handleSendLocalNotification}>
            Send Local Notification
          </Button>
          <Button onClick={handleCheckServerNotification} variant="secondary">
            Check Server Notification
          </Button>
        </Section>

        <Section title="HTTP (Native Fetch)">
          <div className="flex w-full flex-wrap items-end gap-2">
            <input
              className="min-w-64 flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
              onChange={(e) => setHttpUrl(e.target.value)}
              value={httpUrl}
            />
            <Button onClick={handleHttpFetch}>Fetch</Button>
          </div>
          {httpResponse && (
            <div className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-2 font-mono text-xs">
              {httpResponse}
            </div>
          )}
        </Section>

        <Section title="Clipboard">
          <div className="flex flex-wrap items-end gap-2">
            <input
              className="w-48 rounded-md border bg-background px-3 py-1.5 text-sm"
              onChange={(e) => setClipboardText(e.target.value)}
              placeholder="Text to copy"
              value={clipboardText}
            />
            <Button onClick={handleClipboardWrite} size="sm">
              Write
            </Button>
            <Button onClick={handleClipboardRead} size="sm" variant="secondary">
              Read
            </Button>
            <Button onClick={handleClipboardClear} size="sm" variant="outline">
              Clear
            </Button>
          </div>
        </Section>

        <Section title="Log">
          <Button onClick={handleLogTest}>Write Test Logs</Button>
          <span className="self-center text-muted-foreground text-xs">
            Output: stdout + app data dir
          </span>
        </Section>

        <Section title="Global Shortcut">
          <Button disabled={shortcutActive} onClick={handleRegisterShortcut}>
            Register CmdOrCtrl+Shift+G
          </Button>
          <Button
            disabled={!shortcutActive}
            onClick={handleUnregisterShortcut}
            variant="outline"
          >
            Unregister
          </Button>
          <span className="self-center text-muted-foreground text-xs">
            Press even when app is in background
          </span>
        </Section>

        <Section title="SQL (SQLite)">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSqlInsert} size="sm">
              Insert Task
            </Button>
            <Button onClick={handleSqlQuery} size="sm" variant="secondary">
              Query Todos
            </Button>
            <Button onClick={handleSqlClear} size="sm" variant="outline">
              Clear Table
            </Button>
          </div>
          {sqlResult && (
            <div className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-2 font-mono text-xs">
              {sqlResult}
            </div>
          )}
        </Section>

        <Section title="Drag & Drop">
          <div className="flex h-20 w-full items-center justify-center rounded-md border-2 border-dashed text-muted-foreground text-sm">
            Drop files anywhere on the window
          </div>
          {droppedFiles.length > 0 && (
            <div className="max-h-24 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs">
              {droppedFiles.map((f) => (
                <div key={f}>{f}</div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Event Log">
          <div className="max-h-64 w-full overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">
                No events yet. Click a button above to see results.
              </p>
            ) : (
              <ul className="space-y-1">
                {logs.map((log, i) => (
                  <li
                    className={`whitespace-pre-wrap ${
                      log.type === "success"
                        ? "text-green-600 dark:text-green-400"
                        : log.type === "error"
                          ? "text-red-600 dark:text-red-400"
                          : "text-foreground"
                    }`}
                    key={`${log.timestamp}-${i}`}
                  >
                    <span className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>{" "}
                    {log.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

export const Component = DialogDemoPage;
