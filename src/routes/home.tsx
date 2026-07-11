import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useRef, useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import env from "@/config/env";
import BuiltWith from "@/features/built-with";
import GithubStarButton from "@/features/github-star-button";

type UpdateStatus =
  | { stage: "idle" }
  | { stage: "checking" }
  | { stage: "no-update" }
  | { stage: "downloading"; downloaded: number; total: number | null }
  | { stage: "ready"; version: string; body: string }
  | { stage: "installing" }
  | { stage: "error"; message: string };

export function HomePage() {
  const [status, setStatus] = useState<UpdateStatus>({ stage: "idle" });
  const updateRef = useRef<Update | null>(null);

  const startUpdate = useCallback(async () => {
    setStatus({ stage: "checking" });

    try {
      const update = await check();
      if (!update) {
        setStatus({ stage: "no-update" });
        return;
      }

      updateRef.current = update;

      let downloaded = 0;
      let total: number | null = null;

      await update.download((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? null;
            setStatus({ downloaded: 0, stage: "downloading", total });
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setStatus({ downloaded, stage: "downloading", total });
            break;
          case "Finished":
            setStatus({
              body: update.body ?? "",
              stage: "ready",
              version: update.version,
            });
            break;
        }
      });
    } catch (e) {
      setStatus({ message: String(e), stage: "error" });
    }
  }, []);

  useEffect(() => {
    startUpdate();
  }, [startUpdate]);

  const handleInstall = async () => {
    setStatus({ stage: "installing" });
    try {
      if (updateRef.current) {
        await updateRef.current.install();
      }
      await relaunch();
    } catch (e) {
      setStatus({ message: String(e), stage: "error" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="flex h-screen">
      <div className="m-auto space-y-3 text-center">
        {/* Update banner */}
        {status.stage === "checking" && (
          <div className="rounded-md bg-muted px-4 py-2 text-muted-foreground text-sm">
            Checking for updates...
          </div>
        )}

        {status.stage === "downloading" && (
          <div className="w-64 rounded-md bg-blue-50 px-4 py-2 text-sm dark:bg-blue-950">
            <p className="font-medium text-blue-700 dark:text-blue-300">
              Downloading update...
            </p>
            <p className="text-blue-600 dark:text-blue-400">
              {formatSize(status.downloaded)}
              {status.total ? ` / ${formatSize(status.total)}` : ""}
            </p>
            {status.total && (
              <div className="mt-1 h-1 w-full rounded-full bg-blue-200 dark:bg-blue-800">
                <div
                  className="h-1 rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.round((status.downloaded / status.total) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {status.stage === "ready" && (
          <div className="w-80 rounded-lg border-2 border-green-400 bg-green-50 px-4 py-3 text-left dark:border-green-600 dark:bg-green-950">
            <p className="font-semibold text-green-800 dark:text-green-200">
              Update Ready
            </p>
            <p className="text-green-700 text-sm dark:text-green-300">
              Version {status.version} downloaded and ready to install.
            </p>
            {status.body && (
              <p className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-green-600 text-xs dark:text-green-400">
                {status.body}
              </p>
            )}
            <Button className="mt-2 w-full" onClick={handleInstall} size="sm">
              Restart to Update
            </Button>
          </div>
        )}

        {status.stage === "installing" && (
          <div className="rounded-md bg-muted px-4 py-2 text-muted-foreground text-sm">
            Installing update, restarting...
          </div>
        )}

        {status.stage === "error" && (
          <div className="rounded-md bg-red-50 px-4 py-2 text-red-700 text-sm dark:bg-red-950 dark:text-red-300">
            Update error: {status.message}
          </div>
        )}

        {status.stage === "no-update" && (
          <div className="rounded-md bg-muted px-4 py-2 text-muted-foreground text-xs">
            You're up to date
          </div>
        )}

        <div className="space-y-3">
          <BuiltWith />
          <h1 className="items-center text-3xl">
            Welcome to Tauri React template!
          </h1>
          <p>
            This template is a starting point for building Tauri apps with Vite,
            React, and Tailwind CSS.
          </p>
          <p>Env variable: {env.API_URL}</p>
          <a
            className="inline-block text-primary underline underline-offset-4 hover:text-primary/80"
            href="/dialog-demo"
          >
            Dialog Plugin Demo
          </a>
          <div>这是 v0.0.7 的内容了, 哈哈哈哈，看看能不能更新了</div>
        </div>
        <GithubStarButton />
        <ModeToggle />
      </div>
    </div>
  );
}

export const Component = HomePage;
